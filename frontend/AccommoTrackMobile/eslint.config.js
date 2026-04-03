// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const globals = require('globals');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Existing codebase has many valid JSX strings and Expo import patterns that
      // trigger strict rules; keep lint useful by focusing on actionable issues.
      "react/no-unescaped-entities": "off",
      "import/namespace": "off",
      "react/no-children-prop": "off",
      "import/no-unresolved": ["error", { ignore: ["^@env$"] }],
    },
  },
  {
    files: [
      "src/**/__tests__/**/*.{js,jsx}",
      "src/services/__tests__/**/*.js",
      "jest.setup.js",
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.browser,
      },
    },
  },
]);
