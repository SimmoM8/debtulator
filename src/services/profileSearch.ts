import { supabase } from "@/src/services/supabase";
import type { CurrencyCode } from "@/src/types/models";

export type SignedUpMemberProfile = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  baseCurrency: CurrencyCode;
};

export async function searchSignedUpMemberProfiles(input: {
  query: string;
  excludeUserId?: string | null;
  limit?: number;
}) {
  const query = input.query.trim();
  if (!supabase || query.length < 2) {
    return [];
  }

  const pattern = `%${query.replaceAll("%", "").replaceAll(",", "")}%`;
  let request = supabase
    .from("profiles")
    .select("id, display_name, email, phone, avatar_url, base_currency")
    .or(`display_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .limit(input.limit ?? 8);

  if (input.excludeUserId) {
    request = request.neq("id", input.excludeUserId);
  }

  const { data, error } = await request;
  if (error) {
    throw error;
  }

  return (data ?? []).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    email: profile.email,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    baseCurrency: profile.base_currency,
  })) satisfies SignedUpMemberProfile[];
}
