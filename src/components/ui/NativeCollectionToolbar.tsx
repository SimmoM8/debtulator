export type NativeCollectionToolbarProps = {
  filterValue?: string;
  filterOptions?: { label: string; value: string }[];
  onChangeFilter?: (value: string) => void;
  sortValue?: string;
  sortOptions?: { label: string; value: string }[];
  onChangeSort?: (value: string) => void;
  sortDirection?: "asc" | "desc";
  onToggleSortDirection?: () => void;
};

export function NativeCollectionToolbar(_: NativeCollectionToolbarProps) {
  return null;
}
