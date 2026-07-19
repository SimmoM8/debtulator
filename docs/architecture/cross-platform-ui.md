# Cross-Platform UI Architecture

This document defines the navigation and screen architecture for Debtulator.

## Core rules

1. Keep one shared root bootstrap in app/_layout.tsx.
2. Keep platform navigation differences in src/navigation/RootNavigator.tsx and src/navigation/RootNavigator.ios.tsx.
3. Keep app/ route files minimal. Route files should only re-export a platform-resolved route module or return a Redirect for legacy paths.
4. Keep canonical feature routes inside tab stacks. Legacy top-level duplicates must Redirect to canonical tab routes.
5. Preserve nested stack ownership for Home, Members, Debts, Groups, and Settings.
6. Put calculations and screen state in feature screen-model hooks. View files should focus on rendering.
7. Native iOS screens must have one screen-level SwiftUI Host boundary (via NativeScreen). Never place Host inside FlatList/SectionList rows.
8. Each screen has one owner for navigation/header, one owner for scrolling, and one owner for content insets.
9. Keep NativeTabs isolated to app/(tabs)/_layout.ios.tsx. Do not manually position iOS tab affordances or floating action buttons.
10. Use native toolbar actions for iOS collection actions.
11. Preserve Android and web behavior while evolving iOS-native composition.

## Members reference slice

Members is the reference vertical slice for this architecture.

- Feature state and calculations:
  - src/features/members/useMembersScreenModel.ts
  - src/features/members/useNativeMembersScreenModel.ts
- Route modules:
  - src/features/members/routes/*
- Canonical routes:
  - app/(tabs)/members/index(.ios).tsx
  - app/(tabs)/members/member/[id](.ios).tsx
  - app/(tabs)/members/member/form(.ios).tsx
- Legacy redirects:
  - app/member/[id](.ios).tsx
  - app/member/form(.ios).tsx

## Practical checklist for new screens

- Create feature screen-model hook under src/features/<feature>/.
- Keep route files in app/ as re-exports or Redirect-only wrappers.
- Ensure list screens own the only scroll container.
- Keep header composition in the navigator owner or native Stack primitives.
- Avoid introducing platform conditionals in app/ route files.
