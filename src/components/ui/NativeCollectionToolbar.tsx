export type NativeCollectionToolbarProps = {
  sortValue?: string;
  sortOptions?: { label: string; value: string }[];
  onChangeSort?: (value: string) => void;
  sortDirection?: "asc" | "desc";
  onToggleSortDirection?: () => void;
};

export function NativeCollectionToolbar(_: NativeCollectionToolbarProps) {
  return null;
}
