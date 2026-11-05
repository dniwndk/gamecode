// 소스 파일을 하나의 HTML로 묶어요: node build.mjs → index.html
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const order = ['core.js', 'data.js', 'combat.js', 'enemies.js', 'run.js', 'render3d.js', 'main.js'];
const js = order.map(f => `// ===== ${f} =====\n` + readFileSync(join(dir, 'src', f), 'utf8').replace(/^'use strict';\n/, '')).join('\n');
const three = readFileSync(join(dir, 'vendor', 'three.min.js'), 'utf8').replace(/^console\.warn\(/, '!1&&console.warn(');
const tpl = readFileSync(join(dir, 'src', 'template.html'), 'utf8').replace('/*__THREE__*/', () => three);
writeFileSync(join(dir, 'index.html'), tpl.replace('/*__SCRIPTS__*/', "'use strict';\n" + js));
const html = tpl.replace('/*__SCRIPTS__*/', "'use strict';\n" + js);
const art = html.replace(/<!doctype html>\n|<html lang="ko">\n|<head>\n|<\/head>\n|<body>\n|<\/body>\n|<\/html>\n?|<meta charset="utf-8">\n|<meta name="viewport"[^>]*>\n/g, '');
writeFileSync(join(dir, 'artifact.html'), art);
console.log('built index.html + artifact.html', (js.length / 1024).toFixed(1) + 'KB');
