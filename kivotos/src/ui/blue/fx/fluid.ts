// 2D 안정 유체. 배경이 커서·드래그·빛 폭발에 밀려 흐르게 한다. 부동소수 렌더 대상이 없으면 만들지 않는다.
import { type Double, type Prog, type Target, double, program, target } from './gl';
import { ADVECT_FS, CURL_FS, DIV_FS, FULL_VS, GRAD_FS, PRESSURE_FS, SCALE_FS, SPLAT_FS, VORT_FS } from './shaders';

export interface Fluid {
  vel: Double;
  dye: Double;
  splat(x: number, y: number, dx: number, dy: number, color: [number, number, number], radius?: number): void;
  step(dt: number): void;
}

export function createFluid(gl: WebGL2RenderingContext, tri: WebGLVertexArrayObject, simRes: number, dyeRes: number, aspect: number): Fluid | null {
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null;
  const HF = gl.HALF_FLOAT;
  const size = (res: number) => (aspect >= 1 ? [Math.round(res * aspect), res] : [res, Math.round(res / aspect)]);
  const [sw, sh] = size(simRes);
  const [dw, dh] = size(dyeRes);
  const mk = (w: number, h: number, i: number, f: number) => target(gl, w, h, i, f, HF);
  const pair = (w: number, h: number, i: number, f: number) => { const a = mk(w, h, i, f); const b = mk(w, h, i, f); return a && b ? double(a, b) : null; };
  const vel = pair(sw, sh, gl.RG16F, gl.RG);
  const dye = pair(dw, dh, gl.RGBA16F, gl.RGBA);
  const pressure = pair(sw, sh, gl.R16F, gl.RED);
  const div = mk(sw, sh, gl.R16F, gl.RED);
  const curl = mk(sw, sh, gl.R16F, gl.RED);
  if (!vel || !dye || !pressure || !div || !curl) return null;

  const P = {
    splat: program(gl, FULL_VS, SPLAT_FS), advect: program(gl, FULL_VS, ADVECT_FS), curl: program(gl, FULL_VS, CURL_FS),
    vort: program(gl, FULL_VS, VORT_FS), div: program(gl, FULL_VS, DIV_FS), pressure: program(gl, FULL_VS, PRESSURE_FS),
    grad: program(gl, FULL_VS, GRAD_FS), scale: program(gl, FULL_VS, SCALE_FS),
  };
  const texel = [1 / sw, 1 / sh];
  let unit = 0;
  const tex = (pr: Prog, name: string, t: Target) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.uniform1i(pr.u[name], unit++); };
  const run = (pr: Prog, out: Target, set: (pr: Prog) => void) => {
    gl.useProgram(pr.p);
    unit = 0;
    set(pr);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
    gl.viewport(0, 0, out.w, out.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  return {
    vel, dye,
    splat(x, y, dx, dy, color, radius = 0.0012) {
      gl.bindVertexArray(tri);
      gl.disable(gl.BLEND);
      const a = sw / sh;
      run(P.splat, vel.write, (p) => { tex(p, 'uTarget', vel.read); gl.uniform1f(p.u.uAspect, a); gl.uniform2f(p.u.uPoint, x, 1 - y); gl.uniform3f(p.u.uColor, dx, -dy, 0); gl.uniform1f(p.u.uRadius, radius); });
      vel.swap();
      run(P.splat, dye.write, (p) => { tex(p, 'uTarget', dye.read); gl.uniform1f(p.u.uAspect, a); gl.uniform2f(p.u.uPoint, x, 1 - y); gl.uniform3f(p.u.uColor, ...color); gl.uniform1f(p.u.uRadius, radius); });
      dye.swap();
    },
    step(dt) {
      gl.bindVertexArray(tri);
      gl.disable(gl.BLEND);
      run(P.curl, curl, (p) => { tex(p, 'uVel', vel.read); gl.uniform2f(p.u.uTexel, texel[0], texel[1]); });
      run(P.vort, vel.write, (p) => { tex(p, 'uVel', vel.read); tex(p, 'uCurl', curl); gl.uniform2f(p.u.uTexel, texel[0], texel[1]); gl.uniform1f(p.u.uCurlK, 22); gl.uniform1f(p.u.uDt, dt); });
      vel.swap();
      run(P.div, div, (p) => { tex(p, 'uVel', vel.read); gl.uniform2f(p.u.uTexel, texel[0], texel[1]); });
      run(P.scale, pressure.write, (p) => { tex(p, 'uSrc', pressure.read); gl.uniform1f(p.u.uValue, 0.8); });
      pressure.swap();
      for (let i = 0; i < 18; i++) {
        run(P.pressure, pressure.write, (p) => { tex(p, 'uP', pressure.read); tex(p, 'uDiv', div); gl.uniform2f(p.u.uTexel, texel[0], texel[1]); });
        pressure.swap();
      }
      run(P.grad, vel.write, (p) => { tex(p, 'uP', pressure.read); tex(p, 'uVel', vel.read); gl.uniform2f(p.u.uTexel, texel[0], texel[1]); });
      vel.swap();
      run(P.advect, vel.write, (p) => { tex(p, 'uVel', vel.read); tex(p, 'uSrc', vel.read); gl.uniform2f(p.u.uTexel, texel[0], texel[1]); gl.uniform1f(p.u.uDt, dt); gl.uniform1f(p.u.uDiss, 0.35); });
      vel.swap();
      run(P.advect, dye.write, (p) => { tex(p, 'uVel', vel.read); tex(p, 'uSrc', dye.read); gl.uniform2f(p.u.uTexel, texel[0], texel[1]); gl.uniform1f(p.u.uDt, dt); gl.uniform1f(p.u.uDiss, 0.55); });
      dye.swap();
    },
  };
}
