// GLSL ES 3.00 셰이더 모음. 좌표 약속: 픽셀 좌표는 화면 왼쪽 위가 원점(y 아래로 증가), uK = 설계 1px당 캔버스 픽셀.

const HEAD = '#version 300 es\nprecision highp float;\n';

const COMMON = `
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }
// 박막 간섭 근사: 두께(t)에 따라 파장별 위상이 달라지는 무지개빛
vec3 film(float t){ return .5+.5*cos(6.28318*(t*vec3(1.0, 1.18, 1.42) + vec3(0., .12, .24))); }
float sdRoundBox(vec2 p, vec2 b, float r){ vec2 q = abs(p)-b+r; return length(max(q,0.)) + min(max(q.x,q.y),0.) - r; }
`;

export const FULL_VS = `${HEAD}
layout(location=0) in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*.5+.5; gl_Position = vec4(aPos, 0., 1.); }`;

// ── 유체(안정 유체: 이류 → 와도 보강 → 발산 → 자코비 압력 → 기울기 빼기) ──
export const SPLAT_FS = `${HEAD}
in vec2 vUv; out vec4 o;
uniform sampler2D uTarget; uniform float uAspect; uniform vec3 uColor; uniform vec2 uPoint; uniform float uRadius;
void main(){ vec2 p = vUv-uPoint; p.x *= uAspect; o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p,p)/uRadius)*uColor, 1.); }`;

export const ADVECT_FS = `${HEAD}
in vec2 vUv; out vec4 o;
uniform sampler2D uVel, uSrc; uniform vec2 uTexel; uniform float uDt, uDiss;
void main(){ vec2 c = vUv - uDt*texture(uVel, vUv).xy*uTexel; o = texture(uSrc, c)/(1.+uDiss*uDt); }`;

export const CURL_FS = `${HEAD}
in vec2 vUv; out vec4 o; uniform sampler2D uVel; uniform vec2 uTexel;
void main(){
  float L = texture(uVel, vUv-vec2(uTexel.x,0)).y, R = texture(uVel, vUv+vec2(uTexel.x,0)).y;
  float T = texture(uVel, vUv+vec2(0,uTexel.y)).x, B = texture(uVel, vUv-vec2(0,uTexel.y)).x;
  o = vec4(.5*(R-L-T+B), 0, 0, 1); }`;

export const VORT_FS = `${HEAD}
in vec2 vUv; out vec4 o; uniform sampler2D uVel, uCurl; uniform vec2 uTexel; uniform float uCurlK, uDt;
void main(){
  float L = texture(uCurl, vUv-vec2(uTexel.x,0)).x, R = texture(uCurl, vUv+vec2(uTexel.x,0)).x;
  float T = texture(uCurl, vUv+vec2(0,uTexel.y)).x, B = texture(uCurl, vUv-vec2(0,uTexel.y)).x, C = texture(uCurl, vUv).x;
  vec2 f = .5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f)+1e-4; f *= uCurlK*C; f.y *= -1.;
  o = vec4(clamp(texture(uVel, vUv).xy + f*uDt, -1000., 1000.), 0, 1); }`;

export const DIV_FS = `${HEAD}
in vec2 vUv; out vec4 o; uniform sampler2D uVel; uniform vec2 uTexel;
void main(){
  vec2 C = texture(uVel, vUv).xy;
  float L = vUv.x-uTexel.x < 0. ? -C.x : texture(uVel, vUv-vec2(uTexel.x,0)).x;
  float R = vUv.x+uTexel.x > 1. ? -C.x : texture(uVel, vUv+vec2(uTexel.x,0)).x;
  float T = vUv.y+uTexel.y > 1. ? -C.y : texture(uVel, vUv+vec2(0,uTexel.y)).y;
  float B = vUv.y-uTexel.y < 0. ? -C.y : texture(uVel, vUv-vec2(0,uTexel.y)).y;
  o = vec4(.5*(R-L+T-B), 0, 0, 1); }`;

export const PRESSURE_FS = `${HEAD}
in vec2 vUv; out vec4 o; uniform sampler2D uP, uDiv; uniform vec2 uTexel;
void main(){
  float L = texture(uP, vUv-vec2(uTexel.x,0)).x, R = texture(uP, vUv+vec2(uTexel.x,0)).x;
  float T = texture(uP, vUv+vec2(0,uTexel.y)).x, B = texture(uP, vUv-vec2(0,uTexel.y)).x;
  o = vec4((L+R+T+B-texture(uDiv, vUv).x)*.25, 0, 0, 1); }`;

