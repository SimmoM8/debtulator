# Application Architecture

Debtulator is a local-first financial record app, not a thin client. Its
architecture protects four product invariants:

1. SQLite is available without an account or a network connection and is the
   only source read by the product UI.
2. Private records remain local unless the user explicitly enters a shared
   workflow.
3. Shared changes are durable locally before network delivery, and financial
   conflicts are reviewed rather than silently overwritten.
4. iOS, Android, and web share product behavior while native navigation,
   storage, lifecycle, file, and capability differences stay at narrow seams.

## Dependency model

```text
                         app/ (Expo Router + composition)
                                      |
                                      v
       presentation  ---------->  application  ---------->  domain
             |                         ^                       ^
             |                         |                       |
             +-- injected ports ------+                       |
                                       \                     /
                              infrastructure    platform
                              (SQLite/Supabase) (Expo/device)
```

Dependencies point toward policy. `domain` knows no framework. `application`
owns workflows, application state shapes, and stable ports. Infrastructure and
platform code implement those ports. Presentation feature code consumes the
ports rather than native SDKs or remote clients. `app/` is the general-purpose
composition boundary and otherwise contains route/layout entries only; the two
documented runtime-controller exceptions are described below.

This is deliberately a hybrid clean architecture. Debtulator has enough
financial, permission, privacy, split, settlement, conflict, and retry logic to
justify a domain layer, but it does not create a class or use case for every
trivial CRUD call.

## Source layout

| Area | Responsibility | May depend on |
| --- | --- | --- |
| `src/domain` | Models and pure money, ledger, split, permissions, duplicate, attachment, notification, and conflict rules | `domain` |
| `src/application` | `AppSnapshot`, data-management workflows, sync policy, localization, telemetry policy, and ports | `application`, `domain` |
| `src/infrastructure/sqlite` | Database open/migration, SQL row mapping, snapshot loading, repository implementation, and transactions | `infrastructure`, `application`, `domain` |
| `src/infrastructure/supabase` | Auth client, remote DTO mapping, collaboration APIs, pull/outbox sync, storage, and remote gateway implementation | `infrastructure`, `application`, `domain`, stable `platform` services where required |
| `src/platform` | Secure session storage, app lifecycle, file access, pickers, sharing, and target-specific implementations | `platform`, application ports |
| `src/presentation` | Feature screens, screen models, providers, design system, navigation adapters, and theme | `presentation`, `application`, `domain` |
| `app` | Expo Router paths, layout ownership, redirects, and concrete dependency wiring | all layers only at composition/layout entries |

`npm run architecture` enforces these import directions. The two runtime
controllers, `AppDataProvider` and `AuthProvider`, remain explicit composition
seams while their large command surfaces are incrementally divided by feature;
ordinary screens and components do not receive this exception.

## Data and sync flow

```text
user action
   -> application command
   -> serialized SQLite transaction
        -> domain record(s)
        -> sync queue entry when shared
        -> activity/audit record when required
   -> reload application snapshot
   -> render derived presentation state

remote invalidation / foreground refresh
   -> Supabase pull or outbox drain
   -> map remote DTOs
   -> update SQLite / record conflict
   -> reload application snapshot
   -> render
```

The database retains the filename `debtulator-stage1.db` and existing additive
migrations. Opening enables foreign keys and WAL. Repository application
commands are serialized and use Expo SQLite's cross-platform transaction API,
so a failed multi-write command rolls back instead of leaving a partial local
aggregate. The web implementation uses the shared transaction API because
Expo's exclusive transaction API is not available on web.

Network responses never become a parallel UI source of truth. Supabase can lag
SQLite while offline; SQLite can lag Supabase before a pull; the sync engine is
responsible for convergence. Nonfinancial metadata can use policy-based
resolution, but debt, expense, payment, and settlement divergence remains
manual.

## Platform and version seams

- `application/ports/fileGateway.ts` describes file read/write, document and
  image selection, and sharing. Only
  `platform/files/expoPlatformFileServices.ts` knows the legacy Expo FileSystem
  API or picker/share SDK details. Migrating to the current File/Directory API
  changes one adapter rather than every export and attachment screen.
- `platform/auth/sessionStorage.*` owns SecureStore, browser `localStorage`, and
  safe in-memory fallbacks. The Supabase client only sees its storage contract.
- `platform/lifecycle/appLifecycle.*` owns AppState/browser visibility and the
  auth refresh lifecycle. `AuthProvider` starts and disposes subscriptions.
- `presentation/navigation/AppTabs*`, `RootNavigator*`, and the native toolbar
  adapters contain Expo Router's native/unstable API surface. Feature bodies do
  not fork by platform.
- Small visual differences may still use React Native `Platform.select` inside
  low-level design-system/theme code. Product workflows must not branch on a
  platform.
- `react-native-screens@4.25.2` stays exact-pinned with its repository patch.
  The patch is a temporary iOS compatibility adapter and requires focused
  navigation QA on every Expo, React Native, Xcode, or screens upgrade. Expo
  dependency validation excludes the intentional Router/screens pins, while an
  npm override guarantees that only the patched native screens module is
  installed.

