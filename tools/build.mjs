// 배포 빌드: 모듈 39개를 한 파일로 묶어 줄이고, CSS 다섯 장을 하나로 합치고, 오프라인용 서비스 워커를 만든다.
// 결과는 dist/ 에 쌓이며 그대로 정적 호스팅(GitHub Pages 등)에 올린다. 저장소 루트의 원본은 빌드 없이도 그대로 돈다.
// 사용법: npm run build   (미리 보기: npm run preview → http://localhost:8000)
import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
// 모바일 사파리 14(iOS 14)·크롬 90 이상을 받친다
const TARGET = ['es2020', 'chrome90', 'safari14', 'firefox90', 'edge90'];
const STATIC = ['fonts', 'icons', 'manifest.webmanifest'];

const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);
const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

await rm(DIST, { recursive: true, force: true });
await mkdir(join(DIST, 'assets'), { recursive: true });

// ── 자바스크립트: app.js에서 시작해 하나로 묶는다 (동적 import도 같은 묶음 안으로)
const js = await build({
  entryPoints: [join(ROOT, 'js/ui/app.js')],
  bundle: true, format: 'esm', minify: true, target: TARGET, legalComments: 'none', charset: 'utf8',
  write: false, outdir: join(DIST, 'assets'),
});
const jsCode = js.outputFiles[0].contents;
const jsName = `assets/app-${hash(jsCode)}.js`;
await writeFile(join(DIST, jsName), jsCode);

// ── CSS: index.html에 걸린 순서 그대로 이어 붙여 줄인다. 글꼴 경로(../fonts/)는 assets/에서도 그대로 맞는다
const srcHtml = await readFile(join(ROOT, 'index.html'), 'utf8');
const sheets = [...srcHtml.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]);
const cssSrc = (await Promise.all(sheets.map(f => readFile(join(ROOT, f), 'utf8')))).join('\n');
const css = await transform(cssSrc, { loader: 'css', minify: true, target: TARGET, charset: 'utf8' });
const cssName = `assets/style-${hash(css.code)}.css`;
await writeFile(join(DIST, cssName), css.code);

for (const f of STATIC) await cp(join(ROOT, f), join(DIST, f), { recursive: true });

// ── 판본: 산출물 전체의 지문. 바뀌면 서비스 워커가 새 판본으로 알아차린다
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}
const files = (await walk(DIST)).map(p => relative(DIST, p).split(sep).join('/')).sort();
const finger = createHash('sha256');
for (const f of files) finger.update(f).update(await readFile(join(DIST, f)));
const today = new Date().toISOString().slice(0, 10).replaceAll('-', '.');
const tag = finger.digest('hex').slice(0, 6);
const version = `${today}·${tag}`;

// ── index.html: 스타일 다섯 줄을 한 줄로, 모듈 진입점을 묶음으로, 빌드 표식(서비스 워커 켜기)을 심는다
let html = srcHtml;
html = html.replace(/\s*<link rel="stylesheet" href="[^"]+">/g, '');
html = html.replace('</title>', `</title>\n  <meta name="brass-build" content="${version}">\n  <link rel="stylesheet" href="${cssName}">`);
html = html.replace('<script type="module" src="js/ui/app.js"></script>', `<script type="module" src="${jsName}"></script>`);
if (!html.includes(jsName) || !html.includes(cssName)) throw new Error('index.html 치환 실패: 진입점이나 스타일 줄 모양이 바뀌었다');
await writeFile(join(DIST, 'index.html'), html);

// ── 서비스 워커: 판본마다 캐시 하나. 첫 방문 때 전부 받아 두고 이후엔 캐시에서 연다(오프라인 플레이)
// 큰 설치용 아이콘(512·maskable·iOS)은 운영체제가 설치할 때 따로 받으므로 오프라인 캐시에서 뺀다
const SKIP = /^icons\/(icon-512|maskable-|apple-touch)/;
const precache = ['./', ...files.filter(f => f !== 'index.html' && !SKIP.test(f)), 'index.html'];
const sw = `// 황동의 생애 서비스 워커 · 판본 ${version} (tools/build.mjs가 만든다)
const CACHE = 'brass-life-${tag}';
const ASSETS = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => {
  // 지문 붙은 묶음·글꼴·아이콘은 방금 페이지가 받은 HTTP 캐시를 그대로 쓰고(첫 방문에 두 번 받지 않게),
  // 이름이 고정된 문서·매니페스트만 서버에 다시 확인한다
  const fresh = (u) => u === './' || u.endsWith('.html') || u.endsWith('.webmanifest');
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: fresh(u) ? 'no-cache' : 'default' })))).then(rescueOtherGame));
});
self.addEventListener('activate', (e) => {
  const done = caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('brass-life-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim());
  e.waitUntil(done);
  // 교대가 끝난 뒤에 다시 연다(교대 중에 열면 그 화면 요청이 교대를 기다리며 멈춘다)
  done.then(() => setTimeout(reopenOtherGame, 100));
});
// 예전 판본의 서비스 워커는 같은 사이트의 다른 게임(name-remains/, kivotos/) 화면까지 이 게임으로 열었다.
// 그런 탭이 있으면 기다리지 않고 바로 교대한 뒤, 그 탭을 원래 주소로 다시 연다.
const OTHERS = ['/name-remains/', '/kivotos/'];
const isOther = (url) => OTHERS.some((p) => new URL(url).pathname.includes(p));
const otherTabs = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => cs.filter((c) => isOther(c.url)));
const rescueOtherGame = () => otherTabs().then((cs) => { if (cs.length) return self.skipWaiting(); });
const reopenOtherGame = () => otherTabs().then((cs) => Promise.all(cs.map((c) => c.navigate(c.url).catch(() => {}))));
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // 같은 사이트의 다른 게임(name-remains/, kivotos/)은 이 서비스 워커가 건드리지 않는다
  if (isOther(req.url)) return;
  // 화면 요청(?seed= 같은 주소 포함)은 언제나 이 판본의 index.html로 연다
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then((c) => c.match('index.html')).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((r) => r || fetch(req)));
});
`;
await writeFile(join(DIST, 'sw.js'), sw);
await writeFile(join(DIST, '.nojekyll'), '');

let total = 0;
for (const f of [...files, 'sw.js']) total += (await stat(join(DIST, f))).size;
const srcJs = (await walk(join(ROOT, 'js'))).length;
console.log(`판본 ${version}`);
console.log(`  ${jsName}  ${kb(jsCode.length)}  (모듈 ${srcJs}개 → 1개)`);
console.log(`  ${cssName}  ${kb(css.code.length)}  (스타일 ${sheets.length}장 → 1장)`);
console.log(`  서비스 워커 사전 캐시 ${precache.length}개 · dist 전체 ${kb(total)}`);