export const GRAD_FS = `${HEAD}
in vec2 vUv; out vec4 o; uniform sampler2D uP, uVel; uniform vec2 uTexel;
void main(){
  float L = texture(uP, vUv-vec2(uTexel.x,0)).x, R = texture(uP, vUv+vec2(uTexel.x,0)).x;
  float T = texture(uP, vUv+vec2(0,uTexel.y)).x, B = texture(uP, vUv-vec2(0,uTexel.y)).x;
  o = vec4(texture(uVel, vUv).xy - vec2(R-L, T-B), 0, 1); }`;

export const SCALE_FS = `${HEAD}
in vec2 vUv; out vec4 o; uniform sampler2D uSrc; uniform float uValue;
void main(){ o = uValue*texture(uSrc, vUv); }`;

// ── 배경: 하늘 + 구름 + 빛줄기 + 헤일로 고리 + 육각 격자 + 빛 입자, 유체로 굴절 ──
export const BG_FS = `${HEAD}${COMMON}
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uTime, uEnergy, uK, uFluid;
uniform sampler2D uDye, uVel;
uniform vec3 uTop, uMid, uLow, uAccent;
uniform vec3 uHalo;   // 중심(px), 반지름(px)
uniform vec2 uMouse;
float hexEdge(vec2 p){
  const vec2 s = vec2(1., 1.7320508);
  vec4 hc = floor(vec4(p, p-vec2(.5,1.))/s.xyxy)+.5;
  vec4 h = vec4(p-hc.xy*s, p-(hc.zw+.5)*s);
  vec2 q = dot(h.xy,h.xy) < dot(h.zw,h.zw) ? h.xy : h.zw;
  q = abs(q); return .5 - max(dot(q, s*.5), q.x);
}
void main(){
  vec2 px = vec2(vUv.x, 1.-vUv.y)*uRes;
  float y = 1.-vUv.y;
  vec2 vel = uFluid > 0. ? texture(uVel, vUv).xy : vec2(0);
  vec3 dye = uFluid > 0. ? texture(uDye, vUv).rgb : vec3(0);
  vec2 warp = vel*.035*uK;                 // 유체가 배경을 유리처럼 굴절시킨다
  vec2 wp = px + warp;
  vec2 sp = wp/uK;                          // 설계 좌표(1920 기준)

  vec3 col = mix(uTop, uMid, smoothstep(0., .42, y));
  col = mix(col, uLow, smoothstep(.42, 1., y));
  col = mix(col, vec3(1.), .9*exp(-pow(length((sp-vec2(.78*uRes.x/uK, -.08*uRes.y/uK))/vec2(1200.,520.)), 2.)*1.6));
  col = mix(col, vec3(1.), .8*exp(-pow(length((sp-vec2(.08*uRes.x/uK, 1.08*uRes.y/uK))/vec2(900.,600.)), 2.)*1.6));

  // 흐르는 구름(도메인 왜곡 fbm)
  vec2 cp = sp/560. + vec2(uTime*.01, 0.);
  float c = fbm(cp + 1.6*fbm(cp*.6 + vec2(uTime*.015, -uTime*.008)));
  float cloud = smoothstep(.52, .86, c)*(1.-smoothstep(.15, .75, y));
  col = mix(col, vec3(1.), cloud*.5);

  // 헤일로 중심에서 퍼지는 빛줄기
  vec2 d = wp - uHalo.xy; float r = length(d); float ang = atan(d.y, d.x);
  float rays = pow(vnoise(vec2(ang*7., uTime*.12)), 3.)*.7 + pow(vnoise(vec2(ang*19.+3., -uTime*.08)), 5.)*.6;
  rays *= smoothstep(uHalo.z*2.6, uHalo.z*.2, r);
  col += vec3(1.)*rays*(.07 + .22*uEnergy);

  // 헤일로: 주 고리(박막 무지개빛) + 바깥 번짐 + 눈금 고리 + 점선 고리
  float k = uK; float rot = uTime*.05;
  float main = exp(-pow((r-uHalo.z)/(2.2*k), 2.));
  float soft = exp(-abs(r-uHalo.z)/(26.*k))*.35 + exp(-abs(r-uHalo.z*1.06)/(60.*k))*.18;
  vec3 iri = film(ang*.32 + rot + r*.0006/k);
  col = mix(col, vec3(1.), clamp(main*.9 + soft*.6, 0., 1.));
  col += iri*main*.22 + iri*soft*.08;
  float ticks = step(.5, fract((ang+rot)*36./6.28318))*exp(-pow((r-uHalo.z*.86)/(5.*k), 2.));
  float tickMask = step(.82, fract((ang+rot)*72./6.28318));
  col = mix(col, uAccent, ticks*tickMask*.35);
  float dash = step(.45, fract((ang-rot*1.6)*96./6.28318))*exp(-pow((r-uHalo.z*.71)/(1.2*k), 2.));
  col = mix(col, uAccent, dash*.3);
  col = mix(col, vec3(1.), exp(-pow((r-uHalo.z*1.18)/(1.*k), 2.))*.45);

  // 육각 격자: 아래쪽으로 갈수록 보이고, 지나가는 빛 물결과 유체 속도에 반짝인다
  vec2 hp = sp/52.;
  float e = hexEdge(hp);
  float line = 1.-smoothstep(0., .035, e);
  float wave = smoothstep(.82, 1., sin(dot(sp, vec2(.0021, .0016))*6.28318 - uTime*.9));
  float speed = clamp(length(vel)*.004, 0., 1.);
  float gridMask = smoothstep(.3, 1., y)*.9 + .1;
  col = mix(col, uAccent, line*gridMask*(.06 + .32*wave + .55*speed));
  float cellGlow = (1.-smoothstep(0., .5, e))*speed*.08;
  col += uAccent*cellGlow;

  // 떠오르는 빛 입자 두 겹(작은 반짝임, 큰 보케)
  for (int L = 0; L < 2; L++) {
    float size = L == 0 ? 90. : 230.;
    vec2 q = sp/size + vec2(0., uTime*(L == 0 ? .05 : .02));
    vec2 id = floor(q); vec2 f = fract(q)-.5;
    float h1 = hash(id+float(L)*7.), h2 = hash(id+13.7);
    vec2 off = (vec2(h1, h2)-.5)*.6;
    float tw = .5+.5*sin(uTime*(1.2+h1*2.) + h2*30.);
    float rad = L == 0 ? .035+.03*h2 : .16+.1*h1;
    float s = smoothstep(rad, 0., length(f-off));
    float on = step(L == 0 ? .55 : .78, h1);
    vec3 sc = L == 0 ? vec3(1.) : mix(vec3(1.), film(h2+uTime*.03), .35);
    col = mix(col, sc, s*on*tw*(L == 0 ? .8 : .12)*(1.-y*.3));
  }

  // 유체 염료: 지나간 자리에 남는 하늘빛 결 + 가장자리 무지개빛
  float dl = clamp(length(dye), 0., 1.2);
  col = mix(col, vec3(.95, .99, 1.), smoothstep(0., 1., dl)*.38);
  col += film(dl*1.7 + uTime*.04)*smoothstep(.05, .5, dl)*(1.-smoothstep(.5, 1.2, dl))*.07;

  col += (hash(px + fract(uTime)*100.)-.5)/255.;   // 색 띠 방지
  o = vec4(col, 1.);
}`;

