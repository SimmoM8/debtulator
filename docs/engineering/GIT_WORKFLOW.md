# Git Workflow

## Operating contract

```text
Trunk branch: main
Local trunk commits: permitted
Remote direct trunk pushes: prohibited
Task branches: very short-lived
Stale private branch strategy: rebase
Integration strategy: squash
Remote integration boundary: pull request
PR administration: automated where safe
Automated integration command: ./scripts/ship
CI state: mature for the current merge-level scope
Required CI: CI / Integration Gate
Auto-merge: enabled when repository policy is verified
Branch cleanup: automatic after verified integration
Commit convention: Conventional-Commits-inspired
```

Debtulator uses **trunk-based development with short-lived task branches**, plus temporary Mobile release branches only while an actual store line is being stabilized or supported.

Debtulator does **not** use classic Git Flow. There is no permanent `develop`, frontend, backend, integration, staging, or release-development branch. `main` is the single permanent development trunk.

## Local `main` and protected `origin/main`

Debtulator deliberately distinguishes two roles that share the name `main`:

- **local `main`** is a normal developer workspace; and
- **`origin/main`** is the protected shared integration boundary.

Developers MAY edit, stage, and create focused local commits directly on local `main`. A local commit on `main` is not a remote-trunk change and does not bypass GitHub protection.

For work known in advance to be substantial, risky, concurrent, multi-session, or likely to contain several independent changes, create the short-lived task branch before starting.

When `./scripts/ship` is run from local `main` with unpublished commits, it MUST preserve those commits under a verified task-branch ref before moving local `main` back to `origin/main`. Unpublished commits MUST never be reset, moved, or discarded before another verified Git ref preserves them.

## Trunk

`main` MUST:

- contain integrated Mobile, Local-backend, and Remote code;
- remain buildable and testable as far as the current project stage allows;
- use linear history;
- accept normal remote integration only through pull requests;
- require the real `CI / Integration Gate` status check;
- remain protected from deletion and non-fast-forward updates; and
- remain the source from which ordinary task branches begin.

Direct pushes to `origin/main` are prohibited by repository policy. Local commits on local `main` remain permitted.

## Short-lived task branches

Task branches are temporary integration vehicles. They SHOULD normally live for hours or a small number of days, not weeks.

Debtulator retains its environment-first naming convention:

```text
<kind>/<environment>/<short-kebab-description>
```

Examples:

```text
feat/mobile/debt-request-screen
fix/local/sync-base-version
feat/remote/member-linking
ci/repo/protected-integration
```

The authoritative allowed kinds/environments are defined in [NAMING_CONVENTIONS.md](NAMING_CONVENTIONS.md).

Large initiatives MUST be split into integrable increments or guarded behind incomplete/unreachable code paths or feature flags where appropriate. Do not create long-lived feature branches merely to avoid integrating frequently.

## Commit convention

Debtulator uses a Conventional-Commits-inspired subject:

```text
type(optional-scope): imperative summary
```

Branch commits are meaningful development checkpoints. They do not all need to represent durable product history because ordinary integration uses squash.

A commit MUST:

- represent one coherent change;
- have a meaningful subject;
- leave touched code in a defensible state;
- include tests when behavior changes;
- include required migrations with the code that depends on them; and
- update affected `docs/USER_STORIES.md` implementation statuses when warranted.

Do not commit generated build output, secrets, local `.env` files, IDE state, or temporary debug artifacts.

The PR title has the stricter role: **it becomes the durable logical change recorded on `main`**.

## Rebase policy

Rebase is used to update a **private short-lived task branch** that has fallen behind `origin/main`.

The normal sequence is:

1. fetch current `origin/main`;
2. verify that rewriting the task branch is safe;
3. rebase the task branch onto `origin/main`;
4. rerun repository-appropriate validation; and
5. update the published task branch with `--force-with-lease` only when the rebase rewrote it.

Never use bare `--force`.

