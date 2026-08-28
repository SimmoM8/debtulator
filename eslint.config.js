// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const sourceFiles = '**/*.{js,jsx,ts,tsx}';
const legacyDirectories = [
  'config',
  'constants',
  'data',
  'features',
  'screens',
  'services',
  'state',
  'types',
  'utils',
];
const legacyPatterns = [
  {
    group: legacyDirectories.flatMap((directory) => [
      `@/src/${directory}`,
      `@/src/${directory}/**`,
    ]),
    message: 'This alias targets a retired pre-refactor tree. Import its canonical layered module.',
  },
  {
    group: ['@/components', '@/components/**', '@/constants', '@/constants/**', '@/hooks', '@/hooks/**'],
    message: 'This root alias is legacy. Import the canonical module under src/domain, src/components, src/theme, or src/presentation.',
  },
];
const sdkPatterns = [
  'react',
  'react/**',
  'react-native',
  'react-native/**',
  'react-native-*',
  'expo',
  'expo/**',
  'expo-*',
  '@expo/**',
  '@supabase/**',
];

function layerPatterns(layer) {
  return [`@/src/${layer}`, `@/src/${layer}/**`];
}

function restrictedImports(patterns) {
  return [
    'error',
    {
      patterns: [...legacyPatterns, ...patterns],
    },
  ];
}

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**'],
  },
  {
    files: [`src/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([]),
    },
  },
  {
    files: [`src/domain/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('application'),
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            ...layerPatterns('presentation'),
            ...layerPatterns('components'),
            ...layerPatterns('theme'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Domain may import only domain code. Move outward behavior behind an application port.',
        },
        {
          group: sdkPatterns,
          message: 'Domain must be framework-independent; move this SDK/native dependency outward.',
        },
      ]),
    },
  },
  {
    files: [`src/application/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            ...layerPatterns('presentation'),
            ...layerPatterns('components'),
            ...layerPatterns('theme'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Application may import only application/domain code. Depend on a port, not its adapter.',
        },
        {
          group: sdkPatterns,
          message: 'Application must not depend on React, native APIs, Expo, or vendor SDKs; implement an application port outward.',
        },
      ]),
    },
  },
  {
    files: [`src/infrastructure/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('presentation'),
            ...layerPatterns('components'),
            ...layerPatterns('theme'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Infrastructure must not depend on presentation/composition. Depend inward on contracts.',
        },
      ]),
    },
  },
  {
    files: [`src/platform/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('infrastructure'),
            ...layerPatterns('presentation'),
            ...layerPatterns('components'),
            ...layerPatterns('theme'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Platform adapters may depend only on platform/application/domain code internally.',
        },
      ]),
    },
  },
  {
    files: [`src/presentation/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Presentation must consume an application contract/provider, not a concrete adapter.',
        },
      ]),
    },
  },
  {
    files: [`src/components/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('domain'),
            ...layerPatterns('application'),
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            ...layerPatterns('presentation'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Reusable components may depend only on components, theme, and external UI APIs.',
        },
      ]),
    },
  },
  {
    files: [`src/theme/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('domain'),
            ...layerPatterns('application'),
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            ...layerPatterns('presentation'),
            ...layerPatterns('components'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Theme tokens must be dependency-free global styling values.',
        },
      ]),
    },
  },
  {
    files: [
      'src/presentation/providers/AppDataProvider.{js,jsx,ts,tsx}',
      'src/presentation/providers/AuthProvider.{js,jsx,ts,tsx}',
      'src/presentation/providers/**/*GatewayProvider.{js,jsx,ts,tsx}',
      `src/composition/${sourceFiles}`,
    ],
    rules: {
      'no-restricted-imports': restrictedImports([]),
    },
  },
  {
    files: [`src/app/${sourceFiles}`],
    ignores: ['src/app/**/_layout.*'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('domain'),
            ...layerPatterns('application'),
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            ...layerPatterns('components'),
            ...layerPatterns('theme'),
            '@/src/composition',
            '@/src/composition/**',
            '@/src/presentation/components',
            '@/src/presentation/components/**',
            '@/src/presentation/config',
            '@/src/presentation/config/**',
            '@/src/presentation/design-system',
            '@/src/presentation/design-system/**',
            '@/src/presentation/navigation',
            '@/src/presentation/navigation/**',
            '@/src/presentation/onboarding',
            '@/src/presentation/onboarding/**',
            '@/src/presentation/providers',
            '@/src/presentation/providers/**',
            '@/src/presentation/theme',
            '@/src/presentation/theme/**',
          ],
          message: 'Non-layout routes may import only Expo Router and presentation screens/features.',
        },
      ]),
    },
  },
]);
