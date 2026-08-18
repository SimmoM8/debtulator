export type NativeNavigationAction = {
  label: string;
  icon?: string;
  onPress: () => void;
  disabled?: boolean;
};

export type NativePageNavigationProps = {
  search?: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
  };
  leadingAction?: NativeNavigationAction;
  trailingAction?: NativeNavigationAction;
};

export type NativeFormToolbarProps = NativeNavigationAction;
