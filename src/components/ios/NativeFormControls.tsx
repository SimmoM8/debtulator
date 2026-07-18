import {
  DatePicker,
  Picker,
  SecureField,
  Text,
  TextField,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  datePickerStyle,
  keyboardType,
  lineLimit,
  pickerStyle,
  submitLabel,
  tag,
  textContentType,
  textFieldStyle,
} from "@expo/ui/swift-ui/modifiers";

type Keyboard = Parameters<typeof keyboardType>[0];
type ContentType = Parameters<typeof textContentType>[0];

export function NativeTextField({
  label,
  value,
  onChange,
  keyboard = "default",
  contentType,
  multiline = false,
  submit = "next",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboard?: Keyboard;
  contentType?: ContentType;
  multiline?: boolean;
  submit?: Parameters<typeof submitLabel>[0];
}) {
  const nativeValue = useNativeState(value);
  return (
    <TextField
      text={nativeValue}
      placeholder={label}
      axis={multiline ? "vertical" : "horizontal"}
      onTextChange={onChange}
      modifiers={[
        textFieldStyle("plain"),
        keyboardType(keyboard),
        submitLabel(submit),
        accessibilityLabel(label),
        ...(contentType ? [textContentType(contentType)] : []),
        ...(multiline ? [lineLimit({ min: 3, max: 7 })] : []),
      ]}
    />
  );
}

export function NativeSecureTextField({
  label,
  value,
  onChange,
  contentType = "password",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  contentType?: "password" | "newPassword";
}) {
  const nativeValue = useNativeState(value);
  return (
    <SecureField
      text={nativeValue}
      placeholder={label}
      onTextChange={onChange}
      modifiers={[
        textFieldStyle("plain"),
        textContentType(contentType),
        submitLabel("done"),
        accessibilityLabel(label),
      ]}
    />
  );
}

export function NativePicker<T extends string>({
  label,
  value,
  options,
  onChange,
  style = "navigationLink",
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  style?: Parameters<typeof pickerStyle>[0];
}) {
  return (
    <Picker
      label={label}
      selection={value}
      onSelectionChange={(selection) => onChange(selection as T)}
      modifiers={[pickerStyle(style)]}
    >
      {options.map((option) => (
        <Text key={option.value} modifiers={[tag(option.value)]}>
          {option.label}
        </Text>
      ))}
    </Picker>
  );
}

export function NativeDateField({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const selection = value ? new Date(`${value}T12:00:00`) : new Date();
  return (
    <DatePicker
      title={optional && !value ? `${label} (not set)` : label}
      selection={selection}
      displayedComponents={["date"]}
      onDateChange={(date) => onChange(date.toISOString().slice(0, 10))}
      modifiers={[datePickerStyle("compact")]}
    />
  );
}
