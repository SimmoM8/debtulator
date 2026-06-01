#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const args = new Set(process.argv.slice(2));
const getArgValue = (name, fallback) => {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const targetEnv = getArgValue("--env", process.env.APP_ENV || "staging");
const configOnly = args.has("--config-only");
const skipQuality = args.has("--skip-quality") || configOnly;
const strictEnv = args.has("--strict-env");

const blockers = [];
const warnings = [];

function readJson(relativePath) {
  const filePath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    blockers.push(`${relativePath} is not readable JSON: ${error.message}`);
    return null;
  }
}

function requireValue(value, message) {
  if (value === undefined || value === null || value === "") {
    blockers.push(message);
  }
}

function requireFile(relativePath, message) {
  if (!relativePath) {
    blockers.push(message);
    return;
  }

  const normalizedPath = relativePath.replace(/^\.\//, "");
  if (!fs.existsSync(path.join(root, normalizedPath))) {
    blockers.push(`${message}: ${relativePath} was not found`);
  }
}

function validHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !/example|placeholder|todo/i.test(url.hostname + url.pathname);
  } catch {
    return false;
  }
}

function run(command, commandArgs) {
  const executable = process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  const result = spawnSync(executable, commandArgs, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    blockers.push(`${command} ${commandArgs.join(" ")} failed with exit code ${result.status}`);
  }
}

function checkVersions(packageJson, appJson) {
  const packageVersion = packageJson?.version;
  const appVersion = appJson?.expo?.version;
  requireValue(packageVersion, "package.json version is missing");
  requireValue(appVersion, "app.json expo.version is missing");

  if (packageVersion && appVersion && packageVersion !== appVersion) {
    blockers.push(`package.json version (${packageVersion}) does not match app.json expo.version (${appVersion})`);
  }

  if (packageVersion && !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(packageVersion)) {
    blockers.push(`package.json version (${packageVersion}) is not valid semver`);
  }

  const buildNumber = appJson?.expo?.ios?.buildNumber;
  const versionCode = appJson?.expo?.android?.versionCode;
  requireValue(buildNumber, "app.json expo.ios.buildNumber is missing");
  requireValue(versionCode, "app.json expo.android.versionCode is missing");

  if (buildNumber && !/^\d+$/.test(String(buildNumber))) {
    blockers.push(`iOS buildNumber must be a numeric string, got ${buildNumber}`);
  }

  if (!Number.isInteger(versionCode) || versionCode < 1) {
    blockers.push(`Android versionCode must be a positive integer, got ${versionCode}`);
  }
}

function checkAppConfig(appJson) {
  const expo = appJson?.expo;
  if (!expo) {
    blockers.push("app.json is missing the expo config root");
    return;
  }

  requireValue(expo.name, "app.json expo.name is missing");
  requireValue(expo.slug, "app.json expo.slug is missing");
  requireValue(expo.scheme, "app.json expo.scheme is missing");
  requireValue(expo.ios?.bundleIdentifier, "iOS bundleIdentifier is missing");
  requireValue(expo.android?.package, "Android package is missing");

  if (expo.ios?.bundleIdentifier && /example|placeholder/i.test(expo.ios.bundleIdentifier)) {
    blockers.push(`iOS bundleIdentifier looks like a placeholder: ${expo.ios.bundleIdentifier}`);
  }

  if (expo.android?.package && /example|placeholder/i.test(expo.android.package)) {
    blockers.push(`Android package looks like a placeholder: ${expo.android.package}`);
  }

  requireFile(expo.icon, "App icon is missing");
  requireFile(expo.web?.favicon, "Web favicon is missing");
  requireFile(expo.android?.adaptiveIcon?.foregroundImage, "Android adaptive foreground icon is missing");
  requireFile(expo.android?.adaptiveIcon?.backgroundImage, "Android adaptive background image is missing");
  requireFile(expo.android?.adaptiveIcon?.monochromeImage, "Android monochrome icon is missing");

  const splashPlugin = expo.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen");
  requireFile(splashPlugin?.[1]?.image, "Splash screen image is missing");

  requireValue(
    expo.ios?.infoPlist?.NSUserNotificationsUsageDescription,
    "iOS notification permission usage text is missing",
  );
  requireValue(
    expo.ios?.infoPlist?.NSPhotoLibraryUsageDescription,
    "iOS photo library permission usage text is missing",
  );

  if (!expo.android?.permissions?.includes("POST_NOTIFICATIONS")) {
    warnings.push("Android POST_NOTIFICATIONS permission is not declared; confirm notifications are intentionally out of scope");
  }
}

function checkEasConfig(easJson) {
  const profiles = easJson?.build || {};
  for (const profileName of ["development", "staging", "production"]) {
    if (!profiles[profileName]) {
      blockers.push(`eas.json is missing the ${profileName} build profile`);
      continue;
    }

    const profileEnv = profiles[profileName].env?.APP_ENV;
    if (profileEnv !== profileName) {
      blockers.push(`eas.json ${profileName} profile must set APP_ENV=${profileName}`);
    }
  }

  if (profiles.staging?.distribution !== "internal") {
    blockers.push("eas.json staging profile must use internal distribution");
  }

  if (profiles.production?.distribution === "internal") {
    blockers.push("eas.json production profile must not use internal distribution");
  }

  if (profiles.production && profiles.production.autoIncrement !== true) {
    warnings.push("eas.json production profile should auto-increment build numbers");
  }

  if (!["development", "staging", "production"].includes(targetEnv)) {
    blockers.push(`--env must be development, staging, or production; got ${targetEnv}`);
  }
}

function checkStoreAndEnvironment() {
  const requiredEnv = [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  ];

  if (strictEnv) {
    for (const envName of requiredEnv) {
      requireValue(process.env[envName], `${envName} is required for strict ${targetEnv} release preflight`);
    }
  } else {
    for (const envName of requiredEnv) {
      if (!process.env[envName]) {
        warnings.push(`${envName} is not set locally; confirm it is configured in EAS for ${targetEnv}`);
      }
    }
  }

  const storeUrls = [
    ["APP_PRIVACY_POLICY_URL", process.env.APP_PRIVACY_POLICY_URL],
    ["APP_SUPPORT_URL", process.env.APP_SUPPORT_URL],
  ];

  for (const [envName, value] of storeUrls) {
    if (targetEnv === "production" || strictEnv) {
      if (!validHttpsUrl(value)) {
        blockers.push(`${envName} must be a real HTTPS URL before production submission`);
      }
    } else if (!value) {
      warnings.push(`${envName} is not set; staging can use placeholders only until store metadata freeze`);
    }
  }
}

const packageJson = readJson("package.json");
const appJson = readJson("app.json");
const easJson = readJson("eas.json");

checkVersions(packageJson, appJson);
checkAppConfig(appJson);
checkEasConfig(easJson);
checkStoreAndEnvironment();

if (!skipQuality) {
  run("npm", ["run", "typecheck"]);
  run("npm", ["run", "lint"]);
  run("npm", ["test"]);
}

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (blockers.length > 0) {
  console.error("\nRelease preflight failed:");
  for (const blocker of blockers) {
    console.error(`- ${blocker}`);
  }
  process.exit(1);
}

console.log(`Release preflight passed for ${targetEnv}${configOnly ? " (config only)" : ""}.`);
