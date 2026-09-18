import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  REQUIRED_CHECK,
  buildDesiredRuleset,
  buildExpectedRepositoryPolicy,
  canRewritePublishedBranch,
  classifyLocalMainState,
  decideRebase,
  deriveBranchName,
  isSensitivePath,
  normalizeRemote,
  normalizeRulesetPolicy,
  parseArgs,
  parseConventionalCommit,
  promoteLocalMain,
  validateTaskBranch,
} from "./ship.mjs";

function exec(command, args, cwd, allowFailure = false) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr}\n${result.stdout}`);
  }
  return (result.stdout ?? "").trim();
}

function git(cwd, ...args) {
  return exec("git", args, cwd);
}

function withTempDir(fn) {
  const directory = mkdtempSync(join(tmpdir(), "debtulator-ship-test-"));
  try {
    return fn(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("validates Conventional Commit subjects", () => {
  assert.deepEqual(parseConventionalCommit("feat(mobile/auth): add account recovery"), {
    type: "feat",
    scope: "mobile/auth",
    summary: "add account recovery",
  });
  assert.equal(parseConventionalCommit("fix"), null);
  assert.equal(parseConventionalCommit("feature: add thing"), null);
  assert.equal(parseConventionalCommit("feat(Mobile): add thing"), null);
});

test("derives repository branch names from durable titles", () => {
  assert.equal(
    deriveBranchName("feat(mobile/auth): add account recovery"),
    "feat/mobile/add-account-recovery",
  );
  assert.equal(
    deriveBranchName("docs(repo): document protected integration"),
    "docs/repo/document-protected-integration",
  );
  assert.equal(
    deriveBranchName("revert(remote/auth): restore token validation"),
    "fix/remote/restore-token-validation",
  );
});

test("validates Debtulator task branches", () => {
  assert.equal(validateTaskBranch("feat/mobile/debt-request-screen"), true);
  assert.equal(validateTaskBranch("perf/remote/cache-user-discovery"), true);
  assert.equal(validateTaskBranch("feature/mobile/nope"), false);
  assert.equal(validateTaskBranch("feat/debt-request-screen"), false);
  assert.equal(validateTaskBranch("release/mobile/1.0"), false);
});

test("normalizes supported GitHub origin forms", () => {
  for (const remote of [
    "https://github.com/SimmoM8/debtulator.git",
    "git@github.com:SimmoM8/debtulator.git",
    "ssh://git@github.com/SimmoM8/debtulator.git",
    "git://github.com/SimmoM8/debtulator.git",
  ]) {
    assert.equal(normalizeRemote(remote), "SimmoM8/debtulator");
  }
  assert.equal(normalizeRemote("https://gitlab.com/SimmoM8/debtulator.git"), null);
});

test("parses ship arguments including task-runner separators", () => {
  assert.deepEqual(parseArgs(["--", "--title", "fix(repo): repair integration"]), {
    commit: null,
    title: "fix(repo): repair integration",
    all: false,
    setup: false,
    help: false,
  });
  assert.deepEqual(parseArgs(["--commit=chore(repo): update policy", "--all"]), {
    commit: "chore(repo): update policy",
    title: null,
    all: true,
    setup: false,
    help: false,
  });
  assert.throws(() => parseArgs(["--all"]), /only valid together/);
});

test("represents repository merge policy", () => {
  assert.deepEqual(buildExpectedRepositoryPolicy({ ciMature: true }).merge, {
    allowSquashMerge: true,
    allowMergeCommit: false,
    allowRebaseMerge: false,
    allowAutoMerge: true,
    deleteBranchOnMerge: true,
    allowUpdateBranch: false,
    squashMergeCommitTitle: "PR_TITLE",
  });
  assert.equal(buildExpectedRepositoryPolicy({ ciMature: false }).merge.allowAutoMerge, false);
});

test("normalizes branch-protection ruleset policy", () => {
  const ruleset = {
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    bypass_actors: [],
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "required_linear_history" },
      {
        type: "pull_request",
        parameters: {
          required_review_thread_resolution: true,
          allowed_merge_methods: ["squash"],
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [{ context: REQUIRED_CHECK }],
        },
      },
    ],
  };

  assert.deepEqual(normalizeRulesetPolicy(ruleset), {
    active: true,
    targetsDefaultBranch: true,
    noBypassActors: true,
    deletion: true,
    nonFastForward: true,
    linearHistory: true,
    pullRequest: true,
    conversationResolution: true,
    allowedMergeMethods: ["squash"],
    strictRequiredChecks: true,
    requiredChecks: [REQUIRED_CHECK],
  });
});

test("setup preserves stronger review requirements while enforcing squash and the real check", () => {
  const existing = {
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    bypass_actors: [],
    rules: [
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 2,
          required_review_thread_resolution: false,
          allowed_merge_methods: ["rebase", "squash"],
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: false,
          required_status_checks: [{ context: "Existing Security Gate" }],
        },
      },
      { type: "required_signatures" },
    ],
  };

  const desired = buildDesiredRuleset(existing, { ciMature: true });
  const pullRequest = desired.rules.find((rule) => rule.type === "pull_request");
  const checks = desired.rules.find((rule) => rule.type === "required_status_checks");

  assert.equal(pullRequest.parameters.required_approving_review_count, 2);
  assert.equal(pullRequest.parameters.required_review_thread_resolution, true);
  assert.deepEqual(pullRequest.parameters.allowed_merge_methods, ["squash"]);
  assert.equal(checks.parameters.strict_required_status_checks_policy, true);
  assert.deepEqual(
    checks.parameters.required_status_checks.map((check) => check.context).sort(),
    ["Existing Security Gate", REQUIRED_CHECK].sort(),
  );
  assert.ok(desired.rules.some((rule) => rule.type === "required_signatures"));
});


test("setup never removes an existing status-check rule when CI maturity is uncertain", () => {
  const existing = {
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    bypass_actors: [],
    rules: [
      {
        type: "required_status_checks",
        parameters: {
          strict_required_status_checks_policy: true,
          required_status_checks: [{ context: "Existing Gate" }],
        },
      },
    ],
  };

  const desired = buildDesiredRuleset(existing, { ciMature: false });
  const status = desired.rules.find((rule) => rule.type === "required_status_checks");
  assert.deepEqual(status.parameters.required_status_checks, [{ context: "Existing Gate" }]);
});

test("classifies local-main promotion states", () => {
  assert.equal(classifyLocalMainState({ ahead: 0, behind: 0 }), "synced");
  assert.equal(classifyLocalMainState({ ahead: 1, behind: 0 }), "ahead");
  assert.equal(classifyLocalMainState({ ahead: 0, behind: 2 }), "behind");
  assert.equal(classifyLocalMainState({ ahead: 1, behind: 2 }), "diverged");
});

test("decides stale-branch rebases", () => {
  assert.equal(decideRebase({ trunkIsAncestor: true, hasCommits: true }), "current");
  assert.equal(decideRebase({ trunkIsAncestor: false, hasCommits: true }), "rebase");
  assert.equal(decideRebase({ trunkIsAncestor: true, hasCommits: false }), "nothing-to-ship");
});

test("refuses ambiguous published-branch rewrites", () => {
  assert.equal(
    canRewritePublishedBranch({
      remoteExists: false,
      managedByShip: false,
      ownerMatches: false,
      remoteTipIsAncestor: false,
    }),
    true,
  );
  assert.equal(
    canRewritePublishedBranch({
      remoteExists: true,
      managedByShip: false,
      ownerMatches: true,
      remoteTipIsAncestor: true,
    }),
    false,
  );
  assert.equal(
    canRewritePublishedBranch({
      remoteExists: true,
      managedByShip: true,
      ownerMatches: true,
      remoteTipIsAncestor: true,
    }),
    true,
  );
});

test("detects sensitive paths without rejecting examples", () => {
  assert.equal(isSensitivePath(".env"), true);
  assert.equal(isSensitivePath("backend/.env.production"), true);
  assert.equal(isSensitivePath("keys/signing.p12"), true);
  assert.equal(isSensitivePath(".env.auth.example"), false);
  assert.equal(isSensitivePath("docs/environment.md"), false);
});

test("local-main promotion preserves unpublished commits before moving main", () => {
  withTempDir((root) => {
    const remote = join(root, "remote.git");
    const repo = join(root, "repo");

    exec("git", ["init", "--bare", remote], root);
    exec("git", ["clone", remote, repo], root);
    git(repo, "config", "user.name", "Ship Test");
    git(repo, "config", "user.email", "ship@example.com");
    git(repo, "switch", "-c", "main");

    writeFileSync(join(repo, "base.txt"), "base\n");
    git(repo, "add", "base.txt");
    git(repo, "commit", "-m", "chore(repo): establish base");
    git(repo, "push", "-u", "origin", "main");

    writeFileSync(join(repo, "local.txt"), "unpublished\n");
    git(repo, "add", "local.txt");
    git(repo, "commit", "-m", "docs(repo): add local note");
    const unpublished = git(repo, "rev-parse", "HEAD");
    const remoteMain = git(repo, "rev-parse", "origin/main");

    promoteLocalMain(repo, "docs/repo/add-local-note");

    assert.equal(git(repo, "rev-parse", "docs/repo/add-local-note"), unpublished);
    assert.equal(git(repo, "rev-parse", "main"), remoteMain);
    assert.equal(git(repo, "branch", "--show-current"), "docs/repo/add-local-note");
  });
});
