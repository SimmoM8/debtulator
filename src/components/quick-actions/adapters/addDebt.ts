import {
  openNewDebt,
  type OpenNewDebtInput,
} from "@/src/features/debts/operations/openNewDebt";

import type { QuickAction } from "../QuickAction";

export function addDebtQuickAction(input: OpenNewDebtInput = {}): QuickAction {
  return {
    id: "add-debt",

    label: "Add debt",

    icon: {
      ios: "plus",
      android: "add",
    },

    onPress: () => {
      openNewDebt(input);
    },
  };
}
