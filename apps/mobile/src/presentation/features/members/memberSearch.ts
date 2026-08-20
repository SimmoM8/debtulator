import type { Member } from "@debtulator/domain/models";

export function matchesMemberQuery(member: Member, query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    return true;
  }

  return [member.displayName, member.email, member.phone, member.notes]
    .filter(Boolean)
    .some((value) => value!.toLocaleLowerCase().includes(normalized));
}
