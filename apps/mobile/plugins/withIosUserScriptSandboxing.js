const { createRunOncePlugin, withPodfile } = require("expo/config-plugins");

const packageJson = require("../package.json");

const PLUGIN_NAME = "debtulator-ios-user-script-sandboxing";
const START_MARKER = `# @generated begin ${PLUGIN_NAME}`;
const END_MARKER = `# @generated end ${PLUGIN_NAME}`;

const PODS_BUILD_SETTING_BLOCK = [
  `    ${START_MARKER}`,
  "    # Xcode can sandbox CocoaPods script phases and block their nested build tools.",
  "    installer.pods_project.targets.each do |target|",
  "      target.build_configurations.each do |build_configuration|",
  "        build_configuration.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'",
  "      end",
  "    end",
  `    ${END_MARKER}`,
].join("\n");

/**
 * Adds the CocoaPods build setting to the generated Podfile's post_install hook.
 * The strict anchor makes Expo template changes fail during prebuild instead of
 * silently producing an iOS project without the required build configuration.
 */
function addIosUserScriptSandboxingWorkaround(contents) {
  const hasStartMarker = contents.includes(START_MARKER);
  const hasEndMarker = contents.includes(END_MARKER);

  if (hasStartMarker !== hasEndMarker) {
    throw new Error(`${PLUGIN_NAME}: generated Podfile markers are incomplete`);
  }

  if (hasStartMarker) {
    return contents;
  }

  const postInstallStart = contents.lastIndexOf("\n  post_install do |installer|");
  const reactNativePostInstall = contents.indexOf(
    "react_native_post_install(",
    postInstallStart,
  );
  const postInstallClosingAnchor = /\n  end\nend\s*$/;
  const closingMatch = contents.match(postInstallClosingAnchor);

  if (
    postInstallStart < 0 ||
    reactNativePostInstall < postInstallStart ||
    !closingMatch ||
    reactNativePostInstall > closingMatch.index
  ) {
    throw new Error(
      `${PLUGIN_NAME}: could not find Expo's complete post_install hook`,
    );
  }

  return contents.replace(
    postInstallClosingAnchor,
    `\n${PODS_BUILD_SETTING_BLOCK}\n  end\nend\n`,
  );
}

const withIosUserScriptSandboxing = (config) =>
  withPodfile(config, (configWithPodfile) => {
    configWithPodfile.modResults.contents = addIosUserScriptSandboxingWorkaround(
      configWithPodfile.modResults.contents,
    );
    return configWithPodfile;
  });

module.exports = createRunOncePlugin(
  withIosUserScriptSandboxing,
  PLUGIN_NAME,
  packageJson.version,
);
module.exports.addIosUserScriptSandboxingWorkaround = addIosUserScriptSandboxingWorkaround;
module.exports.PODS_BUILD_SETTING_BLOCK = PODS_BUILD_SETTING_BLOCK;
