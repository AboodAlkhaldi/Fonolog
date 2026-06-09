// ESLint 9 flat config. Wraps the Expo shared config and scopes linting to the
// app/client source only — the Deno edge functions under supabase/ run a
// different runtime and are excluded from this project's type-check too.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'android/**',
      'ios/**',
      'supabase/**',
    ],
  },
];
