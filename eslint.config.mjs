// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from 'eslint-plugin-vitest';
import prettier from 'eslint-config-prettier';

export default [
    {
        ignores: ['node_modules/**', 'dist/**', 'target/**', 'src/main/resources/static/js/**']
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/test/frontend/**/*.ts'],
        plugins: { vitest },
        rules: {
            ...vitest.configs.recommended.rules
        }
    },
    prettier,
    {
        files: ['src/main/resources/static/ts/**/*.ts', 'src/test/frontend/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
        }
    }
];
