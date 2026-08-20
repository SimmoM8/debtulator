export type NativeCollectionHeaderProps = {
  title: string;
  addLabel: string;
  onAdd: () => void;
  optionsLabel: string;
  onOpenOptions: () => void;
  query: string;
  onChangeQuery: (value: string) => void;
  searchPlaceholder: string;
};

/** Native collection navigation is configured only by the iOS adapter. */
export function NativeCollectionHeader(_: NativeCollectionHeaderProps) {
  return null;
}
