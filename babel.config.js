module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Plugin do reanimated deve ser o último
      'react-native-reanimated/plugin',
    ],
  };
};
