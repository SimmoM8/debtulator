#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export const EXPECTED_REPOSITORY = "SimmoM8/debtulator";
export const TRUNK_BRANCH = "main";
export const REQUIRED_CHECK = "CI / Integration Gate";
export const RULESET_NAME = "main-trunk-protection";
export const SHIP_MARKER_VERSION = "v1";

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const COMMIT_TYPES = new Set([
  "feat",
  "fix",
  "refactor",
  "perf",
  "test",
  "docs",
  "build",
  "ci",
  "chore",
  "revert",
]);

const BRANCH_TYPES = new Set([
  "feat",
  "fix",
  "refactor",
  "perf",
  "test",
  "docs",
  "ci",
  "build",
  "chore",
  "hotfix",
]);

const BRANCH_ENVIRONMENTS = new Set([
  "mobile",
  "local",
  "remote",
  "cross",
  "repo",
]);

function fail(message) {
  const error = new Error(message);
  error.name = "ShipError";
  throw error;
}

function sleep(milliseconds) {
  const buffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buffer), 0, 0, milliseconds);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    input: options.input,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    const details = [result.stderr, result.stdout]
      .filter(Boolean)
      .join("\n")
      .trim();
    fail(
      `${command} ${args.join(" ")} failed with exit code ${result.status}` +
        (details ? `\n${details}` : ""),
    );
  }

  return {
    status: result.status ?? 1,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function git(args, options = {}) {
  return run("git", args, options);
}

function gh(args, options = {}) {
  return run("gh", args, options);
}

function runVisible(command, args, options = {}) {
  const result = run(command, args, { ...options, stdio: "inherit", allowFailure: true });
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function gitVisible(args, options = {}) {
  runVisible("git", args, options);
}

function ghVisible(args, options = {}) {
  runVisible("gh", args, options);
}

export function parseArgs(argv) {
  const parsed = {
    commit: null,
    title: null,
    all: false,
    setup: false,
    help: false,
  };

  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--") {
      continue;
    }
    if (argument === "--all") {
      parsed.all = true;
      continue;
    }
    if (argument === "--setup") {
      parsed.setup = true;
      continue;
    }
    if (argument === "--help" || argument === "-h") {
      parsed.help = true;
      continue;
    }
    if (argument === "--commit" || argument === "--title") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        fail(`${argument} requires a value.`);
      }
      parsed[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--commit=")) {
      parsed.commit = argument.slice("--commit=".length);
      continue;
    }
    if (argument.startsWith("--title=")) {
      parsed.title = argument.slice("--title=".length);
      continue;
    }

    fail(`Unknown ship argument: ${argument}`);
  }

  if (parsed.all && !parsed.commit) {
    fail("--all is only valid together with --commit.");
  }
  if (parsed.setup && (parsed.commit || parsed.title || parsed.all)) {
    fail("--setup cannot be combined with commit or integration arguments.");
  }

  return parsed;
}

export function parseConventionalCommit(subject) {
  if (typeof subject !== "string" || subject.length === 0 || subject.length > 120) {
    return null;
  }

  const match = subject.match(
    /^(feat|fix|refactor|perf|test|docs|build|ci|chore|revert)(?:\(([a-z0-9][a-z0-9/-]*)\))?: ([a-z0-9].*)$/,
  );
  if (!match || !COMMIT_TYPES.has(match[1])) {
    return null;
  }

  return {
    type: match[1],
    scope: match[2] ?? null,
    summary: match[3],
  };
}

export function validateConventionalCommit(subject) {
  const parsed = parseConventionalCommit(subject);
  if (!parsed) {
    fail(
      `Invalid commit/PR title: ${JSON.stringify(subject)}. Expected ` +
        "type(optional-scope): imperative summary using an approved Conventional Commit type.",
    );
  }
  return parsed;
}

function slugifySummary(summary) {
  return summary
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 52)
    .replace(/-+$/g, "");
}

export function deriveBranchName(subject) {
  const parsed = validateConventionalCommit(subject);
  const kind = parsed.type === "revert" ? "fix" : parsed.type;
  const scopeEnvironment = parsed.scope?.split("/")[0] ?? null;
  const environment = BRANCH_ENVIRONMENTS.has(scopeEnvironment)
    ? scopeEnvironment
    : "repo";
  const description = slugifySummary(parsed.summary);

  if (!description) {
    fail("Could not derive a branch description from the commit/PR title.");
  }

  return `${kind}/${environment}/${description}`;
}

export function validateTaskBranch(branch) {
  const match = branch.match(/^([^/]+)\/([^/]+)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (!match) {
    return false;
  }
  return BRANCH_TYPES.has(match[1]) && BRANCH_ENVIRONMENTS.has(match[2]);
}

export function normalizeRemote(remote) {
  if (!remote) {
    return null;
  }

  const value = remote.trim().replace(/\/$/, "");
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/i,
    /^git:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/i,
    /^ssh:\/\/git@github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/i,
    /^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      return match[1].replace(/\.git$/i, "");
    }
  }

  return null;
}

export function classifyLocalMainState({ ahead, behind }) {
  if (ahead > 0 && behind > 0) return "diverged";
  if (ahead > 0) return "ahead";
  if (behind > 0) return "behind";
  return "synced";
}

