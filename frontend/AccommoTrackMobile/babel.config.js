const fs = require('fs');

module.exports = function(api) {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  api.cache.using(() => `${process.env.APP_ENV || ''}:${process.env.NODE_ENV || ''}`);

  const profileEnvFile = `.env.${appEnv}`;
  const envPath = fs.existsSync(profileEnvFile) ? profileEnvFile : '.env';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: envPath,
          blacklist: null,
          whitelist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
    ],
  };
};