Generated `ios/` and `android/` projects are disposable. `app.json`, config
plugins, dependencies, and patch files are the source of truth. See
[`native-build-configuration.md`](native-build-configuration.md) for the
durable CocoaPods setting and permission policy.

## Routing and presentation

Expo Router files describe URLs and navigator ownership. Non-layout route files
re-export a feature screen or redirect a legacy URL; they do not contain data
logic or compose arbitrary UI. The root layout owns startup composition. Native
tab differences live in the platform-resolved `AppTabs` adapter outside the
route tree, preserving universal routes and deep links.

Screens own transient form drafts, filters, selection, and modal state. Durable
ledger state stays in SQLite and derived summaries are computed from the
application snapshot. A screen should introduce a feature screen-model hook
when its state/calculations become reusable or obscure the view, rather than
moving product state into another global context.

The debt-detail confirmation/activity rules live in a feature model, while the
group-detail member and ledger sections are feature-local components. This is
the preferred split for large screens: keep orchestration in the screen and
extract cohesive, testable policy or rendering sections without inventing a
second global state owner.

## Adding or changing a feature

1. Put framework-free rules and types in `domain` only when they are meaningful
   business policy or reused calculation.
2. Define the workflow and any required external contract in `application`.
3. Implement storage/network/device contracts in `infrastructure` or
   `platform`; map external DTOs at that boundary.
4. Add the feature screen/model under `presentation/features` and keep its
   Expo Router entry minimal.
5. Persist shared mutations locally with their sync/audit effects in one
   repository transaction.
6. Add pure domain/application tests, adapter contract tests when a boundary
   changes, and route/native smoke coverage in proportion to risk.
7. Run `npm run quality`, the release config preflight, and an all-platform Expo
   export. Native dependency/config changes also require a clean prebuild and
   native compilation.

## Guidance used and reconciled

- [Expo Router core concepts](https://docs.expo.dev/router/basics/core-concepts/)
  assigns initialization to the root layout and keeps non-route code outside
  the route directory. [Platform-specific modules](https://docs.expo.dev/router/advanced/platform-specific-modules/)
  require a universal base route and support platform-resolved components.
- [React Native platform-specific code](https://reactnative.dev/docs/platform-specific-code.html)
  recommends `Platform` for small differences and platform extensions for
  substantial ones. Debtulator therefore shares feature bodies and isolates
  native navigation/device implementations.
- [Android's architecture recommendations](https://developer.android.com/topic/architecture/recommendations)
  require clear UI/data boundaries and make a domain layer optional. The
  domain layer is used here only for Debtulator's substantial reusable rules.
- [Android's offline-first guide](https://developer.android.com/topic/architecture/data-layer/offline-first)
  makes the local store canonical for higher-layer reads and puts network/local
  reconciliation in repositories. Its common last-write-wins example is not
  applied to financial conflicts because that contradicts the product's trust
  model.
- [Expo SQLite](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/) recommends
  WAL, prepared parameters, and scoped transactions; it also marks web support
  alpha and documents that exclusive async transactions are unavailable there.
- [React context guidance](https://react.dev/reference/react/useContext) and
  [reducer/context scaling](https://react.dev/learn/scaling-up-with-reducer-and-context)
  support separating state/action wiring but do not eliminate provider fan-out.
  The current controllers stay characterized while feature selectors and
  screen models replace broad consumption incrementally.
- [Supabase's React Native auth quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)
  drives the storage, token-refresh, lock, and app-lifecycle adapter shape.
- [Expo Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
  and [config plugins](https://docs.expo.dev/config-plugins/introduction/) make
  app config/plugins—not ignored native edits—the durable build source.
- [Apple tab-bar guidance](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
  and [Android navigation guidance](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
  both favor familiar top-level navigation while allowing platform-appropriate
  presentation. The shared information architecture is therefore rendered by
  replaceable native navigation adapters rather than a single hand-built shell.

Further primary-source review produced the same boundaries, so implementation
favored preserving behavior and isolating change over introducing another state
library, ORM, or custom native bridge.

## Remaining constraints

- `AppDataProvider` still reloads the complete snapshot after a command and has
  a broad value surface. This is correct but can over-render; optimize only with
  selector/invalidation characterization tests.
- `AuthProvider` still coordinates several collaboration concerns. Lifecycle
  and storage are now isolated, but realtime/profile/sync coordination can be
  split further behind application gateways.
- Expo SQLite web support is alpha. EAS Hosting receives the documented
  COOP/COEP headers from the Expo Router plugin; any other host must mirror
  them. Native mobile remains the primary release target until web runtime
  coverage is in place.
- Representative Supabase payment/relationship mappers now have
  characterization coverage, but remote DTOs are not generated from the
  schema. Schema drift remains a release risk until generated types and broader
  RLS/protocol contract tests are added.
- Expo Doctor reports the SDK 56 Hermes V1 memory regression. The documented
  fix requires Expo SDK 57 / React Native 0.86.2 or newer; that native migration
  must be performed together with replacement/revalidation of the patched
  navigation stack rather than folded into this behavior-preserving refactor.
