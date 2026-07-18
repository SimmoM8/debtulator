// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['app/_layout.tsx', 'app/(tabs)/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['react-native'],
            importNames: ['Pressable', 'TextInput', 'Switch', 'Modal'],
            message: 'Use the shared native wrappers from src/components/ui instead of raw React Native controls.',
          },
        ],
      }],
    },
  },
]);
