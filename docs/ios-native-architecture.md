# Debtulator native iOS architecture

Debtulator uses a shared application core with platform-specific presentation.
Native iOS integration and Debtulator branding are complementary architecture
choices, not competing ones.

## Shared application core

Models, repositories, local database access, sync, services, authentication and
`AppDataProvider` remain TypeScript shared code. A behavioral change belongs here
when both platform presentations should receive it.

## iOS presentation

- Expo Router `.ios.tsx` route modules select native iOS screens.
- `expo-router/unstable-native-tabs` owns primary tab navigation.
- Each tab owns a nested native Stack.
- `src/components/ios/NativeScreen.tsx` provides the single full-viewport SwiftUI
  `Host` boundary for each complete screen.
- `src/screens/ios` composes `@expo/ui/swift-ui` components.
- `src/components/ios` contains semantic native and Debtulator-specific content
  compositions.
- `src/theme/iosBrand.ios.ts` supplies appearance-aware brand roles and app tint.

The native layer owns interaction. Debtulator brand components style financial and
identity content inside that layer; they do not recreate platform controls.

## Android and web presentation

Generic `.tsx` routes continue to use the existing React Native/Material screen
implementations. Android geometry, typography and component structure are not
derived from the iOS token layer. `src/theme/androidBrand.ts` only identifies the
shared source palette and does not change Android presentation by itself.

New cross-platform features should use a shared controller/service with separate
iOS and generic renderers. Presentation-specific colors and SwiftUI assumptions must
not enter shared business logic.

## Invariants

- One full-screen SwiftUI Host per native iOS screen.
- No React Native control replicas in iOS presentation code.
- No custom iOS tab bar or duplicate page header.
- Native toolbar, sheet, menu, search, form and back-swipe behavior remains intact.
- Brand color is concentrated in tint and domain content, not every surface.
- Android presentation remains independently testable.
