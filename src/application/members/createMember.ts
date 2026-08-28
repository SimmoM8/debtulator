import type { Member } from "@/src/domain/members/Member";
import type { MemberRepository } from "@/src/domain/members/MemberRepository";

export type CreateMemberInput = {
  ownerUserId: string;
  displayName: string;
};

export async function createMember(
  repository: MemberRepository,
  input: CreateMemberInput,
): Promise<Member> {
  const displayName = input.displayName.trim();

  if (!displayName) throw new Error("Member name is required.");

  const now = new Date().toISOString();

  const member: Member = {
    id: crypto.randomUUID(),
    ownerUserId: input.ownerUserId,
    displayName,
    createdAt: now,
    updatedAt: now,
  };

  await repository.save(member);
  return member;
}