export function decideRebase({ trunkIsAncestor, hasCommits }) {
  if (!hasCommits) return "nothing-to-ship";
  return trunkIsAncestor ? "current" : "rebase";
}

export function canRewritePublishedBranch({
  remoteExists,
  managedByShip,
  ownerMatches,
  remoteTipIsAncestor,
}) {
  if (!remoteExists) return true;
  return managedByShip && ownerMatches && remoteTipIsAncestor;
}

export function buildExpectedRepositoryPolicy({ ciMature }) {
  return {
    merge: {
      allowSquashMerge: true,
      allowMergeCommit: false,
      allowRebaseMerge: false,
      allowAutoMerge: ciMature,
      deleteBranchOnMerge: true,
      allowUpdateBranch: false,
      squashMergeCommitTitle: "PR_TITLE",
    },
    rules: {
      deletion: true,
      nonFastForward: true,
      linearHistory: true,
      pullRequest: true,
      conversationResolution: true,
      allowedMergeMethods: ["squash"],
      strictRequiredChecks: ciMature,
      requiredChecks: ciMature ? [REQUIRED_CHECK] : [],
    },
  };
}

export function normalizeRulesetPolicy(ruleset) {
  const rules = Array.isArray(ruleset?.rules) ? ruleset.rules : [];
  const byType = new Map(rules.map((rule) => [rule.type, rule]));
  const pullRequest = byType.get("pull_request")?.parameters ?? null;
  const requiredStatus = byType.get("required_status_checks")?.parameters ?? null;

  return {
    active: ruleset?.enforcement === "active",
    targetsDefaultBranch:
      ruleset?.conditions?.ref_name?.include?.includes("~DEFAULT_BRANCH") ?? false,
    noBypassActors: (ruleset?.bypass_actors?.length ?? 0) === 0,
    deletion: byType.has("deletion"),
    nonFastForward: byType.has("non_fast_forward"),
    linearHistory: byType.has("required_linear_history"),
    pullRequest: Boolean(pullRequest),
    conversationResolution: pullRequest?.required_review_thread_resolution === true,
    allowedMergeMethods: [...(pullRequest?.allowed_merge_methods ?? [])].sort(),
    strictRequiredChecks: requiredStatus?.strict_required_status_checks_policy === true,
    requiredChecks: [...(requiredStatus?.required_status_checks ?? [])]
      .map((check) => check.context)
      .filter(Boolean)
      .sort(),
  };
}

function printHelp() {
  console.log(`Debtulator protected integration helper

Usage:
  ./scripts/ship
  ./scripts/ship --title "type(scope): durable squash title"
  ./scripts/ship --commit "type(scope): commit summary" [--all]
  ./scripts/ship --setup

Behavior:
  - ships committed work from a short-lived task branch;
  - safely promotes unpublished local-main commits to a task branch;
  - rebases stale private ship-managed branches onto origin/main;
  - validates affected repository areas;
  - creates/updates the PR and enables squash auto-merge;
  - observes the real required CI gate;
  - cleans the remote task branch and synchronizes local main.

Safety:
  --all is never implied. Rewrites use --force-with-lease only. Shared or
  ambiguously-owned published branches are never rewritten automatically.`);
}

function requireCommand(command) {
  const result = run(command, ["--version"], { allowFailure: true });
  if (result.status !== 0) {
    fail(`Required command is unavailable: ${command}`);
  }
}

function repositoryRoot() {
  const result = git(["rev-parse", "--show-toplevel"], {
    cwd: SCRIPT_ROOT,
    allowFailure: true,
  });
  if (result.status !== 0 || !result.stdout) {
    fail("ship could not resolve its containing Git worktree.");
  }
  return resolve(result.stdout);
}

function currentBranch(cwd) {
  const result = git(["symbolic-ref", "--quiet", "--short", "HEAD"], {
    cwd,
    allowFailure: true,
  });
  if (result.status !== 0 || !result.stdout) {
    fail("Detached HEAD is not supported by ship.");
  }
  return result.stdout;
}

function verifyRepositoryIdentity(cwd) {
  const remote = git(["remote", "get-url", "origin"], { cwd }).stdout;
  const normalized = normalizeRemote(remote);
  if (!normalized || normalized.toLowerCase() !== EXPECTED_REPOSITORY.toLowerCase()) {
    fail(
      `Repository identity mismatch. Expected ${EXPECTED_REPOSITORY}, got ${remote || "<none>"}.`,
    );
  }
}

function statusPorcelain(cwd) {
  return git(["status", "--porcelain=v1", "--untracked-files=all"], { cwd }).stdout;
}

function assertClean(cwd, context = "ship") {
  const status = statusPorcelain(cwd);
  if (status) {
    fail(
      `${context} requires a clean working tree. Commit or deliberately stage the intended work first:\n${status}`,
    );
  }
}

function hasStagedChanges(cwd) {
  return git(["diff", "--cached", "--quiet"], { cwd, allowFailure: true }).status === 1;
}

function hasUnstagedOrUntrackedChanges(cwd) {
  const unstaged = git(["diff", "--quiet"], { cwd, allowFailure: true }).status === 1;
  const untracked = git(["ls-files", "--others", "--exclude-standard"], { cwd }).stdout;
  return unstaged || Boolean(untracked);
}

