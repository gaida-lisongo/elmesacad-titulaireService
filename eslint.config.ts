import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import n from 'eslint-plugin-n';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // global ignores
  globalIgnores(['**/dist/**', '**/public/**/lib/**']),
  // linting rules (code quality only)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      n,
    },
    rules: {
      // code quality / correctness
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': 'off',
      'no-extra-boolean-cast': 'off',
      'no-process-env': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      // node correctness
      'n/no-extraneous-import': 'error'
    },
  },
  // MUST be last — disables ALL formatting rules
  eslintConfigPrettier,
]);
