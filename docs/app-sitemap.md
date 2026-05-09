# Debtulator App Sitemap

This sitemap describes the app's navigable screen structure, not the user's end-to-end task journeys. For task sequences and state transitions, see [user-flow.md](./user-flow.md). For persisted visual maps, see [navigation-map.md](./navigation-map.md) and the SVG assets in `docs/diagrams/`.

## Source of truth

- File-based routes in `app/`
- Root stack registration in `app/_layout.tsx`
- Tab configuration in `app/(tabs)/_layout.tsx`
- Secondary entry points in `src/components/navigation/AppMenuButton.tsx`
- Quick-add entry points in `src/components/navigation/GlassBottomTabBar.tsx`

## Navigation model

- Root navigator: Expo Router `Stack`
- Anchor route: `/(tabs)`
- Persistent primary navigation: custom bottom tab bar
- Secondary navigation: global menu modal
- Fast creation entry point: floating add button
- Hidden tab routes: `Requests` and `Settings` live in the tab group but are not shown in the bottom bar

## Top-level structure

```text
Root Stack
└── /(tabs)
    ├── /                  Home dashboard
    ├── /debts             Debt list
    ├── /members           Member list
    ├── /events            Event list
    ├── /requests          Hidden tab: inbox and approvals
    └── /settings          Hidden tab: settings hub
```

## Route tree

### Primary tabs

- `/`
  - Dashboard / home
  - Key entry points:
    - `/requests`
    - `/debt/form`
    - `/payment/form`
    - `/expense/form`
    - `/member/form`
    - `/debts`

- `/debts`
  - Debt list and filtering
  - Child/detail routes:
    - `/debt/[id]`
    - `/debt/form`
    - `/payment/form`
    - `/payment/[id]`

- `/members`
  - Member list and balance overview
  - Child/detail routes:
    - `/member/form`
    - `/member/[id]`

- `/events`
  - Event list and group-expense overview
  - Child/detail routes:
    - `/event/form`
    - `/event/[id]`
    - `/expense/form`
    - `/expense/[id]`
    - `/attachment/[id]`
    - `/settlement/[id]`

### Hidden tab routes

- `/requests`
  - Shared approvals, link requests, event invites, debt verification inbox

- `/settings`
  - Settings hub with account, privacy, sync, export, and safety controls

## Stack screens outside the tab surface

### Record creation and detail

- `/member/form`
- `/member/[id]`
- `/debt/form`
- `/debt/[id]`
- `/payment/form`
- `/payment/[id]`
- `/event/form`
- `/event/[id]`
- `/expense/form`
- `/expense/[id]`
- `/attachment/[id]`
- `/settlement/[id]`

### Analysis and productivity tools

- `/analytics`
- `/suggestions`
- `/recurring`
- `/recurring/form`

### Import, export, and backup

- `/export`
- `/full-export`
- `/import-csv`
- `/backup`

### Trust, sync, and safety

- `/sync`
- `/conflicts`
- `/conflict/[id]`
- `/notifications`
- `/privacy`
- `/delete-account`

### Profile and app preferences

- `/auth`
- `/language`
- `/accessibility`

## Entry surfaces

### Bottom tab bar

- Visible tabs:
  - `Home`
  - `Debts`
  - `Members`
  - `Events`
- Floating add button quick actions:
  - `Add debt` -> `/debt/form`
  - `Record payment` -> `/payment/form`
  - `Split expense` -> `/expense/form`
  - `Invite member` -> `/member/form`
  - `Add event` -> `/event/form`

### Global menu

- Browse:
  - `/`
  - `/debts`
  - `/members`
  - `/events`
  - `/requests`
- Tools:
  - `/recurring`
  - `/analytics`
  - `/suggestions`
  - `/export`
  - `/import-csv`
- Safety:
  - `/settings`
  - `/sync`
  - `/conflicts`
  - `/backup`
  - `/privacy`
  - `/notifications`

## Structural observations

- The app is organized around four always-visible working areas: home, debts, members, and events.
- `Requests` and `Settings` are intentionally secondary destinations: always routable, but not always visible in the bottom bar.
- Most create/edit/detail experiences are stack routes pushed above the tab shell.
- Operational trust surfaces such as sync, conflicts, backup, export, privacy, and deletion are separated from routine ledger browsing.
