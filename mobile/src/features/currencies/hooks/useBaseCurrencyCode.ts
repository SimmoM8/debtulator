import { DEFAULT_CURRENCY_CODE } from "@/src/features/currencies/model/Currency";
import { useProfile } from "@/src/features/profile/hooks/useProfile";

export function useBaseCurrencyCode(): string {
  const profile = useProfile();
  return profile.data?.baseCurrencyCode ?? DEFAULT_CURRENCY_CODE;
}
