# Versioning

Debtulator versions the independently delivered products separately.

## Mobile version

Mobile uses semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
1.4.0
1.4.1
2.0.0
```

Guidance:

- **MAJOR** — intentionally incompatible product/support change or a compatibility break that cannot be hidden from supported clients/users.
- **MINOR** — backward-compatible features and meaningful capability additions.
- **PATCH** — backward-compatible fixes, reliability improvements, and small corrections.

A Local-backend implementation or SQLite migration does **not** require a Mobile major bump merely because internal schema changed, provided the upgrade path is safe and transparent.

### Build identifiers

Store build identifiers are not semantic versions.

- iOS `buildNumber` MUST increase for every uploaded iOS build.
- Android `versionCode` MUST increase for every uploaded Android build.
- Build identifiers MAY increase without changing `MAJOR.MINOR.PATCH`.

`mobile/package.json` and Expo `version` MUST agree for release builds.

## Local-backend version

The Local backend has no independent product version or Git release tag.

It is identified by:

- the containing Mobile version;
- the local database schema/user version;
- the exact Mobile Git commit/tag.

Local schema versions are implementation migration identifiers, not marketing versions.

## Remote version

Remote has an independent semantic version:

```text
remote-vMAJOR.MINOR.PATCH
```

The Remote application version and the HTTP API path version are related but not identical concepts.

A Remote patch may be deployed without a Mobile release. A Mobile release may ship without a Remote version bump if no Remote deployment is required.

## API version

The API uses explicit path versioning such as:

```text
/api/v1
```

Keep an endpoint in the same API version when changes are backward compatible.

A new API major path is required when supported clients cannot continue using the existing contract without behavior or payload breakage that cannot be bridged compatibly.

Do not bump `/api/v1` merely because the Remote application receives a new semantic version.

## Remote database migration version

Flyway versions (`V1`, `V2`, ..., `V13`) are migration sequence numbers. They are not Remote semantic versions.

A Remote release may contain zero, one, or several Flyway migrations.

Applied production migrations are immutable.

## Prereleases

Mobile release candidates MAY use:

```text
mobile-v1.5.0-rc.1
mobile-v1.5.0-rc.2
```

Remote prerelease tags MAY use the same SemVer prerelease form when useful:

```text
remote-v1.9.0-rc.1
```

Prerelease tags MUST point to the exact source tested/deployed for that candidate.

## Milestone tags

Historical milestones use:

```text
milestone/<name>
```

Milestone tags do not imply a shippable release and do not participate in semantic-version ordering.

## Compatibility support

The supported Mobile-version set MUST be explicit for production operations.

Remote MUST remain compatible with all Mobile versions still inside that support window. When an old Mobile line leaves support, compatibility code MAY be removed in a later Remote release after the support decision is documented.

## Adoption baseline

At governance adoption on 2026-09-18:

- `mobile/package.json` and `mobile/app.json` both declare Mobile version `1.0.0`;
- iOS `buildNumber` is `1` and Android `versionCode` is `1`;
- `backend/pom.xml` still declares the development Maven version `0.0.1-SNAPSHOT`; and
- no `mobile-v*` or `remote-v*` production release-tag series has yet been established.

The Maven `SNAPSHOT` value is not a substitute for Remote release provenance. Before the first production Remote release, the release process MUST record an unambiguous Remote semantic version and exact Git SHA, and the produced artifact/deployment metadata MUST be traceable to them.