function changedPaths(cwd, range = `${TRUNK_BRANCH}...HEAD`) {
  const result = git(["diff", "--name-only", range], { cwd, allowFailure: true });
  if (result.status !== 0) {
    return [];
  }
  return result.stdout ? result.stdout.split("\n").filter(Boolean) : [];
}

function stagedPaths(cwd) {
  const output = git(["diff", "--cached", "--name-only", "--diff-filter=ACMRTUXB"], {
    cwd,
  }).stdout;
  return output ? output.split("\n").filter(Boolean) : [];
}

export function isSensitivePath(path) {
  const normalized = path.replace(/\\/g, "/");
  const name = basename(normalized);
  const lower = name.toLowerCase();

  if (/^\.env(?:\.|$)/i.test(name) && !/\.example$/i.test(name)) {
    return true;
  }
  if (/\.(pem|key|p8|p12|jks|mobileprovision)$/i.test(lower)) {
    return true;
  }
  if (/^(id_rsa|id_ed25519)(\.pub)?$/i.test(lower)) {
    return true;
  }
  return false;
}

function assertNoSensitivePaths(paths) {
  const sensitive = paths.filter(isSensitivePath);
  if (sensitive.length > 0) {
    fail(`Refusing to ship secret-sensitive paths:\n${sensitive.map((path) => `- ${path}`).join("\n")}`);
  }
}

function createCommitIfRequested(cwd, options) {
  if (!options.commit) return;

  validateConventionalCommit(options.commit);

  if (options.all) {
    gitVisible(["add", "-A"], { cwd });
  } else {
    if (!hasStagedChanges(cwd)) {
      fail("--commit without --all requires already-staged changes.");
    }
    if (hasUnstagedOrUntrackedChanges(cwd)) {
      fail(
        "Unstaged or untracked work is present. ship will not guess whether it belongs in the commit. " +
          "Stage it deliberately, use --all deliberately, or clean the unrelated work.",
      );
    }
  }

  if (!hasStagedChanges(cwd)) {
    fail("There are no staged changes to commit.");
  }
  assertNoSensitivePaths(stagedPaths(cwd));
  gitVisible(["commit", "-m", options.commit], { cwd });
}

function fetchOrigin(cwd) {
  gitVisible(["fetch", "--prune", "origin"], { cwd });
}

function revExists(cwd, ref) {
  return git(["show-ref", "--verify", "--quiet", ref], { cwd, allowFailure: true }).status === 0;
}

function revParse(cwd, ref) {
  return git(["rev-parse", ref], { cwd }).stdout;
}

function isAncestor(cwd, ancestor, descendant) {
  return (
    git(["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd,
      allowFailure: true,
    }).status === 0
  );
}

function aheadBehind(cwd, left, right) {
  const output = git(["rev-list", "--left-right", "--count", `${left}...${right}`], {
    cwd,
  }).stdout;
  const [leftOnly, rightOnly] = output.split(/\s+/).map(Number);
  return { behind: leftOnly, ahead: rightOnly };
}

function branchCommitCount(cwd) {
  return Number(git(["rev-list", "--count", `origin/${TRUNK_BRANCH}..HEAD`], { cwd }).stdout);
}

function branchSubjects(cwd) {
  const output = git(
    ["log", "--reverse", "--format=%h%x09%s", `origin/${TRUNK_BRANCH}..HEAD`],
    { cwd },
  ).stdout;
  return output ? output.split("\n") : [];
}

function resolveDurableTitle(cwd, requestedTitle) {
  if (requestedTitle) {
    validateConventionalCommit(requestedTitle);
    return requestedTitle;
  }

  const count = branchCommitCount(cwd);
  if (count === 0) {
    fail("There are no commits to ship.");
  }
  if (count > 1) {
    fail(
      `This branch contains ${count} commits. Supply --title so the durable squash commit describes the complete logical change.`,
    );
  }

  const subject = git(["log", "-1", "--format=%s"], { cwd }).stdout;
  validateConventionalCommit(subject);
  return subject;
}

