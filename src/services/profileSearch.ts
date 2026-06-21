import { supabase } from "@/src/services/supabase";
import type { CurrencyCode } from "@/src/types/models";

export type SignedUpMemberProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  baseCurrency: CurrencyCode;
};

type SignedUpMemberProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  base_currency: CurrencyCode;
};

export type LinkedMemberProfile = {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

type LinkedMemberProfileRow = {
  display_name: string;
  email: string | null;
  avatar_url: string | null;
};

export async function getAcceptedLinkedMemberProfile(linkedUserId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .rpc("get_accepted_linked_member_profile", {
      p_linked_user_id: linkedUserId,
    })
    .maybeSingle();
  if (error) {
    if (error.code === "PGRST202") return null;
    throw error;
  }
  const profile = data as LinkedMemberProfileRow | null;
  if (!profile) return null;
  return {
    displayName: profile.display_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
  } satisfies LinkedMemberProfile;
}

export async function searchSignedUpMemberProfiles(input: {
  query: string;
  excludeUserId?: string | null;
  limit?: number;
}) {
  const query = input.query.trim();
  if (!supabase || query.length < 2) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_member_profiles", {
    search_query: query,
    result_limit: input.limit ?? 8,
  });
  if (error) {
    throw error;
  }

  return ((data ?? []) as SignedUpMemberProfileRow[])
    .filter((profile) => profile.id !== input.excludeUserId)
    .map((profile) => ({
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    displayName: profile.display_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    baseCurrency: profile.base_currency,
  })) satisfies SignedUpMemberProfile[];
}
