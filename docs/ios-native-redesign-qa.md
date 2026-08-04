# Debtulator iOS native redesign completion and QA record

- Date: 2026-07-18
- Migration branch: `redo/ios-native-design-system`
- Safety branch: `safety/pre-ios-native-redesign-20260718` at `e71f316`
- Stable presentation reference: `41c547f`

This document is the post-migration companion to
[`ios-native-redesign-audit.md`](./ios-native-redesign-audit.md). The audit records
the pre-migration state; this file records the resulting architecture, route
coverage, exceptions and verification evidence.

## Resulting iOS architecture

- iOS primary navigation is a five-item `expo-router/unstable-native-tabs` bar:
  Home, Members, Debts, Groups and Settings.
- Every tab owns a nested native `Stack`. Switching tabs retains each stack;
  reselecting the active tab pops that stack to its root using native behavior.
- Collection roots use native large titles, native search where applicable,
  native toolbar actions, `List` and `Section`.
- Details use compact native titles, system back controls, toolbar actions and
  menus, native grouped lists and confirmation dialogs.
- Add/edit and keyboard-focused tasks use native form-sheet presentation with a
  grabber, native Cancel/Save toolbar actions, `Form` and `Section`.
- Every iOS screen crosses the React Native/SwiftUI boundary exactly once through
  `NativeScreen`: one full-viewport `Host`, `style={{ flex: 1 }}` and
  `useViewportSizeMeasurement`.
- No iOS route imports the legacy custom page header, glass surface, custom tab
  bar, React Native text input/switch/modal/pressable controls, `expo-blur` or
  `expo-glass-effect`.
- Ordinary iOS text uses native semantic text styles and system Dynamic Type.
  System semantic colors own content surfaces; Debtulator purple is the seed tint.
- The old `GlassBottomTabBar` and the three isolated SwiftUI control hosts were
  removed. Android/shared legacy presentation primitives remain only for the
  existing non-iOS presentation path.

At accessibility font scales where five visible system tab labels would collide,
the native tab bar switches to icons while retaining explicit, human-readable
accessibility labels for every item. At ordinary sizes all five visual labels are
shown.

## Complete route migration inventory

All 38 audited user-facing routes have a complete native iOS principal
composition. Compatibility aliases keep existing external/internal URLs working;
normal in-app navigation uses the nested tab-stack destinations.

| Existing route | Native iOS owner/destination | Principal composition |
| --- | --- | --- |
| `/` | Home tab root | Native dashboard list/sections and toolbar add menu |
| `/members` | Members tab root | Searchable native list and add toolbar action |
| `/debts` | Debts tab root | Searchable native list, filter menu and add action |
| `/groups` | Groups tab root | Searchable native list and add action |
| `/requests` | Home stack → Requests | Native request sections and approval buttons |
| `/settings` | Settings tab root | Native grouped settings list |
| `/member/[id]` | Members stack → Member detail | Native grouped detail list, edit/menu toolbar |
| `/member/form` | Members stack form sheet | Native member `Form` |
| `/debt/[id]` | Debts stack → Debt detail | Native grouped detail and payment/menu actions |
| `/debt/form` | Debts stack form sheet | Native debt `Form`, pickers and date controls |
| `/debt/history` | Debts stack → Settled Debts | Native history list |
| `/group/[id]` | Groups stack → Group detail | Native grouped members/expenses/debts/settlements |
| `/group/form` | Groups stack form sheet | Native group `Form` |
| `/expense/[id]` | Groups stack → Expense detail | Native grouped detail and related records |
| `/expense/form` | Groups stack form sheet | Native shared-expense `Form` |
| `/attachment/[id]` | Groups stack → Attachment | Native attachment detail/share/removal controls |
| `/payment/[id]` | Debts stack → Payment detail | Native grouped payment detail |
| `/payment/form` | Debts stack form sheet | Native payment `Form` and confirmation |
| `/settlement/[id]` | Debts/Groups stack → Settlement | Native settlement detail list |
| `/recurring` | Settings stack → Recurring Records | Native recurring-record list |
| `/recurring/form` | Settings stack form sheet | Native recurring-record `Form` |
| `/activity` | Home stack → Activity | Native activity list and filter controls |
| `/analytics` | Home stack → Insights | Native filters, Swift Chart and summary sections |
| `/suggestions` | Home stack → Suggestions | Native suggestion list and actions |
| `/auth` | Root native form sheet | Native sign-in/sign-up/reset `Form`, SecureField |
| `/first-run` | Root onboarding stack | Native first-run `Form` |
| `/notifications` | Settings stack → Notifications | Native notification list and toolbar action |
| `/sync` | Settings stack → Sync Status | Native sync/status sections and queue actions |
| `/conflicts` | Settings stack → Conflict Center | Native conflict list |
| `/conflict/[id]` | Settings stack → Conflict Review | Native comparison and resolution actions |
| `/backup` | Settings stack → Backup & Restore | Native backup/restore `Form` and dialog |
| `/export` | Settings stack → Import & Export | Native export options and system sharing |
| `/full-export` | Settings stack → Full Data Export | Native export `Form` and system sharing |
| `/import-csv` | Settings stack form sheet | Native file selection, preview and import controls |
| `/privacy` | Settings stack → Privacy | Native grouped toggles |
| `/delete-account` | Settings stack → Delete Account | Native destructive `Form` and confirmation |
| `/language` | Settings stack → Language | Native language selection list |
| `/accessibility` | Settings stack → Accessibility & Help | Native accessibility/about sections |

