#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const REQUIRED_ENV_VARS = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "APP_ENV",
];
const ALLOWED_BETA_PROFILES = new Set(["staging", "production"]);

function readJson(rootDir, fileName) {
  const filePath = path.join(rootDir, fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseArgs(argv) {
  const args = { profile: "staging", root: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--profile") {
      args.profile = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--root") {
      args.root = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function validate(rootDir, profile) {
  const errors = [];
  const packageJson = readJson(rootDir, "package.json");
  const appJson = readJson(rootDir, "app.json");
  const easJson = readJson(rootDir, "eas.json");
  const appConfig = appJson.expo ?? {};
  const easProfile = easJson.build?.[profile];

  if (!ALLOWED_BETA_PROFILES.has(profile)) {
    errors.push(
      `Beta builds must use one of: ${Array.from(ALLOWED_BETA_PROFILES).join(", ")}.`
    );
  }

  if (!easProfile) {
    errors.push(`EAS build profile "${profile}" is not defined in eas.json.`);
  }

  const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  if (missingEnvVars.length > 0) {
    errors.push(`Missing required environment variables: ${missingEnvVars.join(", ")}.`);
  }

  const expectedAppEnv = easProfile?.env?.APP_ENV;
  if (!expectedAppEnv) {
    errors.push(`EAS build profile "${profile}" must define env.APP_ENV.`);
  } else if (process.env.APP_ENV !== expectedAppEnv) {
    errors.push(
      `APP_ENV must match profile "${profile}" value "${expectedAppEnv}" (current: "${process.env.APP_ENV || "unset"}").`
    );
  }

  if (packageJson.version !== appConfig.version) {
    errors.push(
      `Version mismatch: package.json (${packageJson.version}) does not match app.json expo.version (${appConfig.version}).`
    );
  }

  const iosBuildNumberRaw = appConfig.ios?.buildNumber;
  const iosBuildNumber = Number.parseInt(iosBuildNumberRaw, 10);
  if (!/^[1-9]\d*$/.test(String(iosBuildNumberRaw))) {
    errors.push("iOS buildNumber must be a positive integer string in app.json.");
  }

  const androidVersionCodeRaw = appConfig.android?.versionCode;
  const androidVersionCode = Number.parseInt(androidVersionCodeRaw, 10);
  if (
    !Number.isInteger(androidVersionCodeRaw) ||
    !Number.isInteger(androidVersionCode) ||
    androidVersionCode <= 0
  ) {
    errors.push("Android versionCode must be a positive integer in app.json.");
  }

  if (
    Number.isInteger(iosBuildNumber) &&
    iosBuildNumber > 0 &&
    Number.isInteger(androidVersionCode) &&
    androidVersionCode > 0 &&
    iosBuildNumber !== androidVersionCode
  ) {
    errors.push(
      `Build number mismatch: ios.buildNumber (${iosBuildNumber}) must match android.versionCode (${androidVersionCode}).`
    );
  }

  return { errors, profile };
}

function main() {
  const { profile, root } = parseArgs(process.argv.slice(2));
  const { errors } = validate(root, profile);

  if (errors.length > 0) {
    console.error("❌ Release preflight failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("✅ Release preflight passed.");
  console.log(`Profile: ${profile}`);
  console.log("All required env vars, versions, and build numbers are consistent.");
}

main();
