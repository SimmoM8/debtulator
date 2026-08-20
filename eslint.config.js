// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const sourceFiles = '**/*.{js,jsx,ts,tsx}';
const legacyDirectories = [
  'components',
  'config',
  'constants',
  'data',
  'features',
  'navigation',
  'screens',
  'services',
  'state',
  'theme',
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
    message: 'This root alias is legacy. Import the canonical module under src/domain or src/presentation.',
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
const infrastructureSdkPatterns = [
  '@supabase/**',
  'expo-sqlite',
  'expo-secure-store',
  'expo-file-system',
  'expo-document-picker',
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
    files: [
      `apps/mobile/app/${sourceFiles}`,
      `apps/mobile/src/${sourceFiles}`,
      `packages/domain/src/${sourceFiles}`,
      `packages/application/src/${sourceFiles}`,
      `packages/contracts/src/${sourceFiles}`,
    ],
    rules: {
      'no-restricted-imports': restrictedImports([]),
    },
  },
  {
    files: [`packages/domain/src/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('application'),
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            ...layerPatterns('presentation'),
            '@/src/composition',
            '@/src/composition/**',
            '@debtulator/application',
            '@debtulator/application/**',
            '@debtulator/contracts',
            '@debtulator/contracts/**',
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
    files: [`packages/application/src/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            ...layerPatterns('presentation'),
            '@/src/composition',
            '@/src/composition/**',
            '@debtulator/contracts',
            '@debtulator/contracts/**',
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
    files: [`packages/contracts/src/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            '@debtulator/domain',
            '@debtulator/domain/**',
            '@debtulator/application',
            '@debtulator/application/**',
            '@/src/**',
          ],
          message: 'Generated contracts must remain transport-only and cannot depend on app layers.',
        },
        {
          group: sdkPatterns,
          message: 'Generated contracts must not acquire runtime framework or vendor SDK dependencies.',
        },
      ]),
    },
  },
  {
    files: [`apps/mobile/src/infrastructure/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('presentation'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Infrastructure must not depend on presentation/composition. Depend inward on contracts.',
        },
      ]),
    },
  },
  {
    files: [`apps/mobile/src/platform/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('infrastructure'),
            ...layerPatterns('presentation'),
            '@/src/composition',
            '@/src/composition/**',
          ],
          message: 'Platform adapters may depend only on platform/application/domain code internally.',
        },
      ]),
    },
  },
  {
    files: [`apps/mobile/src/presentation/${sourceFiles}`],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            '@/src/composition',
            '@/src/composition/**',
            ...infrastructureSdkPatterns,
          ],
          message: 'Presentation must consume an application contract/provider, not a concrete adapter.',
        },
      ]),
    },
  },
  {
    files: [
      'apps/mobile/src/presentation/providers/AppDataProvider.{js,jsx,ts,tsx}',
      'apps/mobile/src/presentation/providers/AuthProvider.{js,jsx,ts,tsx}',
      'apps/mobile/src/presentation/providers/**/*GatewayProvider.{js,jsx,ts,tsx}',
      `apps/mobile/src/composition/${sourceFiles}`,
    ],
    rules: {
      'no-restricted-imports': restrictedImports([]),
    },
  },
  {
    files: [`apps/mobile/app/${sourceFiles}`],
    ignores: ['apps/mobile/app/**/_layout.*'],
    rules: {
      'no-restricted-imports': restrictedImports([
        {
          group: [
            ...layerPatterns('domain'),
            ...layerPatterns('application'),
            ...layerPatterns('infrastructure'),
            ...layerPatterns('platform'),
            '@debtulator/domain',
            '@debtulator/domain/**',
            '@debtulator/application',
            '@debtulator/application/**',
            '@debtulator/contracts',
            '@debtulator/contracts/**',
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
