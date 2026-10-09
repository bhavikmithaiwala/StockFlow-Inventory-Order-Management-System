import js from '@eslint/js';
import ts from 'typescript-eslint';
import angular from 'angular-eslint';

export default ts.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/.angular/**', '**/coverage/**'] },
  {
    files: ['apps/**/*.ts'],
    extends: [js.configs.recommended, ...ts.configs.recommended],
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['apps/client/**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
  },
  {
    files: ['apps/client/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
);
