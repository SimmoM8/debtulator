# Debtulator Backend

The backend owns authenticated collaboration and account-lifecycle operations.
It is an API boundary, not a library imported by the mobile application.

## Boundary

`backend` may depend on `packages/contracts`, domain policy, persistence adapters,
and Supabase server infrastructure. It must never import from `src/app/`,
`src/presentation/`, or mobile platform adapters.

The public HTTP contract is described in [`../docs/api/openapi.yaml`](../docs/api/openapi.yaml).
The first public version is `/api/v1`. Clients must use DTOs from the contract,
never database rows or Supabase-generated types.

## Request pipeline

Every authenticated endpoint follows this order:

1. authenticate the Supabase JWT;
2. validate path, query, and body input;
3. authorize the requested resource and action using relationship and role policy;
4. execute a domain use case through a repository port;
5. serialize a stable DTO or RFC 9457 problem detail.

The mobile client may cache and mutate its local SQLite model offline, but it
does not receive backend implementation details or privileged credentials.
