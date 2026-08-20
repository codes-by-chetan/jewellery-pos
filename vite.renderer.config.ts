import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig(async () => {
  const reactPlugin = await import('@vitejs/plugin-react').then(m => m.default);
  return {
    plugins: [reactPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: '.vite/build/renderer',
    },
    css: {
      postcss: './postcss.config.js',
    },
  };
});