function uniqueBranchName(cwd, base) {
  let candidate = base;
  let suffix = 2;
  while (
    revExists(cwd, `refs/heads/${candidate}`) ||
    revExists(cwd, `refs/remotes/origin/${candidate}`)
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function promoteLocalMain(cwd, branchName) {
  const unpublishedHead = revParse(cwd, "HEAD");
  gitVisible(["branch", branchName, unpublishedHead], { cwd });

  const preserved = revParse(cwd, `refs/heads/${branchName}`);
  if (preserved !== unpublishedHead) {
    fail("Failed to verify the preservation branch before moving local main.");
  }

  gitVisible(["switch", branchName], { cwd });
  gitVisible(["branch", "-f", TRUNK_BRANCH, `origin/${TRUNK_BRANCH}`], { cwd });

  const synchronizedMain = revParse(cwd, `refs/heads/${TRUNK_BRANCH}`);
  const remoteMain = revParse(cwd, `refs/remotes/origin/${TRUNK_BRANCH}`);
  if (synchronizedMain !== remoteMain) {
    fail("Local main did not synchronize to origin/main after preservation.");
  }

  return unpublishedHead;
}

function prepareLocalMain(cwd, requestedTitle) {
  const divergence = aheadBehind(cwd, `origin/${TRUNK_BRANCH}`, TRUNK_BRANCH);
  const state = classifyLocalMainState(divergence);

  if (state === "synced") {
    fail("Local main is synchronized with origin/main and has no committed work to ship.");
  }
  if (state === "behind") {
    gitVisible(["merge", "--ff-only", `origin/${TRUNK_BRANCH}`], { cwd });
    fail("Local main was behind origin/main and is now synchronized; there was no unpublished work to ship.");
  }

  const title = resolveDurableTitle(cwd, requestedTitle);
  const baseBranch = deriveBranchName(title);
  const branch = uniqueBranchName(cwd, baseBranch);
  const unpublishedHead = revParse(cwd, "HEAD");

  promoteLocalMain(cwd, branch);

  if (revParse(cwd, branch) !== unpublishedHead) {
    fail("Promotion invariant failed: unpublished local-main commits were not preserved.");
  }

  return { branch, title };
}

function shipMarker(login) {
  return `<!-- debtulator-ship:${SHIP_MARKER_VERSION} owner=${login} -->`;
}

export function isShipManagedBody(body, login) {
  return typeof body === "string" && body.includes(shipMarker(login));
}

function currentGitHubLogin() {
  const output = gh(["api", "user", "--jq", ".login"]).stdout;
  if (!output) {
    fail("Unable to determine the authenticated GitHub user from gh.");
  }
  return output;
}

function remoteBranchExists(cwd, branch) {
  return revExists(cwd, `refs/remotes/origin/${branch}`);
}

function findOpenPullRequest(branch) {
  const output = gh([
    "pr",
    "list",
    "--repo",
    EXPECTED_REPOSITORY,
    "--head",
    branch,
    "--base",
    TRUNK_BRANCH,
    "--state",
    "open",
    "--limit",
    "1",
    "--json",
    "number,title,body,url,author,headRefName,headRepositoryOwner",
  ]).stdout;
  const parsed = JSON.parse(output || "[]");
  return parsed[0] ?? null;
}

function assertPublishedRewriteSafe(cwd, branch, login) {
  const remoteExists = remoteBranchExists(cwd, branch);
  if (!remoteExists) return null;

  const remoteRef = `refs/remotes/origin/${branch}`;
  const remoteSha = revParse(cwd, remoteRef);
  const remoteTipIsAncestor = isAncestor(cwd, remoteRef, "HEAD");
  const pr = findOpenPullRequest(branch);
  const managedByShip = Boolean(pr && isShipManagedBody(pr.body, login));
  const ownerMatches = pr?.author?.login === login;

  if (
    !canRewritePublishedBranch({
      remoteExists,
      managedByShip,
      ownerMatches,
      remoteTipIsAncestor,
    })
  ) {
    fail(
      `Published branch ${branch} is stale but cannot be proven private and ship-managed. ` +
        "Refusing to rewrite it automatically. Rebase it manually or use a new private task branch.",
    );
  }

  return remoteSha;
}

function rebaseOntoTrunk(cwd, branch, login) {
  if (isAncestor(cwd, `origin/${TRUNK_BRANCH}`, "HEAD")) {
    return { rewritten: false, previousRemoteSha: null };
  }

  const previousRemoteSha = assertPublishedRewriteSafe(cwd, branch, login);
  const result = git(["rebase", `origin/${TRUNK_BRANCH}`], { cwd, allowFailure: true, stdio: "inherit" });
  if (result.status !== 0) {
    git(["rebase", "--abort"], { cwd, allowFailure: true });
    fail(
      "Rebase stopped because of conflicts. The rebase was aborted to restore the pre-rebase branch state. " +
        "Resolve the semantic conflict manually, validate it, then run ship again.",
    );
  }

  return { rewritten: true, previousRemoteSha };
}

function classifyValidation(paths) {
  let mobile = false;
  let remote = false;
  let shipTests = false;

  for (const path of paths) {
    if (path === "schema_local.sql" || path.startsWith("mobile/")) mobile = true;
    if (path === "schema_remote.sql" || path.startsWith("backend/")) remote = true;
    if (
      path.startsWith("config/") ||
      path.startsWith("supabase/") ||
      path.startsWith(".github/")
    ) {
      mobile = true;
      remote = true;
    }
    if (path === "scripts/ship" || path === "scripts/ship.mjs" || path === "scripts/ship.test.mjs") {
      shipTests = true;
    }
  }

  return { mobile, remote, shipTests };
}

function runValidation(cwd) {
  const paths = changedPaths(cwd, `origin/${TRUNK_BRANCH}...HEAD`);
  assertNoSensitivePaths(paths);
  const scope = classifyValidation(paths);

  if (scope.shipTests) {
    console.log("\n[ship] Running integration-helper tests...");
    runVisible("node", ["--test", "scripts/ship.test.mjs"], { cwd });
  }

  if (scope.mobile) {
    console.log("\n[ship] Running Mobile + Local validation...");
    runVisible("npx", ["expo", "customize", "tsconfig.json"], {
      cwd: resolve(cwd, "mobile"),
      env: { CI: "1" },
    });
    runVisible("npm", ["run", "quality"], { cwd: resolve(cwd, "mobile") });
    runVisible("npx", ["expo", "install", "--check"], {
      cwd: resolve(cwd, "mobile"),
      env: { CI: "1" },
    });
    runVisible("npx", ["expo", "config", "--type", "public"], {
      cwd: resolve(cwd, "mobile"),
      stdio: "ignore",
    });
  }

  if (scope.remote) {
    console.log("\n[ship] Running Remote validation...");
    runVisible("./mvnw", ["-B", "-ntp", "test"], { cwd: resolve(cwd, "backend") });
    runVisible("./mvnw", ["-B", "-ntp", "-DskipTests", "package"], {
      cwd: resolve(cwd, "backend"),
    });
  }

  assertClean(cwd, "Validation");
  return scope;
}

function publishBranch(cwd, branch, rewritten, previousRemoteSha) {
  if (!remoteBranchExists(cwd, branch)) {
    gitVisible(["push", "-u", "origin", `HEAD:refs/heads/${branch}`], { cwd });
    fetchOrigin(cwd);
    return;
  }

  if (rewritten) {
    if (!previousRemoteSha) {
      fail("A rewritten published branch is missing its lease SHA.");
    }
    gitVisible(
      [
        "push",
        `--force-with-lease=refs/heads/${branch}:${previousRemoteSha}`,
        "origin",
        `HEAD:refs/heads/${branch}`,
      ],
      { cwd },
    );
  } else {
    gitVisible(["push", "origin", `HEAD:refs/heads/${branch}`], { cwd });
  }
  fetchOrigin(cwd);
}

function buildPullRequestBody(cwd, branch, login, validationScope) {
  const commits = branchSubjects(cwd);
  const scopes = [
    validationScope.mobile ? "Mobile + Local" : null,
    validationScope.remote ? "Remote" : null,
    validationScope.shipTests ? "Repository integration tooling" : null,
  ].filter(Boolean);

  return `${shipMarker(login)}

## Summary

Protected integration for \`${branch}\`.

## Scope

${scopes.length ? scopes.map((scope) => `- ${scope}`).join("\n") : "- Documentation / repository policy only"}

## Commits

${commits.map((commit) => `- \`${commit}\``).join("\n")}

## Validation

- Repository-appropriate local validation completed by \`./scripts/ship\`.
- GitHub integration is gated by the repository's required \`${REQUIRED_CHECK}\` check.

## Integration

- Target: \`${TRUNK_BRANCH}\`
- Strategy: squash
- Branch cleanup: automatic after verified merge
`;
}

