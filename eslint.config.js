// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    ignores: ['app/_layout.tsx', 'app/_layout.ios.tsx', 'app/(tabs)/**/_layout.tsx', 'app/(tabs)/**/_layout.ios.tsx'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: '@/src/state/AppDataProvider', message: 'Do not place data state logic in app/ routes. Re-export route modules from src/features instead.' },
          { name: '@/src/state/AuthProvider', message: 'Do not place auth state logic in app/ routes. Keep app/ routes minimal.' },
          { name: '@/src/services/telemetry', message: 'Do not place presentation or app services wiring in app/ routes.' },
          { name: '@/src/components/ui/Primitives', message: 'Do not build presentation UI in app/ route files; route files should re-export or redirect.' },
          { name: '@/src/components/ui/Finance', message: 'Do not build presentation UI in app/ route files; route files should re-export or redirect.' },
          { name: '@/src/components/ui/CollectionPageControls', message: 'Do not build presentation UI in app/ route files; route files should re-export or redirect.' },
        ],
      }],
    },
  },
  {
    files: ['src/screens/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/src/components/ios/**'],
          message: 'Application content must use the shared design system; keep iOS-only code in navigation adapters.',
        }],
      }],
    },
  },
]);
