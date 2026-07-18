// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
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
]);
