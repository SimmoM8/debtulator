import { StyleSheet, View } from "react-native";

import { Card } from "@/src/components/cards/Card";
import { ListState } from "@/src/components/states/ListState";
import { DebtsList } from "@/src/features/debts/components/DebtsList";
import type { DebtListItem } from "@/src/features/debts/model/DebtListItem";
import { spacing } from "@/src/theme";

type MemberDebtsSectionProps = {
  memberName: string;
  items: DebtListItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void | Promise<void>;
};

export function MemberDebtsSection({
  memberName,
  items,
  loading,
  error,
  onRetry,
}: MemberDebtsSectionProps) {
  const showList = !loading && error === null && items.length > 0;

  return (
    <View style={styles.section}>
      <Card variant="onBrand">
        {showList ? (
          <DebtsList items={items} variant="onBrand" />
        ) : (
          <ListState
            loading={loading}
            error={error}
            totalCount={items.length}
            visibleCount={items.length}
            loadingState={{
              title: "Loading debts…",
              message: `Your debts with ${memberName} are being loaded.`,
            }}
            emptyState={{
              title: `No debts with ${memberName}`,
              message: "Add a debt when you lend or borrow money.",
            }}
            errorState={{
              title: "Couldn’t load debts",
              message: `Your debts with ${memberName} couldn’t be loaded. Try again.`,
            }}
            onRetry={onRetry}
            variant="onBrand"
          />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
