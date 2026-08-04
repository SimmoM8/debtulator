# Debtulator iOS native redesign audit

> This file preserves the required pre-edit audit. The implemented route inventory,
> exceptions, screenshots and verification results are recorded in
> [`ios-native-redesign-qa.md`](./ios-native-redesign-qa.md).

- Audit date: 2026-07-18
- Working branch: `redo/ios-native-design-system`
- Safety branch: `safety/pre-ios-native-redesign-20260718`
- Safety commit: `e71f316` (`Refine liquid glass switchers and buttons`)
- Presentation reference baseline: `41c547f` (`refactor: modernize debt detail page layout and UI components`)

## Authority and scope

This audit was completed before presentation-layer migration work. The implementation order of authority is:

1. Apple Human Interface Guidelines and Apple platform documentation.
2. Expo SDK 56 documentation for Expo Router and `@expo/ui`.
3. [The iOS 26 Design Guidelines: An Illustrated Guide](https://www.learnui.design/blog/ios-design-guidelines-templates.html).

Key source findings:

- The article distinguishes a floating navigation/control layer from the content layer. Liquid Glass belongs primarily to native bars, menus, toolbars and important floating controls; lists, forms, rows and data content remain standard content surfaces.
- Apple states that apps compiled with the current SDK receive the updated appearance through standard system components. Apple recommends auditing screen by screen, preferring standard controls and limiting custom Liquid Glass to important custom interactive elements.
- Expo Router native tabs use the platform tab bar. Tab triggers require explicit labels to prevent route names from becoming user-facing labels. Tapping the selected tab pops its stack to the root by default.
- Expo SDK 56 documents `@expo/ui` `~56.0.22`. A full-screen SwiftUI composition belongs in one `Host` with `style={{ flex: 1 }}` and `useViewportSizeMeasurement`. `matchContents` must not be used on a `Form`, `List`, `ScrollView` or another flexible scrolling axis.

At audit time the repository combined Expo SDK `56.0.12` with `@expo/ui` `57.0.7`.
That incompatible dependency was subsequently corrected through Expo's installer;
the completion record documents the SDK 56-aligned result.

## Stable baseline and partial migration boundary

`41c547f` is the last commit before the 2026-07-18 partial native/glass sequence began. It is the visual-behaviour reference for preserving product functionality, not a revision to restore wholesale. The partial sequence begins with `4529961` (`feat(ui): add cross-platform native glass surface`) and includes:

- `GlassSurface` and semantic glass roles applied to ordinary content cards and controls;
- `expo-glass-effect` use for content surfaces;
- a first attempt at native tabs without a per-tab stack architecture;
- a React Native floating add layer and custom modal rendered over native tabs;
- isolated `Host` instances in `Button.ios.tsx`, `TextField.ios.tsx` and `Menu.ios.tsx`;
- custom `PageHeader` and collection headers retained beneath a root stack whose native headers are disabled;
- a temporary `app/member/form.ios.tsx` mixed implementation created by `93c1100` and deleted by `a386be0`.

The migration must preserve all business logic and product functionality introduced after `41c547f`, including confirmation workflows, realtime notifications, avatar configuration and current data/reset behaviour.

## Current navigation architecture

- Root: one Expo Router `Stack` in `app/_layout.tsx`, with `headerShown: false` for every route.
- Primary iOS navigation: `NativeTabs` in `app/(tabs)/_layout.tsx`.
- Visible tabs: Home, Members, Debts and Groups.
- Hidden tab routes: Requests and Settings. Expo documents that a hidden native-tab trigger cannot be navigated to, so this is an architectural risk even though code pushes these paths.
- The tab layout has no nested stack per tab. All detail and form routes live in the root stack, so each tab does not own and retain an independent navigation path.
- A React Native floating add button and a custom `Modal` action sheet are layered over the native tab bar.
- All root-stack native headers are disabled. Product screens render custom purple `PageHeader`, `CollectionPageHeader`, or dashboard header content inside the screen.
- Root route titles are not explicitly registered, creating a route-name exposure risk when a native header appears due to a configuration or transition change.

## Route-by-route inventory

Render classifications:

- **RN**: principal screen content and controls are React Native.
- **Mixed**: principal screen remains RN but can reach one of the isolated SwiftUI `Host` wrappers.
- No route is currently a complete SwiftUI screen.

The “primitives” column lists current shared presentation primitives in addition to ordinary React Native `Text` and `View` usage.

| Route | Current navigator | Current header | Render | Shared primitives and custom UI | Migration destination | Main risks |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Home NativeTab; no owned Stack | Custom dashboard header row in `Screen` | RN | `Screen`, `GlassCard`, `GlassSurface`, `IconButton`, `SectionTitle`, `SectionActionLink`, `ActivityTimelineRow`, `AppMenuButton`, custom quick-action tiles | Home tab native Stack root; large native title or native toolbar identity/actions; complete SwiftUI `ScrollView`/`List` | Custom safe area, glass content, modal activity detail, fixed grids, manual typography, no dark semantic palette |
| `/members` | Members NativeTab; no owned Stack | `CollectionPageHeader` with custom title/search/actions | Mixed | `CollectionPageControls`, `FilterSheet`, `GlassCard`, `StatCard`, `MobileMenuModal`, `MemberAvatar`, custom rows | Members tab Stack root; native large title, searchable list, toolbar add/menu, native filter menu/sheet | Search keyboard, custom sheet, small fixed summary layout, custom row tap semantics |
| `/debts` | Debts NativeTab; no owned Stack | `CollectionPageHeader` | Mixed | `CollectionPageControls`, `DebtLedgerSection`, `FilterSheet`, `GlassCard`, `MobileMenuModal`, custom rows | Debts tab Stack root; native large title, searchable `List`/`Section`, toolbar add/filter, native rows/swipe actions | Search keyboard, custom filters/sheets, content obscured by overlaid controls |
| `/groups` | Groups NativeTab; no owned Stack | `CollectionPageHeader` | Mixed | `CollectionPageControls`, `FilterSheet`, `GlassCard`, `StatCard`, `MobileMenuModal`, custom Pressable rows | Groups tab Stack root; native large title, searchable `List`, toolbar add/filter/menu | Search keyboard, custom modal, fixed summary row, custom tap/accessory semantics |
| `/requests` | Hidden NativeTab; no owned Stack | Custom root `PageHeader` and `AppMenuButton` | RN | `SlidingSectionSwitcher`, `GlassCard`, `RequestCard`, `Button`, custom search | Visible Inbox tab or routable nested Stack destination; native title/search/picker/list and toolbar | Hidden trigger is documented as non-navigable; custom tabs/search; many approval alerts |
| `/settings` | Hidden NativeTab; no owned Stack | Custom root `PageHeader` and `AppMenuButton` | RN | `GlassCard`, `SettingsRow`, `StatCard`, `Button`, `SectionTitle` | Settings native Stack root, preferably fifth visible tab; native grouped `List`/`Form` and confirmation dialogs | Hidden trigger, custom rows, destructive multi-alert flow, hard-coded light appearance |
| `/member/[id]` | Root Stack | Custom `PageHeader` with fake back/action | RN | `DebtLedgerSection`, `EntityRows`, `GlassSurface`, `MemberAvatar`, `MobileMenuModal`, `TagInput`, `SlidingSectionSwitcher`, direct `Modal`, `Pressable`, `TextInput` | Members Stack detail; compact native title, toolbar menu/edit, native list sections and sheets | Duplicated back strategy, custom modals/dropdown, inline editing keyboard, 1,007-line layout |
| `/member/form` | Root Stack | Custom `PageHeader`; submit in custom footer | RN | `Card`, `TextField`, `TagInput`, `GlassSurface`, direct `Pressable` | Native sheet/Stack form using one `Host` + `Form`; Cancel/Save toolbar | Keyboard, linked-profile search, validation, custom fixed footer, tag choice may need native bridge |
| `/debt/[id]` | Root Stack | Custom `PageHeader` with fake back/menu | RN | `GlassCard`, `GlassSurface`, `Card`, `SlidingSectionSwitcher`, `ActivityTimelineRow`, `MemberAvatar`, `MobileMenuModal`, `TagInput`, `DatePickerField`, direct `Modal`, `Pressable`, `TextInput` | Debts Stack detail; native compact title, toolbar/menu, native list sections, sheets and dialogs | 3,557-line screen, multiple nested custom modals, keyboard note edit, custom selector and back path |
| `/debt/form` | Root Stack | Custom `PageHeader`; submit in custom footer | RN | `Card`, `TextField`, `DropdownSelect`, `DatePickerField`, `CurrencySelect`, `TagInput`, direct `Pressable` | Native sheet/Stack `Form`; native fields, pickers/date picker, Cancel/Save toolbar | Largest form, conditional validation, keyboard, dynamic participants, custom dropdown/tag UI |
| `/debt/history` | Root Stack | Custom `PageHeader` | RN | `GlassCard`, `EmptyState`, custom activity/history rows | Debts Stack collection; native compact title and `List`/`Section` | Custom row navigation/accessories and manual typography |
| `/group/[id]` | Root Stack | Custom `PageHeader` with fake back/menu | RN | `AnalyticsCards`, `AttachmentsSection`, `CommentsSection`, `EntityRows`, `GlassSurface`, `MainActionsBar`, `MobileMenuModal`, `SegmentedControl`, `SelectChips`, `TextField`, direct `Pressable` | Groups Stack detail; native list/scroll sections, toolbar menu, sheets, segmented picker | 1,874-line screen, inline edit keyboard, custom tabs/modals, complex attachments/comments |
| `/group/form` | Root Stack | Custom `PageHeader`; submit in custom footer | RN | `Card`, `TextField`, `CurrencySelect`, `MemberMultiSelect`, `TagInput` | Native sheet/Stack `Form`; toolbar Cancel/Save; native member picker screen | Custom searchable member modal, tag entry, keyboard, validation |
| `/expense/[id]` | Root Stack | Custom `PageHeader` and fake edit action | RN | `AttachmentsSection`, `CommentsSection`, `Card`, `SelectChips`, `Button`, `IconButton` | Groups Stack detail; native compact title, toolbar edit/menu, list sections | Attachment/photo actions, comments editing, alert confirmation, custom choice chips |
| `/expense/form` | Root Stack | Custom `PageHeader`; submit in custom footer | RN | `Card`, `TextField`, `SelectChips`, `MultiSelectChips`, `TagInput` | Native sheet/Stack `Form`; native fields/pickers; participant picker screen | Keyboard-heavy dynamic splits and validation; custom tag/multi-select controls |
| `/attachment/[id]` | Root Stack | Custom `PageHeader` | RN | `Card`, `Button`, image preview, badges | Groups Stack detail/sheet; native compact title, list/scroll content and toolbar actions | Image sizing, empty/error states, archive alert, VoiceOver image description |
| `/payment/[id]` | Root Stack | Custom `PageHeader` | RN | `AttachmentsSection`, `CommentsSection`, `Card`, badges, money text | Debts Stack detail; native compact title, grouped list, toolbar actions | Attachments/comments and custom fixed card geometry |
| `/payment/form` | Root Stack | Custom `PageHeader`; submit in custom footer | RN | `Card`, `TextField`, `SelectChips`, `MultiSelectChips`, badges | Native sheet/Stack `Form`; toolbar Cancel/Record | Keyboard, amount validation, debt/member multi-selection, alert errors |
| `/settlement/[id]` | Root Stack | Custom `PageHeader` | RN | `AttachmentsSection`, `CommentsSection`, `Card`, badges | Groups Stack detail; native grouped list and toolbar actions | Attachment/comment interop, custom cards, long text at Dynamic Type |
| `/recurring` | Root Stack | Custom `PageHeader` with inline add button | RN | `Card`, `Button`, badges, empty/loading | Settings/Tools Stack collection; native list and toolbar add | Custom row/action semantics and fixed decorative header |
| `/recurring/form` | Root Stack | Custom `PageHeader`; submit in custom footer | RN | `Card`, `TextField`, `SelectChips` | Native sheet/Stack `Form`; native frequency picker and toolbar Save/Cancel | Keyboard, validation, Alert-based errors |
| `/activity` | Root Stack | Custom `PageHeader` with custom menu button | RN | `ActivityTimelineRow`, `FilterSheet`, `SlidingSectionSwitcher`, `GlassCard`, `IconButton` | Home Stack collection; native title, list, search/filter menu/sheet | Activity detail is a custom modal; custom filter controls and reading order |
| `/analytics` | Root Stack | Custom `PageHeader` with export button | RN | `AnalyticsCards`, `Card`, `TextField`, badges, illustration | Home/Tools Stack ScrollView/List; native toolbar export; charts as documented RNHostView only if retained | Chart/accessibility rendering, range field keyboard, decorative fixed dimensions |
| `/suggestions` | Root Stack | Custom `PageHeader` | RN | `Card`, `Button`, badges, illustration | Home/Tools Stack native list with toolbar/menu actions | Custom cards, navigation accessories, empty state |
| `/auth` | Root Stack | Custom `PageHeader`; submit in custom footer | RN | `AuthFlowVisuals`, `Card`, `TextField`, `DropdownSelect`, `SegmentedControl`, `Button` | Modal native Stack and full-screen SwiftUI `Form`; SecureField, Picker, toolbar dismiss | Keyboard-heavy, secure entry, small-screen branching, fixed artwork, authentication errors |
| `/first-run` | Root Stack | Custom no-back `PageHeader`; custom footer | RN | `AuthFlowVisuals`, `Card`, `TextField`, `CurrencySelect`, `Button` | Full-screen native onboarding Stack/Form, explicit no-back flow | Keyboard, 390pt/SE layout, fixed illustration sizing, startup route gating |
| `/notifications` | Root Stack | Custom `PageHeader` and inline mark-all action | RN | `Card`, `Button`, `SegmentedControl`, badges, direct `Pressable` | Settings Stack native list with toolbar mark-all and native picker/filter | Custom rows, VoiceOver state, custom segmented control |
| `/sync` | Root Stack | Custom `PageHeader` with conflicts button | RN | `Card`, `Button`, badges, illustration | Settings Stack grouped list with native toolbar/menu and dialogs | Alert-heavy operations, long diagnostics, custom status cards |
| `/conflicts` | Root Stack | Custom `PageHeader` | RN | `Card`, `Button`, badges, illustration | Settings Stack collection `List`; native rows and empty state | Custom row navigation, diagnostic text, status semantics |
| `/conflict/[id]` | Root Stack | Custom `PageHeader` | RN | `Card`, `Button`, badges, direct `Alert`, monospaced comparison text | Settings Stack detail; native grouped list and confirmation dialog | Long payload text, destructive resolution, horizontal overflow/Dynamic Type |
| `/backup` | Root Stack | Custom `PageHeader` | RN | `Card`, `TextField`, `SelectChips`, `Button`, direct `Switch` | Settings Stack native `Form`; Toggle, Picker, native file actions | Keyboard passphrase, restore confirmation, file picker handoff |
| `/export` | Root Stack | Custom `PageHeader` with import button | RN | `Card`, `SelectChips`, `Button`, five direct `Switch` uses | Settings Stack native `Form`; Toggle/Picker, toolbar import/share | Multiple switches, share sheet, long option descriptions |
| `/full-export` | Root Stack | Custom `PageHeader` | RN | `Card`, `Button`, direct `Switch`, React Native `Share` | Settings Stack native `Form`; Toggle and share/export actions | Share handoff, destructive/privacy warning, long explanatory text |
| `/import-csv` | Root Stack | Custom `PageHeader` | RN | `Card`, `TextField`, `Button`, badges, illustration | Settings Stack native `Form`/List; document picker, preview section, toolbar import | File picker, parse errors, keyboard mapping field, large preview content |
| `/privacy` | Root Stack | Custom `PageHeader` | RN | `Card`, `SelectChips`, `Button`, direct `Switch` | Settings Stack native grouped `Form`; native toggles/pickers | Multiple privacy states, Reduce Transparency/contrast, custom switches |
| `/delete-account` | Root Stack | Custom `PageHeader` | RN | `Card`, `TextField`, `Button`, direct `Switch` and `Alert` | Settings Stack native destructive `Form`; Toggle, confirmation dialog, toolbar action | Destructive multi-step flow, keyboard confirmation, focus/read-order |
| `/language` | Root Stack | Custom `PageHeader` | RN | `Card`, `SelectChips`, illustration | Settings Stack native picker list | Dynamic Type/localized text expansion and custom chips |
| `/accessibility` | Root Stack | Custom `PageHeader` | RN | `Card`, badges, illustration, `SectionTitle` | Settings Stack native grouped list; system text styles and semantic labels | Current hard-coded typography and colors undermine the screen’s own subject |

## Shared UI primitive audit

### Custom iOS control imitations

| Existing primitive | Current implementation | Native destination |
| --- | --- | --- |
| `Screen` | RN `SafeAreaView`, gradients, manual insets, RN `ScrollView`, custom pull-to-refresh and floating/footer layers | One full-screen SwiftUI `Host`; native `List`, `Form` or `ScrollView`; native navigation owns bars/safe areas |
| `PageHeader` / `CollectionPageHeader` | RN title/back/search/action rows with Ionicons over a purple band | Expo Router native Stack title, large-title mode, toolbar/header items and native search |
| `GlassBottomTabBar` | Custom RN tab bar, still present as Android/shared legacy | Android-only legacy if needed; never imported by iOS routes |
| `GlassSurface` / `GlassCard` / `Card` | `GlassView` or styled RN surfaces applied to content | Standard native list/form/section content; no generic iOS glass card |
| `Button` / `IconButton` / `FloatingAddButton` | RN `Pressable` + Ionicons + `GlassSurface` | SwiftUI `Button`, system roles/styles, toolbar actions, SF Symbols |
| `TextField` / `SearchBar` / `SearchField` | RN `TextInput` in custom glass/border shells | SwiftUI `TextField`/`SecureField`; native searchable behaviour |
| `DropdownSelect` | RN `Modal`, search `TextInput`, Pressable rows | SwiftUI `Picker`/`Menu`; separate native picker screen for complex choices |
| `DatePickerField` | RN `Modal` wrapping a custom calendar | SwiftUI `DatePicker` |
| `SegmentedControl` / `SlidingSectionSwitcher` | Custom animated Pressable capsules | SwiftUI `Picker` with appropriate style or native filter menu |
| `SelectChips` / `MultiSelectChips` | RN button/chip rows | Picker, Toggle rows, native list with checkmarks, or dedicated picker screen |
| `FilterSheet` / `MobileMenuModal` | RN `Modal`, custom backdrop and card | Native menu, confirmation dialog or native sheet |
| `ActivityTimelineRow` detail | RN row plus custom `Modal` | Native row navigation or native sheet |
| `MemberMultiSelect` | RN searchable custom modal | Dedicated SwiftUI picker screen or a small local native component |
| `TagInput` | RN `TextInput` plus Pressable chips | Small local SwiftUI tag editor bridge if Expo primitives cannot express token entry accessibly |
| `MemberAvatar` | RN/SVG/image composition | `RNHostView` only where generated avatar rendering is retained; otherwise SwiftUI image/initials |
| `AttachmentsSection` | RN image picker/rows/actions | Native SwiftUI section around existing TypeScript services; `RNHostView` only for an image renderer that cannot be moved |
| `CommentsSection` | RN fields and inline Pressables | SwiftUI section with TextField/Button and native confirmation dialog |
| `AnalyticsCards` | Custom RN charts/cards | Native surrounding SwiftUI; a single documented `RNHostView` exception for charts only if required |

### Direct control and material use

No `Touchable*` use exists in the audited `src` tree. Direct/custom uses that must be removed from iOS presentation paths are:

- **Pressable:** `ActivityTimelineRow`, `AnalyticsCards`, `AttachmentsSection`, `CommentsSection`, `EntityRows`, `InAppNotificationToast`, `GlassBottomTabBar`, `Button.ios`, `Button`, `Finance`, `MemberMultiSelect`, `Menu`, `MenuList`, `Primitives`, `TagInput`, and the Dashboard, Debt Detail, Debt Form, Group Detail, Groups, Member Detail, Member Form and Notification Center screens.
- **TextInput:** `Finance`, `MemberMultiSelect`, `Primitives`, `TagInput`, `TextField.ios`, `TextField`, Debt Detail and Member Detail.
- **Switch:** Backup/Restore, Delete Account, Export, Full Export and Privacy screens.
- **Modal:** `ActivityTimelineRow`, `GlassBottomTabBar`, `MemberMultiSelect`, `MenuList`, `Primitives`, Dashboard, Debt Detail and Member Detail.
- **BlurView / expo-blur:** no current direct use in `src`; dependency remains installed and must be restricted from iOS screens.
- **GlassView / expo-glass-effect:** direct use is centralized in `GlassSurface`; `GlassSurface` is consumed by `Finance`, `Primitives`, Dashboard, Debt Detail, Group Detail, Member Detail and Member Form.
- **Custom tabs:** `GlassBottomTabBar` remains in the repository and must be Android-only or removed if unused.
- **Custom page headers:** `PageHeader` is used by every non-collection route except Dashboard; `CollectionPageHeader` is used by Members, Debts and Groups; Dashboard uses its own custom header row.
- **Custom dropdowns:** `DropdownSelect`, `CurrencySelect`, `MemberMultiSelect`, `TagInput`, `SelectChips`, `MultiSelectChips`, `SegmentedControl`, `SlidingSectionSwitcher` and filter modal implementations.
- **Custom sheets:** `FilterSheet`, `MobileMenuModal`, custom tag/date modals, activity detail modal and dashboard activity modal.

### Hard-coded presentation values

- 34 of 38 screen implementations declare `fontFamily`/`fontSize` styles, primarily Manrope and Sora aliases from `src/constants/design.ts`.
- All ordinary iOS text currently inherits a root font-loading gate for Manrope and Sora; this blocks launch while fonts load and prevents native SF/Dynamic Type behaviour.
- 34 screen implementations declare manual foreground/background colors. The root theme and `StatusBar style="dark"` force a light-biased appearance rather than semantic light/dark behaviour.
- 27 screen implementations declare custom radii; many shared components also use arbitrary radii, shadows or fixed surface dimensions.
- Dashboard, Debt Detail, Debt Form, Member Detail and Members contain explicit shadow/elevation styling. `Finance` and `EntityRows` add shared card shadows across many more routes.
- Common decorative fixed sizes include 110–170 point illustration/card blocks, pill radii, fixed segmented-control widths and manual footer reserves. These are Dynamic Type and narrow-screen risks.

## Cross-cutting risk register

### Safe area and scrolling

Every route uses the custom `Screen` safe-area calculation. It disables automatic content inset adjustment, manually varies edges for tab routes, reserves fixed bottom padding and overlays custom footer/floating layers. This is vulnerable to native tab-bar changes, home-indicator overlap, sheet detents and Dynamic Type. Native containers and native bars must own insets after migration.

### Keyboard and focus

Keyboard-critical routes are Member Form, Debt Form, Group Form, Expense Form, Payment Form, Recurring Form, Auth, First Run, Backup, Import CSV, Delete Account, Analytics range input, and inline editors in Debt Detail, Member Detail and Group Detail. Current custom fixed footers and modals have no consistent native focus progression. These routes must use full-screen viewport-sized Hosts and native Form scrolling.

### Accessibility

Some RN controls have explicit labels, but custom rows, modals, segmented controls, badges and visual state markers do not consistently expose native roles, values and state. Custom back buttons and headers also create nonstandard reading order. SwiftUI controls must supply native semantics, and every SF Symbol-only toolbar action needs a human-readable label.

### Color, contrast and transparency

The current palette is predominantly hard-coded for a light appearance. Generic content glass conflicts with Reduce Transparency and increased contrast. iOS migration must use system semantic colors and standard system surfaces; the brand purple remains the tint/accent only.

### Narrow screens and Dynamic Type

The current summary grids, segmented switchers, fixed picker widths, inline action rows and decorative headers are likely to clip at 390 points and at larger accessibility sizes. Native rows must wrap or reflow without a fixed font-size exception. Validation text must remain adjacent to its field and forms must remain scrollable.

## Native bridge and RNHostView candidates

No bridge is approved merely for visual convenience. SDK 56 already exposes Button, TextField, SecureField, Toggle, Picker, Menu, DatePicker, Form, List, Section, Label, Image/SF Symbols, ProgressView, DisclosureGroup, SwipeActions, ConfirmationDialog, BottomSheet and RNHostView.

Potential exceptions requiring implementation proof:

1. **Tag token editor:** a small local SwiftUI component may be necessary for tokenized free-form tags if `TextField` plus native list suggestions is insufficient.
2. **Generated member avatars:** current SVG/generated avatar output may require one isolated `RNHostView`, or replacement with native initials/images.
3. **Analytics charts:** the existing custom chart may remain as one documented `RNHostView` if a viable SwiftUI/Expo UI representation is unavailable.
4. **Attachment preview:** only a specialized renderer unsupported by Expo Image/SwiftUI may use `RNHostView`; file and photo actions themselves remain native controls.
5. **Native searchable/navigation-link APIs:** if SDK 56 `@expo/ui` does not expose the required SwiftUI modifiers, prefer Expo Router native Stack search/header APIs. A local Expo module is permitted only after verifying the missing API.

## iOS acceptance checklist

### Navigation and presentation

- [ ] Native status bar and safe-area behaviour on every route.
- [ ] Native Stack navigation bars and toolbar actions; exactly one header strategy per screen.
- [ ] Native inset iOS 26 tab bar with explicit SF Symbols and labels.
- [ ] Two to five visible primary tabs.
- [ ] Each tab owns a nested native Stack and independently preserves navigation state.
- [ ] Tapping the selected tab returns to that tab’s root using native behaviour.
- [ ] Native back button and interactive edge/full-screen swipe-back gesture work.
- [ ] `(tabs)`, `member/form`, `debt/[id]` and all filesystem route names never appear.
- [ ] Native sheets are used for focused add/edit/auth tasks and dismiss by native gestures.
- [ ] The tab bar is hidden where a modal/keyboard-focused flow requires it.
- [ ] Page content scrolls beneath floating native bars without being obscured.

### Content and controls

- [ ] Collection routes use native `List` and `Section` with standard row hierarchy/accessories.
- [ ] Editing routes use native `Form` and `Section`.
- [ ] Short action lists use native `Menu`; complex choices use separate picker screens.
- [ ] Chevrons appear only on rows that navigate.
- [ ] Swipe actions/context menus are used only where semantically appropriate.
- [ ] Search and refresh behaviour are native.
- [ ] Empty, loading, error and offline states are native and accessible.
- [ ] No indiscriminate Liquid Glass on cards, list rows, forms, charts or illustrations.
- [ ] Custom `glassEffect` is limited to a documented control-layer exception with no standard equivalent.

### Typography, color and layout

- [ ] SF system typography and semantic text styles are used for ordinary iOS UI.
- [ ] Dynamic Type works through accessibility sizes without clipping or fixed-size exceptions.
- [ ] System semantic foreground, background, grouped background, separator, accent and destructive colors are used.
- [ ] Brand purple is the app tint/accent, not a universal surface.
- [ ] All interactive targets are at least 44 by 44 points.
- [ ] Narrow-screen-first layout is verified around 390 points.
- [ ] A larger iPhone width (430–440 points) is verified.
- [ ] No arbitrary fixed heights collapse or clip native controls.

### Accessibility and environment

- [ ] Light mode, dark mode and increased contrast are verified.
- [ ] Reduce Transparency produces a clear, standard presentation.
- [ ] VoiceOver announces labels, values, roles, states and reading order.
- [ ] Symbol-only actions have accessible text labels.
- [ ] Forms avoid controls under the home indicator and scroll correctly with the keyboard.
- [ ] Native focus movement and submit labels behave appropriately.
- [ ] Validation appears adjacent to the relevant field without breaking row layout.
- [ ] Rotation and iPad sizing do not collapse or over-expand the full-screen Host.

### Regression and completion

- [ ] All 38 user-facing iOS routes have a complete SwiftUI principal composition.
- [ ] Every migrated route uses one `Host style={{ flex: 1 }} useViewportSizeMeasurement`.
- [ ] No `matchContents` is used on a flexible or scrolling axis.
- [ ] All RNHostView/native bridge exceptions are documented and justified.
- [ ] Android builds and retains the existing Material/Android presentation.
- [ ] All automated checks pass.
- [ ] Primary workflows are manually verified on iOS 26.
- [ ] Primary-route screenshots are captured in light and dark mode.
- [ ] No clipped/overlapping text, duplicate headers, blank layout gaps or obscured controls remain.
