import type { Member } from "@/src/domain/members/Member";
import type { MemberRepository } from "@/src/domain/members/MemberRepository";

export function getMembers(
  repository: MemberRepository,
  ownerUserId: string,
): Promise<Member[]> {
  return repository.getAllByOwner(ownerUserId);
}