function upsertPullRequest(cwd, branch, title, login, validationScope) {
  const body = buildPullRequestBody(cwd, branch, login, validationScope);
  const existing = findOpenPullRequest(branch);

  if (existing) {
    if (!isShipManagedBody(existing.body, login) || existing.author?.login !== login) {
      fail(
        `An open PR already exists for ${branch}, but it is not proven to be owned by this ship workflow. ` +
          "Refusing to overwrite its metadata.",
      );
    }
    ghVisible([
      "pr",
      "edit",
      String(existing.number),
      "--repo",
      EXPECTED_REPOSITORY,
      "--title",
      title,
      "--body",
      body,
    ]);
    return existing.number;
  }

  const output = gh([
    "pr",
    "create",
    "--repo",
    EXPECTED_REPOSITORY,
    "--base",
    TRUNK_BRANCH,
    "--head",
    branch,
    "--title",
    title,
    "--body",
    body,
  ]).stdout;

  const numberMatch = output.match(/\/pull\/(\d+)(?:\s|$)/);
  if (!numberMatch) {
    const created = findOpenPullRequest(branch);
    if (!created) {
      fail(`PR creation returned an unexpected result: ${output}`);
    }
    return created.number;
  }
  return Number(numberMatch[1]);
}

function inspectCiMaturity(cwd) {
  const workflowPath = resolve(cwd, ".github/workflows/ci.yml");
  if (!existsSync(workflowPath)) {
    return { state: "absent", reason: "No .github/workflows/ci.yml exists." };
  }

  const workflow = readFileSync(workflowPath, "utf8");
  if (!workflow.includes(`name: ${REQUIRED_CHECK}`)) {
    return {
      state: "partial",
      reason: `The workflow does not expose ${REQUIRED_CHECK}.`,
    };
  }

  const checks = gh(
    [
      "api",
      `repos/${EXPECTED_REPOSITORY}/commits/${TRUNK_BRANCH}/check-runs`,
      "-H",
      "Accept: application/vnd.github+json",
    ],
    { allowFailure: true },
  );
  if (checks.status !== 0) {
    return { state: "partial", reason: "Unable to verify recent GitHub check runs." };
  }

  const parsed = JSON.parse(checks.stdout || "{}");
  const integrationChecks = (parsed.check_runs ?? []).filter(
    (check) => check.name === REQUIRED_CHECK,
  );
  const successful = integrationChecks.some((check) => check.conclusion === "success");
  if (!successful) {
    return {
      state: "partial",
      reason: `${REQUIRED_CHECK} has not produced a verified successful run on current main.`,
    };
  }

  return { state: "mature", reason: `${REQUIRED_CHECK} exists and has a successful main run.` };
}