## Native screen and semantic component layer

The iOS semantic layer lives in `src/components/ios`:

- `NativeScreen`, `NativeListScreen`, `NativeFormScreen`
- `NativeToolbarActions`, `NativeRows`, `NativeFormControls`
- `NativeEmptyState`, `NativeLoadingState`, `NativeErrorState`
- `NativeCurrencyText`, `NativeMemberRow`, `NativeDebtRow`
- `NativeConfirmationDialog`, `NativeErrorBoundary`

These components compose Expo UI SwiftUI primitives. They do not reproduce system
visuals with React Native views.

## Exceptions

### RNHostView and native bridges

None. The analytics route uses Expo UI's native Swift Chart, so no React Native
chart host is required. Token/tag input is represented by a native text field and
native explanatory/validation rows; no custom visual bridge was necessary.

### Nonvisual React Native/service interop

- `useColorScheme` supplies the root native navigation theme.
- `useWindowDimensions().fontScale` prevents native tab-label collisions at very
  large accessibility sizes while preserving each tab's accessibility label.
- React Native `Share` is used only as an operating-system file-share handoff for
  the generated full-data export. It renders no React Native presentation.
- Expo Document Picker and FileSystem remain service handoffs for import/export.

### Android-only/shared legacy UI

The existing React Native screens, `PageHeader`, `GlassSurface`, fonts and custom
form controls remain because Android retains its current presentation. ESLint
prevents iOS route/screen code from importing that legacy presentation path.

## Screenshot evidence

Primary routes, light mode:

- `home-light.png`
- `members-light.png`
- `debts-light.png`
- `groups-light.png`
- `settings-light.png`

Primary routes, dark mode:

- `home-dark.png`
- `members-dark.png`
- `debts-dark.png`
- `groups-dark.png`
- `settings-dark.png`

Additional evidence includes native member/debt details, the member form sheet,
keyboard presentation, analytics/Swift Chart, privacy toggles, increased contrast,
maximum accessibility text size, tab-stack retention, tab reselect-to-root and
native sheet cancellation. Narrow/large iPhone first-run captures and the Android
regression capture are also included. All files are under
`docs/ios-native-screenshots`.

## Manual simulator QA

Verified on an iPhone 17 Pro simulator running iOS 26.5:

- five native system tabs with SF Symbols and explicit labels;
- native large and compact titles with no filesystem route names;
- no duplicate headers;
- light and dark semantic appearance on every primary tab;
- native list, search, grouped form, toggle, menu and toolbar presentation;
- native member form sheet with grabber, disabled Save state and Cancel dismissal;
- software-keyboard presentation without a collapsed Host or obscured toolbar;
- native system back controls on member, debt, analytics and privacy routes;
- independent tab-stack retention;
- reselecting the Members tab pops its stack to Members root;
- native Swift Chart rendering;
- accessibility text reflow at `accessibility-extra-extra-extra-large`;
- increased-contrast semantic presentation;
- primary content remains above the home indicator and scrolls behind the floating
  native tab/navigation layers.

The same Release binary was installed and visually verified on the iOS 26.5 iPhone
17e and iPhone 17 Pro Max simulators. The narrow and large layouts both render
without clipping, overlap or unsafe-area regressions.

Android regression QA used a Pixel 9 emulator running Android 17. The Release build
installed and launched successfully, retained the existing React Native/Material
dashboard and navigation, and showed no fatal runtime errors.

## Automated verification

Run from the repository root:

```sh
npx expo install --check
npx expo-doctor
npm run typecheck
npm run lint
npm test -- --runInBand
npx expo export --platform ios --output-dir /tmp/debtulator-ios-native-export
npx expo export --platform android --output-dir /tmp/debtulator-android-regression-export
npx expo run:ios --device "iPhone 17 Pro" --configuration Release --no-bundler
npx expo run:android --variant release --no-bundler
```

Expected current results:

- Expo dependency check: pass
- Expo Doctor: 21/21 checks pass
- TypeScript: pass
- ESLint, including iOS presentation import restrictions: pass
- Jest: 1 suite, 2 tests pass
- iOS production bundle: pass
- Android production bundle: pass
- iOS simulator Release build: pass, 0 errors
- Android emulator Release build: pass (`BUILD SUCCESSFUL`)
- iPhone 17e and iPhone 17 Pro Max Release launch/visual checks: pass
- Pixel 9 Android 17 Release launch/visual regression check: pass

The native builds currently report only generated-project/dependency warnings,
including Expo Dev Launcher's dependency-analysis warning. None is an application
compile failure.

## Reproducing the native iOS build

```sh
npm install
npx expo install --check
cd ios && pod install && cd ..
npx expo run:ios --device "iPhone 17 Pro" --configuration Release --no-bundler
```

If CocoaPods was generated against the older Expo modules in an existing checkout,
update the two compatible Expo module pods once before building:

```sh
cd ios
pod update ExpoModulesCore ExpoModulesWorklets --no-repo-update
cd ..
```

No commit was created. Release sign-off still requires any project-specific real
device, spoken VoiceOver-output, physical edge-swipe, backend-environment and
destructive-account-flow checks the maintainer chooses to run; the prompt explicitly
prohibits committing before that review. Simulator inspection covered accessible
labels, Dynamic Type layout and native Stack construction, but does not replace
those hardware/assistive-technology checks.
