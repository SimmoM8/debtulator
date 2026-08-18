# Debtulator shared UI and native iOS navigation

Debtulator has one application presentation shared by Android and iOS. Models,
controllers, screen JSX, cards, rows, forms, sections, loading states, and design
tokens are all cross-platform React Native code.

## Shared application UI

- Generic Expo Router route modules select the shared screens in `src/screens`.
- `src/theme/tokens.ts` is the canonical source for colours, spacing, typography,
  radii, shadows, and gradients. `src/constants/design.ts` is a compatibility
  re-export while feature imports migrate naturally.
- `src/components/ui` contains the canonical page, card, row, form, button,
  filter, empty-state, and finance primitives.
- A screen feature must not create an iOS copy of its content. If a platform
  route file is required, it delegates to the same shared screen component.

## Native iOS shell

Only native navigation and system presentation differ on iOS:

- `expo-router/unstable-native-tabs` owns the five primary tabs.
- Each tab retains its native nested Stack, large title, collapse behaviour,
  transparent compact header, back gesture, form sheets, and grabbers.
- `src/navigation/RootNavigator.ios.tsx` owns native root presentations.
- `src/components/ios/NativeNavigationStyle.tsx` owns native header appearance.
- `NativePageNavigation.ios.tsx`, `NativeCollectionHeader.ios.tsx`, and
  `NativeFormToolbar.ios.tsx` translate shared header/form metadata into native
  search and toolbar controls.
- The shared `Screen` uses automatic iOS content inset adjustment so its
  `ScrollView` remains connected to native large-title collapse and NativeTabs.

The generic versions of those navigation adapters render nothing. Android keeps
its existing application-rendered header and navigation while consuming the same
screen bodies and design system.

## Invariants

- No platform-specific duplicate screen bodies.
- No platform-specific cards, rows, sections, forms, or domain summaries.
- No app-content imports from `src/components/ios`.
- Platform checks are restricted to low-level system adapters such as navigation,
  safe-area/inset handling, native glass availability, and web-only fallbacks.
- The `react-native-screens` dependency and repository patch remain unchanged.
