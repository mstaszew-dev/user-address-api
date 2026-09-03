/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    pool: 'threads',
    poolOptions: { threads: { execArgv: ['--no-experimental-webstorage'] } },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      thresholds: {
        lines: 95,
        functions: 95,
        statements: 95,
        branches: 90
      }
    }
  }
});
