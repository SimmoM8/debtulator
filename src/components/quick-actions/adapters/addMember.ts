import {
    openNewMember,
    type OpenNewMemberInput,
} from "@/src/features/members/operations/openNewMember";

import type { QuickAction } from "../QuickAction";

export function addMemberQuickAction(
  input: OpenNewMemberInput = {},
): QuickAction {
  return {
    id: "add-member",

    label: "Add member",

    icon: {
      ios: "person.badge.plus",
      android: "person_add",
    },

    onPress: () => {
      openNewMember(input);
    },
  };
}
