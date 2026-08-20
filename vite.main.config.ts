import { defineConfig } from 'vite';
import commonjs from '@rollup/plugin-commonjs';

const nativeModules = ['sqlite3', 'better-sqlite3', 'bcryptjs', 'node-gyp-build'];

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
    },
    rollupOptions: {
      // Don't bundle native modules
      external: [
        'electron',
        'sqlite3',
        'better-sqlite3',
        'bcryptjs',
        '@databases/sqlite',
        'archiver',
        'crypto',
        'fs',
        'path',
        'stream',
        'util',
        'zlib',
      ],
      plugins: [
        commonjs({
          dynamicRequireTargets: [
            'node_modules/sqlite3/**',
            'node_modules/better-sqlite3/**',
            'node_modules/bcryptjs/**',
          ],
          ignoreDynamicRequires: true,
        }),
      ],
    },
    commonjsOptions: {
      dynamicRequireTargets: [
        'node_modules/sqlite3/**',
        'node_modules/better-sqlite3/**',
        'node_modules/bcryptjs/**',
      ],
      ignoreDynamicRequires: true,
    },
    // Keep node built-ins external
    ssr: true,
  },
  plugins: [],
  define: {
    'process.platform': JSON.stringify(process.platform),
  },
});