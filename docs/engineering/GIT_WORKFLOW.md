# Git Workflow

## Decision

Debtulator uses **trunk-based development with short-lived branches**, plus temporary Mobile release branches for actively supported store lines.

Debtulator does **not** use classic Git Flow. In particular, there is no permanent `develop` branch and no routine merge flow between multiple long-lived development branches.

## Target branch model

### Permanent branch

`main` is the single permanent trunk.

`main` MUST:

- contain integrated Mobile, Local-backend, and Remote code;
- remain buildable and testable;
- use linear history;
- be protected from force pushes and deletion;
- require the applicable CI checks before changes land.

### Short-lived branches

All ordinary work occurs on short-lived branches created from current `main`.

Branches SHOULD normally live for hours or days, not weeks. Large initiatives MUST be split into integrable vertical increments or guarded behind incomplete/unreachable code paths or feature flags where appropriate.

### Mobile release branches

A Mobile release branch is optional release-support machinery, not part of ordinary trunk development. Before Debtulator enters its first store-stabilization phase, no `release/mobile/**` branch SHOULD exist.

When a Mobile minor release enters store stabilization, create:

```text
release/mobile/X.Y
```

The release branch exists only while that Mobile line is actively supported. It is not a second development trunk, and new feature development continues from `main`.

### Remote release branches

Remote normally has **no long-lived release branch**. The deployed Remote version is identified by an immutable `remote-vX.Y.Z` tag.

## Current enforcement gap

The trunk cutover is complete, but repository-host enforcement still lags this policy: as of 2026-09-18, GitHub reports `main` as unprotected with no required status checks.

A repository-administration follow-up MUST configure branch protection/rulesets so that `main`:

- cannot be force-pushed or deleted through ordinary workflows;
- requires reviewed pull requests for normal integration;
- requires the applicable CI checks; and
- enforces linear history.

Until those controls are enabled, engineers MUST follow these rules manually; the absence of server-side enforcement is not permission to bypass them.

## Commit rules

A commit MUST:

- represent one coherent change;
- have a meaningful message;
- leave touched code in a defensible state;
- include tests when behavior changes;
- include required migrations with the code that depends on them;
- update affected `docs/USER_STORIES.md` implementation statuses when warranted.

Do not commit generated build output, secrets, local `.env` files, IDE state, or temporary debug artifacts.

Commits SHOULD be small enough to review but large enough to represent a complete thought.

## Pull requests

PRs are the normal integration mechanism.

A PR MUST include:

- purpose and scope;
- affected environments: Mobile, Local backend, Remote;
- test evidence;
- migration impact;
- API compatibility impact;
- release/backport implications when relevant;
- user-story status changes when relevant.

Before merge, the branch SHOULD be rebased onto the latest target branch. Merge commits from the target branch into the feature branch SHOULD NOT be used to resolve routine divergence.

## Merge policy

The repository SHOULD use **rebase-and-merge** for reviewed PRs to preserve linear history.

Meaningful, intentionally structured commits SHOULD be preserved. Squash merge MAY be used when the branch history is purely iterative/noisy and the final change is logically one commit.

Merge commits into `main` are prohibited except for an explicitly documented recovery operation.

## Rebasing and force pushes

Feature branches MAY be rebased and force-pushed with:

```text
--force-with-lease
```

Never use an unguarded force push.

`main`, release branches, and published tags MUST NOT be force-pushed as part of normal development.

## Backports

Fixes for an older supported Mobile release MUST normally:

1. land on `main`;
2. pass current CI;
3. be cherry-picked to `release/mobile/X.Y`;
4. pass release-line CI;
5. produce a new patch release.

Do not merge a release branch back into `main` merely to return the backport.

## Hotfixes

### Mobile

Create the fix against `main`, then backport to the supported Mobile release branch when the released line needs it.

### Remote

If production can safely deploy current `main`, fix on `main` and release normally.

If production must be patched without deploying newer trunk changes, an emergency branch MAY be created from the current production tag:

```text
hotfix/remote/<description>
```

The exact fix MUST be forward-ported to `main` immediately. The emergency line ends after the tagged patch deployment.

## Worktrees

Git worktrees are encouraged for parallel isolated work.

A worktree is a checkout location, not a branch category. Worktree directory names MUST NOT determine architecture or branch policy.

Scripts and automation MUST resolve repository/worktree identity through Git rather than assuming the caller's current directory.

## Branch cleanup

Merged short-lived branches SHOULD be deleted promptly.

Do not keep branches as archives. Immutable tags and Git history are the archival mechanism.
