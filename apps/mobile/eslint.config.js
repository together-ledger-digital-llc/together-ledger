const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    // The phone's t() reads English with a JSON import attribute (src/i18n/sentences.js), which
    // Node, Babel and TypeScript all read; ES2025 is the first edition with the syntax.
    files: ['src/i18n/*.js'],
    languageOptions: { ecmaVersion: 2025 },
  },
]);
