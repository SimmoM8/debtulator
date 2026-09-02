// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const sourceFiles = "**/*.{js,jsx,ts,tsx}";

/*
 * Retired pre-refactor architecture.
 *
 * These directories should no longer be imported from anywhere in src/.
 * New code belongs under app, components, database, features, lib, or theme.
 */
const retiredDirectories = [
  "application",
  "domain",
  "infrastructure",
  "platform",
  "presentation",
  "composition",
  "dto",
];

function srcPatterns(directory) {
  return [`@/src/${directory}`, `@/src/${directory}/**`];
}

const retiredPatterns = [
  {
    group: retiredDirectories.flatMap(srcPatterns),
    message:
      "This import targets the retired layered architecture. Move/import the code from src/app, src/components, src/database, src/features, src/lib, or src/theme instead.",
  },
  {
    group: [
      "@/components",
      "@/components/**",
      "@/constants",
      "@/constants/**",
      "@/hooks",
      "@/hooks/**",
    ],
    message:
      "This root alias is legacy. Import the canonical module under @/src instead.",
  },
];

const frameworkPatterns = [
  "react",
  "react/**",
  "react-native",
  "react-native/**",
  "react-native-*",
  "expo",
  "expo/**",
  "expo-*",
  "@expo/**",
  "@supabase/**",
];

function restrictedImports(patterns = []) {
  return [
    "error",
    {
      patterns: [...retiredPatterns, ...patterns],
    },
  ];
}

module.exports = defineConfig([
  expoConfig,

  {
    ignores: ["dist/**"],
  },

  /*
   * Baseline rule for every source file.
   * This mainly prevents accidentally reintroducing the old architecture.
   */
  {
    files: [`src/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports(),
    },
  },

  /*
   * Shared components are feature-agnostic UI.
   *
   * They may depend on:
   * - other shared components
   * - theme
   * - lib
   * - React / React Native / Expo UI APIs
   *
   * They must not know about product features, routing, or persistence.
   */
  {
    files: [`src/components/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [
            ...srcPatterns("app"),
            ...srcPatterns("database"),
          ],
          message:
            "Shared components must stay feature-agnostic. Depend only on shared components, theme, lib, and external UI APIs.",
        },
      ]),
    },
  },

  /*
   * Database owns shared SQLite setup/lifecycle only.
   *
   * It must not depend on product features or presentation code.
   */
  {
    files: [`src/database/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [
            ...srcPatterns("app"),
            ...srcPatterns("components"),
            ...srcPatterns("features"),
            ...srcPatterns("theme"),
          ],
          message:
            "Database infrastructure must stay independent of routes, features, shared UI, and theme.",
        },
      ]),
    },
  },

  /*
   * lib contains generic utilities/value helpers.
   *
   * It should not acquire product, UI, routing, or persistence knowledge.
   */
  {
    files: [`src/lib/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [
            ...srcPatterns("app"),
            ...srcPatterns("components"),
            ...srcPatterns("database"),
            ...srcPatterns("features"),
            ...srcPatterns("theme"),
          ],
          message:
            "lib must remain generic. It must not depend on app routes, features, UI, database infrastructure, or theme.",
        },
      ]),
    },
  },

  /*
   * Theme is a shared design-system boundary.
   *
   * React Native / Expo UI APIs are valid here because the theme intentionally
   * adapts to native platform semantics.
   */
  {
    files: [`src/theme/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [
            ...srcPatterns("app"),
            ...srcPatterns("components"),
            ...srcPatterns("database"),
            ...srcPatterns("features"),
          ],
          message:
            "Theme must remain a shared design-system boundary and must not depend on routes, features, shared components, or persistence.",
        },
      ]),
    },
  },

  /*
   * Feature model code is the purest part of a feature.
   *
   * It may depend on generic lib helpers, but not React/native/vendor SDKs,
   * routing, shared UI, database infrastructure, or theme.
   */
  {
    files: [`src/features/*/model/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [
            ...srcPatterns("app"),
            ...srcPatterns("components"),
            ...srcPatterns("database"),
            ...srcPatterns("theme"),
          ],
          message:
            "Feature model code must stay UI- and infrastructure-independent. Keep it to feature logic/types plus generic lib helpers.",
        },
        {
          group: frameworkPatterns,
          message:
            "Feature model code must be framework-independent. Move React/native/Expo/vendor behavior to hooks, data, state, components, or screens.",
        },
      ]),
    },
  },

  /*
   * Feature data code owns persistence adapters/mappers/repositories.
   *
   * It may depend on the shared database layer and its own feature model,
   * but it must not depend on routes or UI.
   */
  {
    files: [`src/features/*/data/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [
            ...srcPatterns("app"),
            ...srcPatterns("components"),
            ...srcPatterns("theme"),
          ],
          message:
            "Feature data code is a persistence boundary. It must not depend on routes or UI/theme modules.",
        },
      ]),
    },
  },

  /*
   * Feature hooks coordinate React state with feature data/model code.
   *
   * Hooks may use React, Expo/native APIs where the operation genuinely needs
   * them, database access, auth, and feature repositories. They should not
   * depend on route files or screen/component implementations.
   */
  {
    files: [`src/features/*/hooks/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [...srcPatterns("app")],
          message:
            "Feature hooks must not depend on route files. Keep navigation and route composition in screens/app.",
        },
      ]),
    },
  },

  /*
   * Feature state providers own temporary/shared state for a feature flow.
   * They may use React and feature model/lib helpers, but not app route files.
   */
  {
    files: [`src/features/*/state/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [...srcPatterns("app")],
          message:
            "Feature state must not depend on route files. Route-specific navigation belongs in screens/app.",
        },
      ]),
    },
  },

  /*
   * Feature components are feature-specific presentation pieces.
   * They may use shared components/theme and their own feature types.
   * They must not import route files.
   */
  {
    files: [`src/features/*/components/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [...srcPatterns("app")],
          message:
            "Feature components must not depend on route files. Route/navigation composition belongs in screens/app.",
        },
      ]),
    },
  },

  /*
   * Feature screens are orchestration boundaries.
   *
   * They are intentionally allowed to use Expo Router, feature hooks/state,
   * shared components, theme, and model code.
   */
  {
    files: [`src/features/*/screens/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [...srcPatterns("app")],
          message:
            "Feature screens may navigate with Expo Router, but must not import route modules from src/app.",
        },
      ]),
    },
  },

  /*
   * app is the composition/navigation boundary.
   *
   * Route files may compose feature screens/providers plus shared UI/theme,
   * but should not reach directly into persistence infrastructure.
   */
  {
    files: [`src/app/${sourceFiles}`],
    rules: {
      "no-restricted-imports": restrictedImports([
        {
          group: [...srcPatterns("database")],
          message:
            "Routes should compose features and shared UI, not access SQLite/database infrastructure directly.",
        },
      ]),
    },
  },
]);