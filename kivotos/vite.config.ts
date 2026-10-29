import { defineConfig } from 'vite';

// 상대 경로(base './')로 빌드해 GitHub Pages 하위 경로(/gamecode/kivotos/)에서도 그대로 열린다.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2022' },
});
