const { describe, expect, it } = require("@jest/globals");

const {
  addIosUserScriptSandboxingWorkaround,
} = require("../withIosUserScriptSandboxing");

const PODFILE_FIXTURE = `target 'Debtulator' do
  use_expo_modules!

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
    )
  end
end
`;

describe("withIosUserScriptSandboxing", () => {
  it("adds the Pods build setting inside Expo's post_install hook", () => {
    const result = addIosUserScriptSandboxingWorkaround(PODFILE_FIXTURE);

    expect(result).toContain(
      "build_configuration.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'",
    );
    expect(result.indexOf("react_native_post_install(")).toBeLessThan(
      result.indexOf("ENABLE_USER_SCRIPT_SANDBOXING"),
    );
    expect(result.indexOf("ENABLE_USER_SCRIPT_SANDBOXING")).toBeLessThan(
      result.lastIndexOf("  end\nend"),
    );
  });

  it("is idempotent", () => {
    const once = addIosUserScriptSandboxingWorkaround(PODFILE_FIXTURE);
    const twice = addIosUserScriptSandboxingWorkaround(once);

    expect(twice).toBe(once);
    expect(twice.match(/ENABLE_USER_SCRIPT_SANDBOXING/g)).toHaveLength(1);
  });

  it("fails loudly when the Expo Podfile template no longer matches", () => {
    expect(() => addIosUserScriptSandboxingWorkaround("target 'Debtulator' do\nend\n"))
      .toThrow("could not find Expo's complete post_install hook");
  });

  it("fails loudly when only one generated marker remains", () => {
    const damagedPodfile = PODFILE_FIXTURE.replace(
      "    react_native_post_install(",
      "    # @generated begin debtulator-ios-user-script-sandboxing\n    react_native_post_install(",
    );

    expect(() => addIosUserScriptSandboxingWorkaround(damagedPodfile))
      .toThrow("generated Podfile markers are incomplete");
  });
});
