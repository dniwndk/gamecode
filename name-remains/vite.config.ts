import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 상대 경로(base './')로 빌드해 GitHub Pages의 하위 경로(/gamecode/name-remains/)에서도 그대로 열린다.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 900 },
});
