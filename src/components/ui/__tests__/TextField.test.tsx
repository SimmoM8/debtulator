import TestRenderer from "react-test-renderer";

import { TextField } from "../TextField";

describe("TextField", () => {
  it("does not render a label when none is provided", () => {
    const tree = TestRenderer.create(
      <TextField label="" value="Hello" onChangeText={() => undefined} />,
    );

    expect(tree.root.findAllByType("Text")).toHaveLength(0);
  });

  it("renders the input with the provided value", () => {
    const tree = TestRenderer.create(
      <TextField label="Name" value="Ada" onChangeText={() => undefined} />,
    );

    const input = tree.root.findByProps({ value: "Ada" });
    expect(input).toBeDefined();
  });
});
