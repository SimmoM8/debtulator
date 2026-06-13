import type { AppSettings } from '@/src/types/models';

export type TranslationKey =
  | 'debt'
  | 'expense'
  | 'payment'
  | 'settlement'
  | 'verified'
  | 'rejected'
  | 'disputed'
  | 'member'
  | 'group'
  | 'owedToYou'
  | 'youOwe'
  | 'sharedGroup'
  | 'private'
  | 'localOnly'
  | 'estimated'
  | 'sync'
  | 'conflict'
  | 'backup'
  | 'restore';

const translations: Record<'en' | 'sv', Record<TranslationKey, string>> = {
  en: {
    debt: 'Debt',
    expense: 'Expense',
    payment: 'Payment',
    settlement: 'Settlement',
    verified: 'Verified',
    rejected: 'Rejected',
    disputed: 'Disputed',
    member: 'Member',
    group: 'Group',
    owedToYou: 'Owed to you',
    youOwe: 'You owe',
    sharedGroup: 'Shared group',
    private: 'Private',
    localOnly: 'Local only',
    estimated: 'Estimated',
    sync: 'Sync',
    conflict: 'Conflict',
    backup: 'Backup',
    restore: 'Restore',
  },
  sv: {
    debt: 'Skuld',
    expense: 'Utgift',
    payment: 'Betalning',
    settlement: 'Avräkning',
    verified: 'Verifierad',
    rejected: 'Avvisad',
    disputed: 'Omstridd',
    member: 'Medlem',
    group: 'Group',
    owedToYou: 'Du ska få',
    youOwe: 'Du är skyldig',
    sharedGroup: 'Delat group',
    private: 'Privat',
    localOnly: 'Endast lokalt',
    estimated: 'Uppskattat',
    sync: 'Synk',
    conflict: 'Konflikt',
    backup: 'Säkerhetskopia',
    restore: 'Återställ',
  },
};

export function localeFromSettings(settings: AppSettings) {
  if (settings.language === 'sv') {
    return 'sv-SE';
  }
  if (settings.language === 'en') {
    return 'en-US';
  }
  return undefined;
}

export function t(settings: AppSettings, key: TranslationKey) {
  const language = settings.language === 'sv' ? 'sv' : 'en';
  return translations[language][key];
}

export function formatLocaleDate(settings: AppSettings, value: string | Date) {
  return new Intl.DateTimeFormat(localeFromSettings(settings)).format(typeof value === 'string' ? new Date(value) : value);
}

export function formatLocaleCurrency(settings: AppSettings, amount: number, currency: string) {
  return new Intl.NumberFormat(localeFromSettings(settings), {
    style: 'currency',
    currency,
  }).format(amount);
}
