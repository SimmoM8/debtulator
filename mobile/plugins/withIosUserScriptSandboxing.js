const { withPodfile } = require("expo/config-plugins");

const START_MARKER =
  "# @generated begin debtulator-ios-user-script-sandboxing";
const END_MARKER = "# @generated end debtulator-ios-user-script-sandboxing";
const REACT_NATIVE_POST_INSTALL =
  /(    react_native_post_install\([\s\S]*?^    \)\n)/m;

const SANDBOXING_OVERRIDE = [
  `    ${START_MARKER}`,
  "    # Xcode can sandbox CocoaPods script phases and block their nested build tools.",
  "    installer.pods_project.targets.each do |target|",
  "      target.build_configurations.each do |build_configuration|",
  "        build_configuration.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'",
  "      end",
  "    end",
  `    ${END_MARKER}`,
].join("\n");

function addSandboxingOverride(contents) {
  if (contents.includes(START_MARKER)) {
    return contents;
  }

  if (!REACT_NATIVE_POST_INSTALL.test(contents)) {
    throw new Error(
      "Unable to locate react_native_post_install in the generated iOS Podfile.",
    );
  }

  return contents.replace(
    REACT_NATIVE_POST_INSTALL,
    `$1${SANDBOXING_OVERRIDE}\n`,
  );
}

function withIosUserScriptSandboxing(config) {
  return withPodfile(config, (configWithPodfile) => {
    configWithPodfile.modResults.contents = addSandboxingOverride(
      configWithPodfile.modResults.contents,
    );
    return configWithPodfile;
  });
}

module.exports = withIosUserScriptSandboxing;
module.exports.addSandboxingOverride = addSandboxingOverride;
