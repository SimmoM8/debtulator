# Target Architecture

This document defines the architecture for the frontend/backend separation
refactor. It is intentionally tailored to Debtulator: a local-first Expo app
with optional authenticated collaboration backed by Supabase.

## System shape

```text
Expo app
  routes -> presentation -> application/use cases -> ports
                                             |       |
                                      local SQLite   API client

Versioned HTTP API (/api/v1)
  transport/controller -> validation/authn/authz -> use cases -> repository ports
                                                               |              |
                                                        Supabase Postgres   Storage
```

The mobile application owns private local-first data and UI state. The backend
owns shared collaboration, authorization enforcement, account lifecycle, and
remote persistence. Neither side imports the other's implementation. Existing
direct Supabase collaboration adapters are transitional and must be replaced by
the HTTP client as each workflow is migrated; local SQLite sync remains a client
concern.

## Dependency rules

- `packages/contracts` contains serializable DTOs, problem details, and API
  version metadata only. It has no Expo, React Native, Supabase, SQL, or Node
  dependencies.
- `src/domain` contains pure business policy and models. It has no I/O.
- `src/application` contains client use cases and ports. It may depend on the
  domain, never on Expo, Supabase, SQL, or route files.
- `src/infrastructure` implements client ports for SQLite and HTTP. Supabase
  client SDK access is backend-only for new collaboration flows.
- `src/platform` adapts OS and Expo capabilities behind ports.
- The only intentional frontend Supabase dependency is the authentication
  session adapter in `src/infrastructure/auth/clientAuthAdapter.ts` and
  `src/infrastructure/auth/supabaseAuthClient.ts`; it manages the
  user session and bearer-token refresh only. It must not query application
  tables, invoke database RPCs, access storage, or perform synchronization.
- `src/presentation` renders state and dispatches application actions. It does
  not query databases or construct network clients.
- `backend` contains transport, authentication, authorization, use cases, and
  server-side repository adapters. It never imports the frontend.
- New backend endpoints require an authenticator, input validation, an explicit
  authorization decision, a use case, and a repository port. No endpoint may
  call Supabase tables directly from its transport handler.
- `app` contains Expo Router composition only. Route files delegate immediately
  to presentation features.

## API conventions

The HTTP API is versioned at `/api/v1`. Endpoints expose stable DTOs rather than
database rows. Authentication uses Supabase JWT bearer tokens. Authorization is
performed on every request, server-side, with deny-by-default relationship and
role checks; client checks are UX only.

Errors use `application/problem+json` following RFC 9457. Validation errors
include JSON Pointer locations. Responses include a request identifier for
support and audit correlation. Breaking API changes require a new major API
version; additive fields and endpoints are preferred for compatible evolution.

## Platform strategy

Shared application code depends on capability ports. Expo and native modules are
implemented only under `src/platform` or a dedicated native module package.
Use `.native`, `.ios`, `.android`, and `.web` resolution only for capability
implementations, not business rules. Prefer Expo Modules API for new Swift/Kotlin
bridges; keep the JavaScript surface typed, asynchronous for I/O, and free of
platform objects.

## Research basis

- Expo Router and Expo Modules API documentation for SDK 56-era routing and
  native capability boundaries.
- React Native New Architecture documentation for the JS/native boundary.
- Android Architecture guidance for layered architecture, single source of
  truth, UDF, repositories, and dependency injection.
- Apple SwiftUI guidance for model-driven, platform-adaptive UI and framework
  integration.
- OpenAPI 3.1/3.2 specification for versioned, language-neutral contracts.
- RFC 9457 for machine-readable HTTP problem details.
- Supabase Auth and RLS documentation for JWT authentication, grants, policies,
  and server-only secret keys.
- OWASP API Security Top 10 and Authentication/Authorization Cheat Sheets for
  object-level authorization, deny-by-default, least privilege, secure errors,
  and authorization testing.
