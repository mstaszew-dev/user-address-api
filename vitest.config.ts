import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['src/test/frontend/setup.ts'],
        include: ['src/test/frontend/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/main/resources/static/ts/**/*.ts'],
            exclude: ['src/main/resources/static/ts/types.ts'],
            reporter: ['text', 'html'],
            thresholds: {
                lines: 90,
                functions: 90,
                statements: 90,
                branches: 80
            }
        }
    }
});
