module.exports = {
  extends: ['expo'],
  ignorePatterns: ['/dist/*', '/node_modules/*'],
  globals: {
    Intl: 'readonly',
    URLSearchParams: 'readonly',
    setTimeout: 'readonly'
  }
};
