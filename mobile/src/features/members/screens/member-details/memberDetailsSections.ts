import type { SegmentedControlOption } from "@/src/components/controls";

export type MemberDetailsSection = "overview" | "debts" | "activity";

export const MEMBER_DETAILS_TRANSITION_DURATION = 360;

export const MEMBER_DETAILS_SECTIONS = [
  {
    value: "overview",
    label: "Overview",
  },

  {
    value: "debts",
    label: "Debts",
  },

  {
    value: "activity",
    label: "Activity",
  },
] as const satisfies readonly SegmentedControlOption<MemberDetailsSection>[];
