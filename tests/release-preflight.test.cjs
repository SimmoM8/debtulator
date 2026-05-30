const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT_PATH = path.resolve(__dirname, "../scripts/release-preflight.js");

function makeFixture({ appVersion = "1.0.0", iosBuildNumber = "1", androidVersionCode = 1 } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-preflight-"));

  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ version: "1.0.0" }, null, 2)
  );
  fs.writeFileSync(
    path.join(root, "app.json"),
    JSON.stringify(
      {
        expo: {
          version: appVersion,
          ios: { buildNumber: iosBuildNumber },
          android: { versionCode: androidVersionCode },
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(root, "eas.json"),
    JSON.stringify(
      {
        build: {
          staging: { env: { APP_ENV: "staging" } },
          production: { env: { APP_ENV: "production" } },
        },
      },
      null,
      2
    )
  );

  return root;
}

function runPreflight(root, envOverrides = {}) {
  const env = {
    ...process.env,
    EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    APP_ENV: "staging",
    ...envOverrides,
  };

  return spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--profile", "staging", "--root", root],
    { encoding: "utf8", env }
  );
}

test("preflight passes for consistent staging config", () => {
  const fixture = makeFixture();
  const result = runPreflight(fixture);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Release preflight passed/);
});

test("preflight fails when a required env var is missing", () => {
  const fixture = makeFixture();
  const result = runPreflight(fixture, { EXPO_PUBLIC_SUPABASE_ANON_KEY: "" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing required environment variables: EXPO_PUBLIC_SUPABASE_ANON_KEY/);
});

test("preflight fails when app and package versions drift", () => {
  const fixture = makeFixture({ appVersion: "1.0.1" });
  const result = runPreflight(fixture);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Version mismatch/);
});
