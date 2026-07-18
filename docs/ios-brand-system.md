# Debtulator native iOS brand system

Debtulator’s iOS identity is a content system layered inside genuine native iOS
navigation and controls. Brand and native behavior reinforce one another: the system
provides familiar interaction, while Debtulator provides financial hierarchy,
semantic meaning, people/group identity and occasional illustration.

## Principles

1. Keep the navigation/control layer native.
2. Concentrate identity in financially meaningful content.
3. Use indigo as a tint and focal surface, not as the default color for all text.
4. Pair every semantic color with words, values or symbols.
5. Prefer native text styles and system backgrounds to fixed visual geometry.
6. Use branded surfaces and illustrations selectively.

## Source palette

| Token | Value | Purpose |
| --- | --- | --- |
| Primary | `#3730A3` | Canonical Debtulator indigo and light-mode app tint |
| Primary deep | `#24185F` | Prominent depth and high-contrast light tint |
| Lavender | `#DDD6FE` | Illustration/supporting accent |
| Lavender mist | `#F6F3FF` | Light supporting selection surface |
| Peach | `#FDBA9B` | Warm illustration and invitation accent |
| Mint | `#2FBF8F` | Positive source color |
| Amber | `#F59E0B` | Warning source color |
| Coral | `#FF6B6B` | Negative source color |

Raw source colors live in `src/theme/brand.ts`. Screens consume semantic roles,
not palette literals.

## Semantic roles

- `appTint`, `primaryAction`, `prominentAction`, `selection`
- `positive`, `negative`, `warning`
- `owedToUser`, `owedByUser`, `neutralBalance`
- `brandedBackground`, `brandedSecondaryBackground`
- `brandedIllustrationPrimary`, `brandedIllustrationSecondary`
- `chartPrimary`, `chartSecondary`, `chartPositive`, `chartNegative`
- `onBrandedBackground`, `positiveOnBranded`, `negativeOnBranded`
- supporting positive, negative, warning and selection background roles

`src/theme/iosBrand.ios.ts` uses `DynamicColorIOS` to provide deliberate light,
dark, high-contrast-light and high-contrast-dark values. Ordinary labels continue
to use SwiftUI hierarchical foreground styles so the operating system owns their
appearance and accessibility adaptation.

## Typography

- Navigation titles, toolbar labels, tab labels, lists, forms, controls, menus,
  settings and ordinary body copy use SF system semantic text styles.
- Financial focal values may use `title`, `title2` or `largeTitle` with stronger
  weight and monospaced digits.
- Sora and Manrope are not used in the native iOS interface. They remain available
  to the Android legacy presentation.
- No branded component may require a fixed height to accommodate text.

## Native-versus-branded boundary

Native system components own interaction:

- NativeTabs, Stack navigation, toolbars and back behavior
- List, Form, Section, searchable and refreshable behavior
- Button, TextField, SecureField, Toggle, Picker, Menu and DatePicker
- sheets, alerts and confirmation dialogs

Branded components own domain content:

- balance heroes, metrics and amount hierarchy
- member/group identity and deterministic avatars
- debt direction/status presentation
- chart legends and insight summaries
- invitation/helper content and empty-state artwork

A branded component may contain a native Button, but may never imitate one with a
custom hit target. It may style a debt row, but navigation remains a native plain
Button/NavigationLink-style action inside List.

## Illustration guidance

- Orbit imagery belongs in dashboard/onboarding or a meaningful empty state.
- Shield imagery belongs in privacy, account safety and protected-data contexts.
- Illustrations are content, never toolbar icons or replacements for SF Symbols.
- One high-identity illustration moment per screen is the practical maximum.
- Decorative artwork must not be the only accessible description of an action.

## Screen composition

1. Native navigation title and toolbar.
2. Optional branded summary/identity content.
3. Native List/Form sections and rows.
4. Semantic status/insight content where the product meaning requires it.

Settings remains primarily system-native. Forms receive tint and contextual helper
content, not custom field containers. Dashboard and financial details may carry the
highest brand density.

## Dark mode and accessibility

- Dark colors are authored variants, not automatic inversions.
- High-contrast variants strengthen tint and state colors.
- Brand surfaces are opaque, so Reduce Transparency does not remove meaning.
- Financial direction always includes text or an SF Symbol in addition to color.
- Components use Dynamic Type semantic styles, flexible stacks and 44-point minimum
  interactive dimensions.
- Reduce Motion requires no special fallback because brand components do not depend
  on animation for state or comprehension.

## Correct applications

- An indigo balance hero containing native Text and SF Symbols.
- A member row with a deterministic avatar, system typography and semantic amount.
- A mint “Owed to you” metric with a directional symbol and written label.
- A native chart using the Debtulator chart roles and a text legend.
- A native empty state with a restrained brand motif and native action.

## Prohibited applications

- Purple replacement navigation bars or page headers.
- Custom tab bars, search fields, segmented controls or form inputs.
- Pressable/View replicas of SwiftUI controls.
- Blur, glass, gradients or shadows applied to every content section.
- Purple body text throughout the interface.
- Color-only status communication.
