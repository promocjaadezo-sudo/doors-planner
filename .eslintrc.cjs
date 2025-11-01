module.exports = {
  root: true,
  ignorePatterns: [
    'backups/**',
    'incoming/**',
    'worker-app.zip'
  ],
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended'
  ],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
    },
    {
      files: ['scripts/**/*.js', 'playwright.config.ts', 'scripts/**/*.ts'],
      env: {
        node: true,
      },
    },
    {
      files: ['tests/**/*.ts'],
      env: {
        node: true,
        browser: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  globals: {
    window: 'readonly',
    document: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    renderOrderPage: 'readonly',
    updateTasksBadge: 'readonly',
    autoReserveFromChecklist: 'readonly',
    toggleChecklistItem: 'readonly',
    save: 'readonly',
  },
};
