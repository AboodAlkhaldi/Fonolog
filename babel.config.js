module.exports = function (api) {
  // Config depends on NODE_ENV (we strip console.* only in production builds),
  // so cache per-env rather than unconditionally.
  api.cache.using(() => process.env.NODE_ENV);

  const isProd =
    process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';

  const plugins = [];

  // Strip developer logging from production bundles. We keep console.warn /
  // console.error — those are deliberate boot/runtime diagnostics worth having
  // in crash logs. Only log/debug/info noise is removed.
  if (isProd) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  // react-native-reanimated/plugin MUST remain last.
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
    ],
    plugins,
  };
};