function getRepositorySettings() {
  return JSON.parse(gh(["api", `repos/${EXPECTED_REPOSITORY}`]).stdout);
}

function getRuleset() {
  const list = JSON.parse(gh(["api", `repos/${EXPECTED_REPOSITORY}/rulesets`]).stdout || "[]");
  const summary = list.find((ruleset) => ruleset.name === RULESET_NAME);
  if (!summary) return null;
  return JSON.parse(
    gh(["api", `repos/${EXPECTED_REPOSITORY}/rulesets/${summary.id}`]).stdout,
  );
}

function verifyRepositoryPolicy({ requireCi = true } = {}) {
  const repository = getRepositorySettings();
  const ruleset = getRuleset();
  const problems = [];

  if (repository.allow_squash_merge !== true) problems.push("squash merge is disabled");
  if (repository.allow_merge_commit !== false) problems.push("merge commits are enabled");
  if (repository.allow_rebase_merge !== false) problems.push("GitHub rebase-and-merge is enabled");
  if (repository.delete_branch_on_merge !== true) problems.push("merged branches are not auto-deleted");
  if (repository.allow_update_branch !== false) problems.push("GitHub update-branch merging is enabled");
  if (repository.squash_merge_commit_title !== "PR_TITLE") {
    problems.push("squash commit title is not configured to use the PR title");
  }
  if (requireCi && repository.allow_auto_merge !== true) problems.push("auto-merge is disabled");

  if (!ruleset) {
    problems.push(`ruleset ${RULESET_NAME} is missing`);
  } else {
    const policy = normalizeRulesetPolicy(ruleset);
    if (!policy.active) problems.push("main ruleset is not active");
    if (!policy.targetsDefaultBranch) problems.push("main ruleset does not target the default branch");
    if (!policy.noBypassActors) problems.push("main ruleset contains bypass actors");
    if (!policy.deletion) problems.push("main deletion protection is missing");
    if (!policy.nonFastForward) problems.push("main non-fast-forward protection is missing");
    if (!policy.linearHistory) problems.push("linear history is not required");
    if (!policy.pullRequest) problems.push("pull requests are not required");
    if (!policy.conversationResolution) problems.push("conversation resolution is not required");
    if (JSON.stringify(policy.allowedMergeMethods) !== JSON.stringify(["squash"])) {
      problems.push("ruleset does not permit squash as the sole merge method");
    }
    if (requireCi) {
      if (!policy.strictRequiredChecks) problems.push("required checks are not strict/up-to-date");
      if (!policy.requiredChecks.includes(REQUIRED_CHECK)) {
        problems.push(`required check ${REQUIRED_CHECK} is missing`);
      }
    }
  }

  if (problems.length > 0) {
    fail(
      "GitHub integration policy differs from Debtulator's expected protected-trunk policy:\n" +
        problems.map((problem) => `- ${problem}`).join("\n") +
        "\nRun ./scripts/ship --setup after reviewing the reported drift.",
    );
  }
}

function ensureNoLegacyBranchProtection() {
  const result = gh(
    ["api", `repos/${EXPECTED_REPOSITORY}/branches/${TRUNK_BRANCH}/protection`],
    { allowFailure: true },
  );

  if (result.status === 0) {
    fail(
      "A legacy branch-protection rule also targets main. GitHub layers it with rulesets. " +
        "ship --setup refuses to mutate policy until that overlapping rule is intentionally reconciled.",
    );
  }

  if (!/404|Branch not protected|Not Found/i.test(`${result.stderr}\n${result.stdout}`)) {
    fail(
      "Unable to determine whether legacy branch protection also targets main. Refusing policy mutation because layered protection cannot be verified.",
    );
  }
}

function mergeRule(existingRules, type, defaultRule) {
  const existing = existingRules.find((rule) => rule.type === type);
  return existing ? structuredClone(existing) : structuredClone(defaultRule);
}

export function buildDesiredRuleset(existingRuleset, { ciMature }) {
  const existingRules = Array.isArray(existingRuleset?.rules) ? existingRuleset.rules : [];
  if ((existingRuleset?.bypass_actors?.length ?? 0) > 0) {
    fail("Existing main-trunk-protection contains bypass actors; setup will not remove unknown bypasses automatically.");
  }

  const retainedTypes = new Set([
    "deletion",
    "non_fast_forward",
    "required_linear_history",
    "pull_request",
    "required_status_checks",
  ]);
  const extraRules = existingRules
    .filter((rule) => !retainedTypes.has(rule.type))
    .map((rule) => structuredClone(rule));

  const pullRequest = mergeRule(existingRules, "pull_request", {
    type: "pull_request",
    parameters: {
      required_approving_review_count: 0,
      dismiss_stale_reviews_on_push: false,
      required_reviewers: [],
      require_code_owner_review: false,
      require_last_push_approval: false,
      required_review_thread_resolution: true,
      require_extra_approval_for_unattributed_changes: true,
      allowed_merge_methods: ["squash"],
    },
  });
  pullRequest.parameters = {
    ...pullRequest.parameters,
    required_review_thread_resolution: true,
    allowed_merge_methods: ["squash"],
  };

  const desiredRules = [
    { type: "deletion" },
    { type: "non_fast_forward" },
    { type: "required_linear_history" },
    pullRequest,
  ];

  if (ciMature) {
    const status = mergeRule(existingRules, "required_status_checks", {
      type: "required_status_checks",
      parameters: {
        strict_required_status_checks_policy: true,
        do_not_enforce_on_create: false,
        required_status_checks: [],
      },
    });
    const checks = [...(status.parameters?.required_status_checks ?? [])];
    if (!checks.some((check) => check.context === REQUIRED_CHECK)) {
      checks.push({ context: REQUIRED_CHECK });
    }
    status.parameters = {
      ...status.parameters,
      strict_required_status_checks_policy: true,
      required_status_checks: checks,
    };
    desiredRules.push(status);
  } else {
    const existingStatus = existingRules.find((rule) => rule.type === "required_status_checks");
    if (existingStatus) {
      desiredRules.push(structuredClone(existingStatus));
    }
  }

  desiredRules.push(...extraRules);

  return {
    name: RULESET_NAME,
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: existingRuleset?.conditions ?? {
      ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
    },
    rules: desiredRules,
  };
}

