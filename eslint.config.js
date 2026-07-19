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
    files: [
      'app/**/*.ios.{ts,tsx}',
      'src/components/ios/**/*.{ts,tsx}',
      'src/screens/ios/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: 'react-native',
            importNames: ['Pressable', 'TextInput', 'Switch', 'Modal', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback'],
            message: 'iOS presentation must use SwiftUI controls through @expo/ui.',
          },
          { name: 'expo-blur', message: 'Use native iOS navigation and SwiftUI materials instead of BlurView.' },
          { name: 'expo-glass-effect', message: 'Ordinary iOS controls must receive Liquid Glass from the system.' },
          { name: '@/src/components/navigation/GlassBottomTabBar', message: 'iOS navigation uses expo-router native tabs.' },
          { name: '@/src/components/ui/GlassSurface', message: 'Do not wrap iOS content in fake glass surfaces.' },
          { name: '@/src/components/ui/Primitives', message: 'iOS screens compose semantic SwiftUI components, not the legacy PageHeader/control layer.' },
        ],
      }],
    },
  },
  {
    files: ['src/**/*Row*.tsx', 'src/**/rows/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            name: '@expo/ui/swift-ui',
            importNames: ['Host'],
            message: 'Do not use SwiftUI Host inside row-level components. Keep one screen-level Host boundary.',
          },
          {
            name: '@/src/components/ios/NativeScreen',
            message: 'Do not nest NativeScreen/Host inside row-level components.',
          },
        ],
      }],
    },
  },
]);
