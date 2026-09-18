/* global describe, expect, it */

const {
  addSandboxingOverride,
} = require("./withIosUserScriptSandboxing");

const podfile = `target 'Debtulator' do
  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
    )
  end
end
`;

describe("withIosUserScriptSandboxing", () => {
  it("adds the sandboxing override after react_native_post_install", () => {
    const result = addSandboxingOverride(podfile);

    expect(result).toContain(
      "build_configuration.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'",
    );
    expect(result.indexOf("react_native_post_install")).toBeLessThan(
      result.indexOf("ENABLE_USER_SCRIPT_SANDBOXING"),
    );
  });

  it("is idempotent", () => {
    const once = addSandboxingOverride(podfile);
    const twice = addSandboxingOverride(once);

    expect(twice).toBe(once);
  });

  it("fails when the generated Podfile shape is unsupported", () => {
    expect(() => addSandboxingOverride("target 'Debtulator' do\nend\n")).toThrow(
      "Unable to locate react_native_post_install",
    );
  });
});