A published branch MUST NOT be rewritten automatically when ownership is ambiguous. `./scripts/ship` only auto-rewrites a published stale branch when the branch can be proven to be owned by the current authenticated user and managed by the ship workflow. Otherwise it stops.

Merge commits from `main` into ordinary task branches SHOULD NOT be used to resolve routine divergence.

## Squash integration policy

Squash merge is the normal integration mechanism from a completed task branch into `main`.

The intended distinction is:

- task-branch commits document development; and
- the PR title / squash commit documents durable trunk history.

GitHub merge commits and GitHub rebase-and-merge are disabled for ordinary trunk integration. The `main` ruleset permits squash as the sole normal PR merge method.

When a task branch contains several commits, use:

```bash
./scripts/ship --title "type(scope): durable logical change"
```

The supplied title MUST describe the complete logical change, not merely the last branch commit.

## Pull requests

Pull requests are the protected remote integration boundary, not manual ceremony.

`./scripts/ship` automates, where safe:

- local-main promotion;
- stale private-branch rebase;
- repository-appropriate local validation;
- task-branch publication;
- PR creation/update;
- PR title/body generation;
- GitHub policy verification;
- squash auto-merge configuration;
- required-CI observation;
- remote branch cleanup; and
- local trunk synchronization.

Real conflicts, failing checks, unsafe branch ownership, unexpected Git history, dirty worktrees, secret-sensitive paths, or material GitHub-policy drift stop automation rather than being hidden.

The generated PR records the task branch, relevant validation scope, branch commits, and the protected integration strategy. A manually created PR is not overwritten unless it contains the ship ownership marker for the current authenticated user.

## `ship`

The repository-native integration command is:

```bash
./scripts/ship
```

### Ship already-committed work

Run from a short-lived task branch, or from local `main` containing unpublished commits:

```bash
./scripts/ship
```

If several commits should become one durable squash commit, supply the final PR/squash title:

```bash
./scripts/ship --title "feat(cross/debts): add collaborative debt agreement"
```

### Deliberately commit and ship

To commit already-staged work and continue through integration:

```bash
./scripts/ship --commit "fix(local/sync): preserve outbox base version"
```

To deliberately stage the entire current working tree before committing:

```bash
./scripts/ship --commit "docs(repo): document protected integration" --all
```

`--all` is never implied. Without it, `--commit` requires already-staged changes and refuses unrelated unstaged/untracked work.

### Configure/verify GitHub integration policy

Run idempotently when repository settings are first adopted or suspected to have drifted:

```bash
./scripts/ship --setup
```

`--setup` inspects CI maturity before changing repository policy. It never invents required-check names. With the current foundation CI, it requires the real `CI / Integration Gate`, preserves stronger existing rules, configures squash-only integration, enables safe auto-merge, and verifies the resulting policy.

If suitable CI is absent or incomplete, `--setup` prepares only the policy that is safe for that maturity and leaves automated final integration deferred.

## Local-main promotion

When publication begins from local `main`, the conceptual transformation is:

```text
origin/main -> unpublished local commits on main
```

into:

```text
origin/main -> temporary task branch containing those commits
```

before local `main` moves.

The preservation sequence is deliberately conservative:

1. fetch `origin`;
2. derive/validate the durable title and task-branch name;
3. create a local task-branch ref at the unpublished `HEAD`;
4. verify that the new ref resolves to the exact unpublished `HEAD`;
5. switch to the preserved task branch; and only then
6. synchronize the local `main` ref to `origin/main`.

No hard reset of unpublished work is part of this process.

## Validation during `ship`

`ship` maps changed files to the repository's existing validation responsibilities.

- Mobile/Local changes use the current Mobile/Local quality/config checks.
- Remote changes use the Maven test and package checks.
- Changes to the ship helper run `node --test scripts/ship.test.mjs` locally.
- Documentation-only changes do not invent application validation that the current CI does not require.

GitHub remains authoritative for remote integration: a PR cannot complete while the required `CI / Integration Gate` is failing or missing.