// ── 카드 광택(인스턴스 사각형, 화면 겹치기 'screen') ──
export const CARD_VS = `${HEAD}
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 iRect; layout(location=2) in vec4 iParam; layout(location=3) in vec4 iClip; layout(location=4) in vec4 iColor;
uniform vec2 uView;
out vec2 vPx; flat out vec4 vRect; flat out vec4 vParam; flat out vec4 vClip; flat out vec4 vColor;
void main(){
  float m = 22.;
  vec2 p = iRect.xy - m + (aPos*.5+.5)*(iRect.zw + 2.*m);
  vPx = p; vRect = iRect; vParam = iParam; vClip = iClip; vColor = iColor;
  vec2 c = p/uView*2.-1.; gl_Position = vec4(c.x, -c.y, 0., 1.);
}`;

export const CARD_FS = `${HEAD}${COMMON}
in vec2 vPx; flat in vec4 vRect; flat in vec4 vParam; flat in vec4 vClip; flat in vec4 vColor;
out vec4 o;
uniform vec2 uMouse; uniform float uTime; uniform vec4 uOcc[4]; uniform int uOccN;
void main(){
  if (vPx.x < vClip.x || vPx.y < vClip.y || vPx.x > vClip.z || vPx.y > vClip.w) discard;
  if (vColor.a < .5) for (int i = 0; i < 4; i++) { if (i >= uOccN) break; vec4 q = uOcc[i]; if (vPx.x > q.x && vPx.y > q.y && vPx.x < q.z && vPx.y < q.w) discard; }
  vec2 hs = vRect.zw*.5; vec2 c = vRect.xy + hs; vec2 q = vPx - c;
  float d = sdRoundBox(q, hs, vParam.w);
  float cost = vParam.x, star = vParam.y, hov = vParam.z;
  float tier = clamp(smoothstep(3.5, 5., cost) + (star >= 3. ? .9 : star >= 2. ? .35 : 0.), 0., 1.3);
  vec2 n = q/hs;
  float inside = 1.-smoothstep(-.6, .6, d);
  vec2 tilt = hov > 0. ? clamp((uMouse-c)/hs, -1.4, 1.4)*hov : .25*vec2(sin(uTime*.37 + c.x*.013), cos(uTime*.29 + c.y*.017));
  float band = dot(n, normalize(vec2(1., -1.5))) + tilt.x*.7 - tilt.y*.45;
  float sweep = fract(uTime*.07 + hash(floor(c/40.))*.9)*5.-2.;
  float gloss = exp(-pow((band-sweep)*2.6, 2.))*(.16 + .2*hov);
  vec3 holo = film(band*1.25 + length(n)*.35 + uTime*.04);
  float grain = .65 + .35*vnoise(vPx*.45 + band*3.);
  float foil = (.05 + .2*tier + .3*hov)*grain*smoothstep(-.9, .6, band + .3*sin(n.y*3.));
  float spec = hov*exp(-dot(vPx-uMouse, vPx-uMouse)/(hs.x*hs.x*.55))*.32;
  float rim = (1.-smoothstep(0., 2.6, -d))*inside;
  float sparkle = 0.;
  if (star >= 3.) { vec2 g = vPx/7.; float s = hash(floor(g)); sparkle = step(.93, s)*pow(.5+.5*sin(uTime*3. + s*60. + band*4.), 8.)*.9; }
  vec3 col = vec3(0.);
  col += vec3(1.)*gloss*inside;
  col += holo*foil*inside;
  col += vec3(1.)*spec*inside;
  col += mix(vec3(1.), vColor.rgb, .55)*rim*(.18 + .5*tier + .3*hov);
  col += mix(vec3(1.), holo, .5)*sparkle*inside;
  float outer = d > 0. ? exp(-d/7.)*(.32*tier + .22*hov) : 0.;
  col += mix(vColor.rgb, holo, .35)*outer;
  o = vec4(col, 1.);
}`;