function configureRepositorySettings(ciMature) {
  const args = [
    "api",
    "-X",
    "PATCH",
    `repos/${EXPECTED_REPOSITORY}`,
    "-F",
    "allow_squash_merge=true",
    "-F",
    "allow_merge_commit=false",
    "-F",
    "allow_rebase_merge=false",
    "-F",
    `allow_auto_merge=${ciMature ? "true" : "false"}`,
    "-F",
    "delete_branch_on_merge=true",
    "-F",
    "allow_update_branch=false",
    "-f",
    "squash_merge_commit_title=PR_TITLE",
    "-f",
    "squash_merge_commit_message=COMMIT_MESSAGES",
    "--silent",
  ];
  ghVisible(args);
}

function configureRuleset(ciMature) {
  const existing = getRuleset();
  const payload = buildDesiredRuleset(existing, { ciMature });
  const input = `${JSON.stringify(payload)}\n`;

  if (existing) {
    gh([
      "api",
      "-X",
      "PUT",
      `repos/${EXPECTED_REPOSITORY}/rulesets/${existing.id}`,
      "--input",
      "-",
    ], { input });
  } else {
    gh([
      "api",
      "-X",
      "POST",
      `repos/${EXPECTED_REPOSITORY}/rulesets`,
      "--input",
      "-",
    ], { input });
  }
}

function setupGitHub(cwd) {
  console.log("[ship] Inspecting GitHub repository policy...");
  ensureNoLegacyBranchProtection();
  const ci = inspectCiMaturity(cwd);
  const ciMature = ci.state === "mature";

  console.log(`[ship] CI state: ${ci.state} — ${ci.reason}`);
  console.log("[ship] Applying only maturity-appropriate repository settings...");

  configureRepositorySettings(ciMature);
  configureRuleset(ciMature);

  if (ciMature) {
    verifyRepositoryPolicy({ requireCi: true });
    console.log(`[ship] GitHub policy verified with required ${REQUIRED_CHECK}.`);
    console.log("[ship] Squash-only auto-merge is ready.");
  } else {
    verifyRepositoryPolicy({ requireCi: false });
    console.log(
      "[ship] Trunk/merge protection prepared, but required CI protection and automated integration remain deferred until CI is mature.",
    );
  }
}

function prState(number) {
  const output = gh([
    "pr",
    "view",
    String(number),
    "--repo",
    EXPECTED_REPOSITORY,
    "--json",
    "state,mergedAt,mergeCommit,mergeStateStatus,headRefOid,baseRefOid,url",
  ]).stdout;
  return JSON.parse(output);
}

function waitForRequiredChecks(number) {
  console.log(`\n[ship] Waiting for required GitHub checks (${REQUIRED_CHECK})...`);
  ghVisible([
    "pr",
    "checks",
    String(number),
    "--repo",
    EXPECTED_REPOSITORY,
    "--required",
    "--watch",
    "--interval",
    "10",
    "--fail-fast",
  ]);
}

function enableAutoMerge(number) {
  ghVisible([
    "pr",
    "merge",
    String(number),
    "--repo",
    EXPECTED_REPOSITORY,
    "--auto",
    "--squash",
    "--delete-branch",
  ]);
}

function refreshPublishedBranch(cwd, branch, login) {
  fetchOrigin(cwd);
  if (isAncestor(cwd, `origin/${TRUNK_BRANCH}`, "HEAD")) {
    return false;
  }

  const previousRemoteSha = assertPublishedRewriteSafe(cwd, branch, login);
  const result = rebaseOntoTrunk(cwd, branch, login);
  if (!result.rewritten) return false;

  runValidation(cwd);
  publishBranch(cwd, branch, true, previousRemoteSha ?? result.previousRemoteSha);
  return true;
}

