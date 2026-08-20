import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { TextField } from "../TextField";

describe("TextField", () => {
  it("does not render a label when none is provided", () => {
    const screen = render(
      <TextField label="" value="Hello" onChangeText={() => undefined} />,
    );

    expect(screen.UNSAFE_queryAllByType(Text)).toHaveLength(0);
  });

  it("renders the input with the provided value", () => {
    const screen = render(
      <TextField label="Name" value="Ada" onChangeText={() => undefined} />,
    );

    expect(screen.getByDisplayValue("Ada")).toBeOnTheScreen();
  });
});