Root integration-helper tests are not yet part of `.github/workflows/ci.yml`; that is documented as a CI follow-up rather than represented as existing protection.

## Failure and conflict handling

`ship` MUST stop when it cannot prove an operation is safe.

In particular it stops for:

- detached HEAD;
- repository-identity mismatch;
- unrelated dirty work;
- secret-sensitive changed paths;
- invalid commit/branch naming;
- ambiguous ownership of a published stale branch;
- semantic rebase conflicts;
- failing local validation;
- failing required CI;
- merge conflicts reported by GitHub;
- unexpected GitHub repository/ruleset policy; or
- inability to verify the merged squash commit on `origin/main`.

If an automated rebase conflicts, `ship` aborts that rebase and restores the pre-rebase branch state so the conflict can be resolved deliberately.

## Worktrees

Git worktrees are encouraged for parallel isolated work.

A worktree is a checkout location, not a branch category. Worktree directory names MUST NOT determine architecture or branch policy.

`ship` resolves Git identity through Git itself. After a verified merge it synchronizes an existing `main` worktree when one exists. It deliberately does **not** delete a live dedicated task worktree automatically; destructive worktree removal remains explicit.

## Branch cleanup

GitHub automatically deletes successfully merged remote task branches. `ship` verifies the merged commit is present on `origin/main` before destructive cleanup and removes a remaining remote task branch if necessary.

When the current worktree can safely return to `main`, `ship` synchronizes it and deletes the local squash-integrated task branch after the PR merge is verified. A task branch that remains checked out in another worktree is preserved until that worktree is explicitly removed.

Do not keep branches as archives. Durable squash commits, release tags, and Git history are the archival mechanisms.

## GitHub protection

The normal Debtulator target policy is:

- protect `main` through the active `main-trunk-protection` ruleset;
- require pull requests;
- require the real `CI / Integration Gate` check;
- require the branch to be up to date before merge;
- require conversation resolution;
- enforce the rules with no bypass actors;
- require linear history;
- block deletion and non-fast-forward updates;
- allow squash merge only;
- enable auto-merge;
- automatically delete merged head branches; and
- use the PR title as the squash commit title.

Debtulator is currently primarily single-maintainer, so the protected PR boundary does not invent a mandatory approval count. Review requirements can be raised when independent review becomes a real collaboration requirement.

Signed-commit requirements, merge queues, deployment gates, CodeQL gates, and similar controls are not required merely for ceremony. Add them only when a concrete repository risk or delivery requirement justifies them.

## Mobile release branches

A Mobile release branch is optional release-support machinery, not an ordinary development branch. Before Debtulator enters its first store-stabilization phase, no `release/mobile/**` branch SHOULD exist.

When a Mobile minor release enters store stabilization, create:

```text
release/mobile/X.Y
```

The release branch exists only while that Mobile line is actively supported. New feature development continues from `main`.

Fixes for an older supported Mobile release MUST normally:

1. land on `main`;
2. pass current CI;
3. be cherry-picked to `release/mobile/X.Y`;
4. pass release-line validation; and
5. produce a new patch release.

Do not merge a release branch back into `main` merely to return the backport.

## Remote hotfixes

Remote normally has no release branch. If production can safely deploy current `main`, fix on `main` and release normally.

If production must be patched without deploying newer trunk changes, an emergency branch MAY be created from the current production tag:

```text
hotfix/remote/<description>
```

The exact fix MUST be forward-ported to `main` immediately. The emergency line ends after the tagged patch deployment.

## Tags and releases

Tags identify immutable release/release-candidate source or preserved historical milestones; they are not routine task-completion markers.

Future release tags follow the conventions in [VERSIONING.md](VERSIONING.md), including:

```text
mobile-vX.Y.Z
mobile-vX.Y.Z-rc.N
remote-vX.Y.Z
```

Existing `milestone/*` and other historical markers are preserved. New ordinary patches, conversations, completed tasks, or transient development phases SHOULD NOT receive milestone tags merely as checkpoints.

Published release tags MUST never be rewritten automatically.
