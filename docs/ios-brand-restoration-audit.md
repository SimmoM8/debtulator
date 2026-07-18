# Debtulator iOS brand identity restoration audit

- Audit date: 2026-07-19
- Working branch: `feat/ios-brand-identity-restoration`
- Native baseline: `30aef3d` (`feat: rebuild iOS presentation with native SwiftUI`)
- Requested visual-reference hash: `41c547f72fafe6ea4ff02c4b3be6577b713a5123`
- Resolved repository reference: `41c547f72fafe6ea7f56734dcee840e60ce2100a`

The requested full hash is not present in this repository. Its `41c547f` prefix
resolves unambiguously to the visual-reference commit recorded above, whose subject
is `refactor: modernize debt detail page layout and UI components`. This audit uses
that commit without reverting or copying its React Native presentation architecture.

## Sources inspected

- Reference and current `src/constants/design.ts` and `constants/theme.ts`
- Reference and current root/tab layouts
- Reference Dashboard, Members, Debts, Groups, detail and form screens
- Reference `PageHeader`, cards, status pills, stat cards, list rows and avatars
- Current native route layouts, `src/components/ios` and all `src/screens/ios`
- Existing orbit and shield SVG illustrations and app icon assets
- Native baseline screenshots for all five primary tabs in light and dark mode
- Android regression screenshot, which preserves the legacy visual language without
  being used as an iOS structural template

## Identity diagnosis

The reference app was recognisably Debtulator because it combined a concentrated
indigo/lavender identity with strong financial hierarchy: a large net-position
metric, paired owed/owing summaries, semantic mint/coral direction, numeric emphasis,
member avatars, compact status treatments and occasional peach/lavender supporting
surfaces. The current native implementation correctly replaced the navigation and
control layer, but reduced most content to undifferentiated system rows. The result
is structurally correct iOS, yet the financial product hierarchy and visual memory
are weak.

The restoration therefore applies brand primarily inside domain content. Native
navigation bars, tabs, search, sheets, menus, forms, confirmation dialogs and system
settings remain system-owned.

## Element decisions

Classification:

- **A — Restore using native SwiftUI**
- **B — Adapt to Apple conventions**
- **C — Preserve only as a brand token**
- **D — Do not restore**

| Reference visual feature | Identity contribution | Class | Native expression and owner | Layer | Accessibility/dark-mode concern |
| --- | --- | --- | --- | --- | --- |
| Indigo net-position hero | Strongest financial and product focal point | A | `DebtulatorBalanceHero` in the Dashboard and appropriate detail summaries | Content | Dynamic Type must stack rather than clip; white-on-indigo contrast must remain AA in both modes |
| Paired “You owe” and “Owed to you” metrics | Makes financial direction immediately legible | A | Native metric groups using text plus arrow symbols and semantic labels | Content | Direction must not rely on color alone; use words and symbols |
| Mint/coral direction language | Gives balances consistent emotional and semantic meaning | C | `owedToUser`/`positive` and `owedByUser`/`negative` semantic tokens | Token | Deliberate high-contrast variants; never tint destructive actions indigo |
| Indigo/lavender visual family | Creates Debtulator recognition across screens | C | Root tint plus selective hero, avatar, badge and insight surfaces | Both | Avoid purple text on low-contrast lavender; preserve system backgrounds |
| Peach supporting accent | Adds warmth and distinguishes secondary branded content | C | Illustration and invitation/group supporting surfaces only | Content | Use sparingly and with dark-specific treatment |
| Large, heavy financial numerals | Makes amounts scan before metadata | B | SF system title/large-title styles with semibold/bold and monospaced digits | Content | Do not reintroduce fixed-size Manrope/Sora where Dynamic Type would be lost |
| Sora/Manrope across ordinary UI | Previously distinctive but competed with native hierarchy | D | Keep SF system typography for navigation, forms, lists and controls | System | Native Dynamic Type is the requirement |
| Generated member avatars and avatar stacks | Gives people and groups memory and personality | A | Deterministic native `DebtulatorAvatar` and compact avatar stack compositions | Content | Initials supplement color; accessible row label names the person |
| Status pills and balance badges | Makes state and direction scannable | B | Compact native text/symbol badges only for meaningful states | Content | Avoid badge overload; include text, not color alone |
| Branded list-row amount hierarchy | Separates name, context and financial outcome | A | Debtulator member/debt/group row compositions inside native `List` | Content | Keep 44-point row height, semantic text styles and native navigation behavior |
| Group cards with avatar stacks and balance summaries | Gives each group an identity beyond its name | B | Native group row with avatar motif, visibility/status metadata and semantic amount | Content | Must continue to behave as a native navigation row |
| Branded empty states | Makes sparse screens feel intentional and helpful | A | Native SwiftUI empty composition with brand motif, system symbol and native action where useful | Content | Keep concise reading order and scalable text |
| Orbit and shield illustrations | Distinctive Debtulator visual assets | A | Reuse selectively in onboarding, account/privacy and empty-state content through a native image path | Content | Decorative artwork must not become the only label; dark-mode asset contrast must be checked |
| Branded insight/chart color sequence | Associates analytics with the product | A | Native Swift Chart marks and legend using chart semantic tokens | Content | Legend text/symbols must explain series without color alone |
| Invite/member-link card | Reinforces Debtulator’s shared-ledger identity | A | Native invitation/supporting section and branded helper content | Content | Native buttons and links remain native; avoid fake card interactions |
| Lavender and peach cards around most content | Added identity but created excessive containers | B | Reserve branded surfaces for summaries, insights and invitations; use native sections elsewhere | Content | Avoid nested cards and excessive contrast boundaries |
| Purple custom page header | Strong old identity but duplicated native navigation | D | Native Stack title and toolbar remain the only header | System | Preserves back swipe, safe area and Dynamic Type |
| Custom glass bottom tab bar and center add button | Visually distinctive but non-native navigation | D | Keep `expo-router/unstable-native-tabs` and native toolbar add menu | System | Preserves tab state, accessibility and system behavior |
| Fake search, dropdown, segmented and date controls | Matched the old composition but duplicated UIKit behavior | D | Keep native searchable, Picker, Menu and DatePicker | System | Preserves focus, VoiceOver, keyboard and platform conventions |
| Glass on cards and rows | Created a fashionable surface language but weakened content clarity | D | Use standard List/Form surfaces and opaque branded summaries | Content | Honors Reduce Transparency automatically |
| Decorative gradients/shadows on most cards | Added polish but excessive density | D | No generic gradient-card or shadow abstraction | Content | Avoids contrast and Reduce Transparency problems |

