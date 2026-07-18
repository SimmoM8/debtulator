# Debtulator iOS brand restoration QA

- Review date: 2026-07-19
- Branch: `feat/ios-brand-identity-restoration`
- Native baseline: `30aef3d`
- Simulator: iPhone 17 Pro, iOS 26.5

## Screenshot evidence

The before-restoration primary-screen evidence remains in
`docs/ios-native-screenshots`. The after-restoration evidence is in
`docs/ios-brand-screenshots` and includes:

- Home, Members, Debts, Groups and Settings in light and dark mode;
- Home at Accessibility XXXL and with Increase Contrast enabled;
- onboarding and authentication illustration treatments;
- an Android regression capture from the post-change release APK.

All after screenshots were captured from built applications, not design mocks.

## Visual review

| Surface | Result |
| --- | --- |
| Dashboard | Indigo financial hero restores the primary identity moment; mint/coral amounts retain text and directional symbols; native title, toolbar, list and tab bar remain intact |
| Members | Deterministic avatar, linked state and semantic balance hierarchy are legible in light and dark mode |
| Debts | Active-balance summary, amount direction and status badges are recognisably Debtulator without replacing native list/search/navigation behavior |
| Groups | Branded group identity and a purposeful empty state return while the collection remains a native searchable list |
| Settings | Account identity is branded but the rest of the screen remains a restrained system Settings composition |
| Details | Member, debt, group, expense, payment and settlement screens use a consistent branded summary followed by native information sections |
| Analytics | Native chart marks and legend use the semantic Debtulator chart/status roles |
| Auth/onboarding/privacy | Existing orbit and shield artwork is used selectively inside native form/list content |

No visual review found clipped labels, duplicate headers, route filenames, fake
navigation, fake tabs or controls obscured by the home indicator.

## Native behavior and accessibility

- NativeTabs, nested Stacks, toolbar menus, search bars, sheets, forms and
  confirmation dialogs were not replaced or wrapped by React Native replicas.
- Tab selection, independent stack retention and native reselect behavior were
  exercised on the simulator; the navigation implementation is unchanged from the
  native baseline evidence in `docs/ios-native-screenshots`.
- Branded navigation rows use native plain `Button` behavior and a 52-point minimum
  height. Standard controls retain their system hit regions.
- Accessibility XXXL makes the dashboard metrics stack vertically and the content
  remains scrollable without a fixed-height text exception.
- Increase Contrast and both system appearances use authored dynamic semantic
  colors. Financial state is never communicated by color alone.
- Branded content surfaces are opaque and do not depend on blur, transparency or
  motion for meaning, so Reduce Transparency and Reduce Motion preserve content.
- Branded summaries expose combined VoiceOver labels; interactive rows expose
  labels and hints; decorative avatars are hidden from the accessibility tree.
- A complete spoken VoiceOver traversal and physical-device edge-swipe remain
  release-candidate manual QA rather than automated checks in this repository.

## Repository and build checks

Passed:

- `npm run quality` — TypeScript, Expo ESLint and Jest (2 tests)
- `npx expo install --check`
- `npx expo-doctor` — 21/21 checks
- iOS Release build and launch:
  `npx expo run:ios --device "iPhone 17 Pro" --configuration Release --no-bundler`
- Android release APK with Node 20.20.2:
  `NODE_ENV=production ./gradlew --no-daemon assembleRelease`
- Web static export: `npx expo export --platform web`

The Android APK rendered the existing React Native/Material dashboard unchanged.
Web initially exposed the pre-existing missing Metro `wasm` asset classification
for Expo SQLite; adding `wasm` to `metro.config.js` made the static export pass. The
in-app browser surface was unavailable for an additional interactive web screenshot,
so web verification consists of the successful production export and the absence of
web/generic presentation changes.

## Static architecture scan

- Exactly one SwiftUI `Host` declaration remains:
  `src/components/ios/NativeScreen.tsx`.
- No `matchContents` or `RNHostView` is used by the native screens.
- No iOS presentation imports `Pressable`, `Touchable*`, React Native `TextInput`,
  React Native `Switch`, `BlurView`, `GlassView`, `PageHeader`, the old custom tab
  bar or Ionicons.
- No raw hex colors, fixed font sizes or custom font families are used in the native
  branded screen/component layer.

## Remaining limitations

- The illustration PNGs are native-compatible raster exports of the existing brand
  SVG artwork; a future asset-catalog/vector pipeline could improve scaling and
  binary size without changing screen architecture.
- Spoken VoiceOver output, hardware keyboard behavior and physical-device gestures
  should receive the normal release-candidate pass on supported hardware.