// ── 빛 폭발(합성·레벨업·필살기·치명타) ──
export const BURST_VS = `${HEAD}
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 iB; layout(location=2) in vec4 iC;
uniform vec2 uView;
out vec2 vQ; flat out vec4 vB; flat out vec4 vC;
void main(){
  vQ = aPos*1.15; vB = iB; vC = iC;
  vec2 p = iB.xy + vQ*iB.z;
  vec2 c = p/uView*2.-1.; gl_Position = vec4(c.x, -c.y, 0., 1.);
}`;

export const BURST_FS = `${HEAD}${COMMON}
in vec2 vQ; flat in vec4 vB; flat in vec4 vC; out vec4 o;
uniform float uFlash;
void main(){
  float t = clamp(vB.w, 0., 1.); float r = length(vQ); float ang = atan(vQ.y, vQ.x);
  float seed = vC.a;
  float e = 1.-pow(1.-t, 3.);
  float ring = exp(-pow((r - e*.95)*14., 2.))*(1.-t);
  float ring2 = exp(-pow((r - e*.62)*30., 2.))*(1.-t)*.6;
  float core = exp(-r*r*10.)*pow(1.-t, 2.5)*uFlash;
  float rays = pow(abs(sin(ang*5. + seed*6.)), 30.)*smoothstep(1., .05, r)*smoothstep(0., .1, t)*(1.-t)*.9;
  rays += pow(abs(sin(ang*8. + seed*13. + t)), 50.)*smoothstep(.9, .05, r)*(1.-t)*.6;
  float sparks = 0.;
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    float a = hash(vec2(fi, seed))*6.28318; float sp = .45 + .55*hash(vec2(seed, fi));
    vec2 dir = vec2(cos(a), sin(a)); vec2 dv = vQ - dir*sp*e;
    float along = dot(dv, dir); float perp = length(dv - dir*along);
    float streak = exp(-perp*perp*4000.)*smoothstep(-.16*(1.-t) - .001, 0., along)*step(along, 0.);
    sparks += (exp(-dot(dv, dv)*1600.) + streak*.6)*(1.-t);
  }
  vec3 iri = film(ang*.3 + r*2. + seed);
  vec3 col = vC.rgb*(ring*1.1 + rays + sparks*.9) + mix(vec3(1.), iri, .6)*ring2 + vec3(1.)*core;
  o = vec4(col, 1.);
}`;

