module.exports = {
  extends: ['expo'],
  ignorePatterns: ['/dist/*', '/node_modules/*'],
  globals: {
    Intl: 'readonly',
    URLSearchParams: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    alert: 'readonly',
    fetch: 'readonly',
    FormData: 'readonly',
    console: 'readonly',
    __DEV__: 'readonly'
  }
};