## Screen-by-screen restoration destination

| Screen family | Current native baseline | Identity to restore | Native owner |
| --- | --- | --- | --- |
| Dashboard | Correct native list, but net/owed/owing are three ordinary rows | Indigo financial hero, semantic paired metrics, stronger recent-debt amount direction, branded tools/insight accent | `NativeDashboardScreen`, `DebtulatorBalanceHero`, branded debt rows |
| Members | Searchable list with a generic person symbol | Deterministic avatars, semantic balances, linked status, branded invitation/empty treatment | `NativeMembersScreen`, `DebtulatorMemberRow`, `DebtulatorAvatar` |
| Debts | Searchable list with black arrows and equally weighted amounts | Mint/coral direction, amount hierarchy, status badge, directional summary and branded empty state | `NativeDebtsScreen`, `DebtulatorDebtRow`, `DebtulatorStatusBadge` |
| Groups | Searchable list or generic system empty state | Group avatar/stack motif, visibility/status metadata, balance summary and purposeful empty illustration | `NativeGroupsScreen`, `DebtulatorGroupRow`, branded empty state |
| Settings | Correct system-native grouped list | Compact account/product header, app tint and semantic sync/account status only | `NativeSettingsScreen` |
| Member detail | Correct native sections, generic balance information | Person identity hero, semantic net balance, linked/status treatment | `NativeMemberDetailScreen`, balance hero/avatar |
| Debt detail | Correct native sections and toolbar actions | Amount/direction hero, status badge and branded timeline hierarchy | `NativeDebtDetailScreen`, amount/status components |
| Group detail | Correct native sections, limited group identity | Group summary hero, member motif and semantic position | `NativeGroupDetailScreen` |
| Other record details | Correct native information rows | Consistent amount/status header where financially meaningful | `NativeRecordDetailScreens` |
| Forms | Correct native Form controls and toolbar save/cancel | Tint, compact branded context/warning/status rows only | Native form screens and shared branded status/helper components |
| Analytics | Native chart with generic colors | Debtulator chart palette, legend and insight summaries | `NativeAnalyticsScreen`, chart tokens/legend/insight card |
| Onboarding/auth | Correct native forms, low visual identity | App mark/illustration, concise branded hero and system controls | `NativeAccountScreens` |
| Empty/loading/error | Mostly generic system presentation | Branded but restrained content motif and clear native recovery action | Native state components |

## Token audit

`src/constants/design.ts` already contains the correct Debtulator source palette,
but it is a React Native presentation token file and has no deliberate dark/high-
contrast variants. It remains the Android/shared legacy source and must not be
imported directly into SwiftUI screens.

`constants/theme.ts` still contains Expo starter teal (`#0a7ea4`) and white dark-
mode tint values. Those active generic values are stale. They should resolve to
Debtulator semantic values without changing Android screen geometry.

The native baseline uses `#5B4FD8` as `IOS_ACCENT`; this is close to the brand but
not the specified canonical `#3730A3`. A dedicated iOS semantic token file will
provide canonical light, deliberate dark, and high-contrast variants through native-
compatible dynamic colors. Screens will use semantic roles rather than raw hex.

## Native-versus-brand boundary

Brand owns:

- financial summaries and amount hierarchy;
- people/group identity and deterministic avatars;
- semantic financial state;
- illustrations, insights, legends and empty-state content;
- the global application tint.

The system owns:

- navigation bars, titles, back behavior and toolbars;
- NativeTabs and tab-selection behavior;
- List, Form, Section, search, refresh and swipe behavior;
- Button, TextField, SecureField, Toggle, Picker, Menu and DatePicker behavior;
- sheets, alerts, confirmation dialogs and destructive roles.

## Baseline screenshot set

The committed files in `docs/ios-native-screenshots` are the before-restoration
evidence. The five light primary captures and five dark primary captures establish
the native baseline. `android-regression.png` is only a legacy identity reference;
Android must retain that presentation unchanged.

## Risks and acceptance checks

- Branded summary compositions must reflow at accessibility XXXL and never use a
  fixed height.
- Financial meaning must always include labels/symbols alongside mint/coral.
- Dark surfaces require explicit colors rather than mathematical inversion.
- High-contrast dynamic variants must strengthen, not mute, brand/state colors.
- Branded content must remain opaque and understandable with Reduce Transparency.
- No branded row may reduce the native minimum interaction height below 44 points.
- Native list, search, keyboard, sheet, menu, tab state and back-swipe behavior must
  remain unchanged.
- The final repository scan must still show one full-screen `Host` boundary and no
  reintroduced React Native presentation controls in iOS screens.
