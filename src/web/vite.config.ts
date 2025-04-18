import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import * as path from 'node:path';

export default defineConfig(() => {
  const env = loadEnv('development', path.resolve(process.cwd(), '../../'));

  return {
    plugins: [svelte()],
    build: {
      outDir: '../../dist',
      emptyOutDir: true,
    },
    ...(env.VITE_USER_NODE_ENV === 'development'
      ? {
          server: {
            proxy: {
              '/api': {
                target: `http://localhost:${2284}`,
                changeOrigin: true,
              },
            },
          },
        }
      : {}),
  };
});
