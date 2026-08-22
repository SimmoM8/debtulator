import type {
    CurrencyCode,
    LedgerEntry,
    Member,
    MoneyMap,
} from "@/src/domain/models";

export type DebtListItemModel = {
  id: string;
  title: string;
  person: string;
  amount: number;
  currency: CurrencyCode;
  direction: "you_owe" | "they_owe";
  date: string;
};

export type DebtsScreenModel = {
  youOwe: MoneyMap;
  theyOwe: MoneyMap;
  items: DebtListItemModel[];
};

export function buildDebtsScreenModel(input: {
  ledgerEntries: LedgerEntry[];
  members: Member[];
  personalTotals: {
    owedToMe: MoneyMap;
    iOwe: MoneyMap;
    net: MoneyMap;
  };
}): DebtsScreenModel {
  const membersById = new Map(
    input.members.map((member) => [member.id, member]),
  );

  const items: DebtListItemModel[] = input.ledgerEntries
    .map((entry): DebtListItemModel => {
      const isYouOwe = entry.fromId === "me";

      const personId = isYouOwe ? entry.toId : entry.fromId;

      return {
        id: entry.id,
        title: entry.title,
        person:
          personId === "me"
            ? "You"
            : (membersById.get(personId)?.displayName ?? "Unknown member"),
        amount: entry.amount,
        currency: entry.currency,
        direction: isYouOwe ? "you_owe" : "they_owe",
        date: entry.date,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    youOwe: input.personalTotals.iOwe,
    theyOwe: input.personalTotals.owedToMe,
    items,
  };
}
