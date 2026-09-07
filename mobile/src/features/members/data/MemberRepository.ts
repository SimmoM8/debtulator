import type { Member } from "../model/Member";

export interface MemberRepository {
  getAllByOwner(ownerUserId: string): Promise<Member[]>;
  getById(ownerUserId: string, memberId: string): Promise<Member | null>;
  save(member: Member): Promise<void>;
  delete(ownerUserId: string, memberId: string): Promise<void>;
}