// ── 화면 전환: 파란 장막이 사선으로 덮었다가 보로노이 파편으로 부서진다 / 가벼운 빛 쓸기 ──
export const VEIL_FS = `${HEAD}${COMMON}
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uT, uK, uSeed; uniform int uMode; uniform vec3 uA, uB, uAccent;
vec3 voro(vec2 p){ // x: 가장자리까지 거리, yz: 칸 번호
  vec2 n = floor(p), f = fract(p); vec2 mg, mr; float md = 8.;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 rr = g + vec2(hash(n+g+uSeed), hash(n+g+uSeed+31.7)) - f; float d = dot(rr,rr); if (d < md){ md = d; mr = rr; mg = g; } }
  md = 8.;
  for (int j=-2;j<=2;j++) for (int i=-2;i<=2;i++){ vec2 g = mg + vec2(i,j); vec2 rr = g + vec2(hash(n+g+uSeed), hash(n+g+uSeed+31.7)) - f; if (dot(mr-rr, mr-rr) > 1e-5) md = min(md, dot(.5*(mr+rr), normalize(rr-mr))); }
  return vec3(md, n + mg);
}
vec4 veilColor(vec2 px){
  vec2 sp = px/uK;
  float diag = (sp.x*.8 + sp.y*.6)/(uRes.x/uK*.8 + uRes.y/uK*.6);
  vec3 c = mix(uA, uB, diag);
  float stripe = step(.5, fract((sp.x - sp.y)*.012))*.05;
  c += stripe;
  vec2 ctr = uRes*.5; float r = length(px-ctr)/uK; float ang = atan(px.y-ctr.y, px.x-ctr.x);
  float halo = exp(-pow((r-170.)/2.4, 2.)) + exp(-pow((r-205.)/1.,2.))*.6 + step(.5, fract(ang*48./6.28318 + uT))*exp(-pow((r-140.)/1.2, 2.))*.7;
  c = mix(c, vec3(1.), clamp(halo, 0., 1.)*.85);
  c += film(ang*.3 + uT)*exp(-pow((r-170.)/12., 2.))*.18;
  return vec4(c, 1.);
}
void main(){
  vec2 px = vec2(vUv.x, 1.-vUv.y)*uRes;
  float t = uT;
  if (uMode == 1) { // 빛 쓸기
    float s = (px.x + px.y*.5)/(uRes.x + uRes.y*.5);
    float x = s - (t*1.5 - .25);
    float band = exp(-x*x*90.)*.55 + exp(-pow(x+.06, 2.)*900.)*.6;
    vec3 c = mix(vec3(1.), film(s*2. + t), .35);
    float a = band*(1.-t*.4);
    o = vec4(c*a, a); return;
  }
  vec4 v = veilColor(px);
  float s = (px.x*.9 + px.y*.45)/(uRes.x*.9 + uRes.y*.45);
  if (t < .24) { // 덮기
    float w = 1.-pow(1.-t/.24, 3.);
    float edge = w*1.25 - s;
    float a = smoothstep(0., .015, edge);
    float lineGlow = exp(-pow(edge*60., 2.));
    vec3 c = mix(v.rgb, vec3(1.), lineGlow*.8);
    o = vec4(c*a + vec3(1.)*lineGlow*(1.-a)*.6, max(a, lineGlow*.6)); return;
  }
  if (t < .34) { o = v; return; }
  float u = (t-.34)/.66;
  vec2 ctr = uRes*.5;
  vec2 pz = ctr + (px-ctr)/(1.+u*u*.35);
  vec3 vc = voro(pz/(150.*uK));
  vec2 id = vc.yz;
  float delay = clamp(length((id*150.*uK) - ctr)/length(ctr)*.55 + hash(id+uSeed)*.25, 0., .8);
  float lu = clamp((u - delay)/(1.-delay+1e-3), 0., 1.);
  float shrink = lu*lu*.5;
  float a = smoothstep(shrink - .02, shrink + .02, vc.x)*(1.-smoothstep(.55, 1., lu));
  float edge = exp(-pow((vc.x - shrink)*28., 2.))*(1.-lu)*step(.001, lu);
  vec3 c = mix(v.rgb, vec3(1.), lu*.35) + film(hash(id)+u)*edge*.5;
  float alpha = max(a, edge*.8);
  o = vec4(c*alpha, alpha);
}`;