function integratePullRequest(cwd, branch, number, title, login, validationScope) {
  verifyRepositoryPolicy({ requireCi: true });

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    enableAutoMerge(number);
    waitForRequiredChecks(number);

    for (let poll = 0; poll < 24; poll += 1) {
      const state = prState(number);
      if (state.state === "MERGED" || state.mergedAt) {
        return state;
      }

      if (state.mergeStateStatus === "BEHIND") {
        console.log("[ship] main advanced while CI was running; rebasing the private ship-managed branch...");
        refreshPublishedBranch(cwd, branch, login);
        upsertPullRequest(cwd, branch, title, login, validationScope);
        break;
      }

      if (state.mergeStateStatus === "DIRTY") {
        fail("GitHub reports merge conflicts. Automatic integration stopped.");
      }

      if (poll === 23) {
        fail(
          `Required checks passed, but PR #${number} did not merge. ` +
            `GitHub merge state is ${state.mergeStateStatus}. Inspect ${state.url}.`,
        );
      }
      sleep(2500);
    }
  }

  fail("main changed repeatedly during integration; automatic rebasing stopped after four attempts.");
}

function parseWorktrees(cwd) {
  const output = git(["worktree", "list", "--porcelain"], { cwd }).stdout;
  const entries = [];
  let current = null;

  for (const line of `${output}\n`.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current) entries.push(current);
      current = { path: line.slice("worktree ".length), branch: null };
    } else if (line.startsWith("branch ") && current) {
      current.branch = line.slice("branch refs/heads/".length);
    } else if (line === "" && current) {
      entries.push(current);
      current = null;
    }
  }
  return entries;
}

function verifyMergedCommitOnOrigin(cwd, mergedState) {
  fetchOrigin(cwd);
  const mergeSha = mergedState?.mergeCommit?.oid;
  if (!mergeSha) {
    fail("GitHub reports the PR merged but did not return the squash commit SHA.");
  }
  if (!isAncestor(cwd, mergeSha, `origin/${TRUNK_BRANCH}`)) {
    fail("The verified PR merge commit is not present on origin/main after fetch.");
  }
  return mergeSha;
}

function cleanupAfterMerge(cwd, branch, mergedState) {
  const mergeSha = verifyMergedCommitOnOrigin(cwd, mergedState);
  const worktrees = parseWorktrees(cwd);
  const mainWorktree = worktrees.find((entry) => entry.branch === TRUNK_BRANCH);

  if (mainWorktree && resolve(mainWorktree.path) !== resolve(cwd)) {
    assertClean(mainWorktree.path, "The main worktree");
    gitVisible(["merge", "--ff-only", `origin/${TRUNK_BRANCH}`], { cwd: mainWorktree.path });
    console.log(`[ship] Synchronized main in ${mainWorktree.path}.`);
    console.log(
      `[ship] The current dedicated worktree still has ${branch} checked out; it is preserved rather than deleting a live worktree automatically.`,
    );
  } else {
    gitVisible(["switch", TRUNK_BRANCH], { cwd });
    gitVisible(["merge", "--ff-only", `origin/${TRUNK_BRANCH}`], { cwd });
    if (revExists(cwd, `refs/heads/${branch}`)) {
      gitVisible(["branch", "-D", branch], { cwd });
    }
  }

  fetchOrigin(cwd);
  const remote = git(
    ["ls-remote", "--heads", "origin", `refs/heads/${branch}`],
    { cwd, allowFailure: true },
  );
  if (remote.stdout) {
    gitVisible(["push", "origin", "--delete", branch], { cwd });
    fetchOrigin(cwd);
  }

  console.log(`\n[ship] Integrated ${branch} as ${mergeSha.slice(0, 12)} on origin/main.`);
}

function prepareTaskBranch(cwd, branch, requestedTitle) {
  if (!validateTaskBranch(branch)) {
    fail(
      `Branch ${branch} does not match Debtulator's short-lived task convention ` +
        "<kind>/<environment>/<short-kebab-description>.",
    );
  }
  if (branch === TRUNK_BRANCH || branch.startsWith("release/")) {
    fail("ship only integrates ordinary short-lived task branches.");
  }

  const title = resolveDurableTitle(cwd, requestedTitle);
  return { branch, title };
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }

  requireCommand("git");
  requireCommand("gh");

  const cwd = repositoryRoot();
  verifyRepositoryIdentity(cwd);

  if (options.setup) {
    setupGitHub(cwd);
    return;
  }

  createCommitIfRequested(cwd, options);
  assertClean(cwd);
  fetchOrigin(cwd);

  let branch = currentBranch(cwd);
  let prepared;
  if (branch === TRUNK_BRANCH) {
    prepared = prepareLocalMain(cwd, options.title);
    branch = prepared.branch;
  } else {
    prepared = prepareTaskBranch(cwd, branch, options.title);
  }

  if (branchCommitCount(cwd) === 0) {
    fail(`Branch ${branch} contains no commits beyond origin/main.`);
  }

  const login = currentGitHubLogin();
  const rebase = rebaseOntoTrunk(cwd, branch, login);
  const validationScope = runValidation(cwd);
  publishBranch(cwd, branch, rebase.rewritten, rebase.previousRemoteSha);

  const prNumber = upsertPullRequest(
    cwd,
    branch,
    prepared.title,
    login,
    validationScope,
  );
  const mergedState = integratePullRequest(
    cwd,
    branch,
    prNumber,
    prepared.title,
    login,
    validationScope,
  );
  cleanupAfterMerge(cwd, branch, mergedState);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`\nship: ${error?.message ?? error}`);
    process.exitCode = 1;
  }
}
