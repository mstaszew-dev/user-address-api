import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['src/test/frontend/setup.ts'],
        include: ['src/test/frontend/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/main/resources/static/ts/**/*.ts'],
            reporter: ['text', 'html'],
            thresholds: {
                lines: 95,
                functions: 95,
                statements: 95,
                branches: 90
            }
        }
    }
});
