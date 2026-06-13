# Debtulator User Flow

This document describes user journeys and state transitions. It is intentionally different from the sitemap: the sitemap answers "where can a user go," while this file answers "what is the user trying to accomplish, and what screens or states do they pass through to do it."

For route hierarchy, see [app-sitemap.md](./app-sitemap.md). For persisted visual maps, see [navigation-map.md](./navigation-map.md).

## Core product modes

### Local-only mode

- User launches the app and can immediately track debts, members, groups, expenses, and payments on-device.
- Data remains local unless the user explicitly signs in and enables shared or cloud-backed behaviors.

### Authenticated/shared mode

- User signs in from `Settings` or `Auth`.
- Shared capabilities become available or more useful:
  - member linking
  - group invites
  - debt verification
  - sync queue visibility
  - conflict review

## Primary journeys

### 1. Start and orient

- Launch app
- Land on `Home`
- Review snapshot metrics, due-soon items, recent activity, and pending requests
- Branch into a creation flow, a list view, or the requests/settings safety surfaces

Typical screens:

- `/`
- `/requests`
- `/settings`

### 2. Add and manage a simple debt

- Start from `Home` quick action or the floating add button
- Open debt form
- Save debt
- Review debt detail
- Record payment when money moves
- Return to debt detail or debt list with updated remaining balance
- Groupually reach a settled state

Typical screens:

- `/debt/form`
- `/debt/[id]`
- `/payment/form`
- `/payment/[id]`
- `/debts`

### 3. Build a member network

- Open `Members`
- Add a member
- Review member detail and balance context
- Optionally link that member to an authenticated/shared identity later
- Reuse the member across debts, payments, and groups

Typical screens:

- `/members`
- `/member/form`
- `/member/[id]`
- `/auth`
- `/requests`

### 4. Create and run a shared group

- Start from `Groups` or the floating add button
- Create group
- Open group detail
- Add participants or invite linked/shared users
- Add expenses inside the group
- Generate updated balances and settlement suggestions
- Drill into attachments or settlement detail as needed

Typical screens:

- `/groups`
- `/group/form`
- `/group/[id]`
- `/expense/form`
- `/expense/[id]`
- `/attachment/[id]`
- `/settlement/[id]`

### 5. Respond to shared approvals and invites

- User receives a pending item
- Opens `Requests`
- Reviews link request, debt verification, or group invite
- Accepts or rejects
- Returns to the relevant member, debt, or group state with updated visibility or verification status

Typical screens:

- `/requests`
- `/member/[id]`
- `/debt/[id]`
- `/group/[id]`

### 6. Move between private tracking and shared sync

- User signs in or signs out from `Settings`
- Shared records create sync queue activity
- User checks sync health from `Settings` or the global menu
- If safe, queue drains normally
- If not safe, user is routed to conflict review before financial state is overwritten

Typical screens:

- `/settings`
- `/auth`
- `/sync`
- `/conflicts`
- `/conflict/[id]`

### 7. Protect, export, or recover data

- User opens `Settings` or the global menu safety/tools areas
- Chooses backup, export, full export, CSV import, privacy review, notifications, or account deletion
- Completes the maintenance action outside the normal debt/group browsing loop

Typical screens:

- `/backup`
- `/export`
- `/full-export`
- `/import-csv`
- `/privacy`
- `/notifications`
- `/delete-account`

### 8. Use supporting intelligence and maintenance tools

- User reviews analytics, smart suggestions, or recurring templates
- Applies insight or reuses a template
- Returns to normal debt, member, or group workflows

Typical screens:

- `/analytics`
- `/suggestions`
- `/recurring`
- `/recurring/form`

## System-level flow patterns

### Home as the operational hub

- `Home` is not just a landing page.
- It acts as a triage screen for:
  - current balances
  - due-soon debt follow-up
  - recent activity
  - requests needing action
  - common creation actions

### Settings as a trust hub

- `Settings` is the center of account state, sync state, privacy, export, and deletion.
- This separates sensitive operations from day-to-day ledger browsing.

### Requests as the shared-work inbox

- `Requests` is the approval surface for collaborative state changes.
- It is distinct from browsing debts or groups because the user is responding to another actor, not just editing their own records.

### Conflicts as a protected exception path

- Conflicts are intentionally off the happy path.
- Users only enter them when shared data cannot be reconciled safely.
- The flow returns to sync health once a conflict is reviewed and resolved.

## Journey summary

Debtulator has three dominant loops:

1. Track and update financial records.
2. Coordinate shared records with other people.
3. Protect data integrity through sync, privacy, backup, export, and review workflows.

That separation is why the user-flow map should stay distinct from the sitemap: the route tree is relatively flat, but the behavioral flows branch around trust state, collaboration, and data safety.
