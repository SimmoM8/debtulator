import type { Href } from 'expo-router';

export type RouteQuery = Readonly<Record<string, string | string[] | undefined>>;

function href(pathname: string, query?: RouteQuery): Href {
  const params = query
    ? Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined))
    : undefined;

  return params && Object.keys(params).length > 0
    ? ({ pathname, params } as Href)
    : (pathname as Href);
}

function dynamicHref(pathname: string, id: string, query?: RouteQuery): Href {
  return href(pathname, { ...query, id });
}

export function firstRouteParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The sole registry for application-owned navigation targets. */
export const routes = {
  auth: (query?: RouteQuery) => href('/auth', query),
  firstRun: (query?: RouteQuery) => href('/first-run', query),

  home: (query?: RouteQuery) => href('/(tabs)/home', query),
  activity: (query?: RouteQuery) => href('/(tabs)/home/activity', query),
  analytics: (query?: RouteQuery) => href('/(tabs)/home/analytics', query),
  requests: (query?: RouteQuery) => href('/(tabs)/home/requests', query),
  suggestions: (query?: RouteQuery) => href('/(tabs)/home/suggestions', query),

  debts: (query?: RouteQuery) => href('/(tabs)/debts', query),
  debtDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/debts/debt/[id]', id, query),
  debtForm: (query?: RouteQuery) => href('/(tabs)/debts/debt/form', query),
  debtHistory: (query?: RouteQuery) => href('/(tabs)/debts/debt/history', query),
  paymentDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/debts/payment/[id]', id, query),
  paymentForm: (query?: RouteQuery) => href('/(tabs)/debts/payment/form', query),
  debtSettlementDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/debts/settlement/[id]', id, query),

  members: (query?: RouteQuery) => href('/(tabs)/members', query),
  memberDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/members/member/[id]', id, query),
  memberForm: (query?: RouteQuery) => href('/(tabs)/members/member/form', query),

  groups: (query?: RouteQuery) => href('/(tabs)/groups', query),
  groupDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/groups/group/[id]', id, query),
  groupForm: (query?: RouteQuery) => href('/(tabs)/groups/group/form', query),
  expenseDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/groups/expense/[id]', id, query),
  expenseForm: (query?: RouteQuery) => href('/(tabs)/groups/expense/form', query),
  attachmentDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/groups/attachment/[id]', id, query),
  groupSettlementDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/groups/settlement/[id]', id, query),

  settings: (query?: RouteQuery) => href('/(tabs)/settings', query),
  accessibility: (query?: RouteQuery) => href('/(tabs)/settings/accessibility', query),
  backup: (query?: RouteQuery) => href('/(tabs)/settings/backup', query),
  conflictDetail: (id: string, query?: RouteQuery) =>
    dynamicHref('/(tabs)/settings/conflict/[id]', id, query),
  conflicts: (query?: RouteQuery) => href('/(tabs)/settings/conflicts', query),
  deleteAccount: (query?: RouteQuery) => href('/(tabs)/settings/delete-account', query),
  exportData: (query?: RouteQuery) => href('/(tabs)/settings/export', query),
  fullExport: (query?: RouteQuery) => href('/(tabs)/settings/full-export', query),
  importCsv: (query?: RouteQuery) => href('/(tabs)/settings/import-csv', query),
  language: (query?: RouteQuery) => href('/(tabs)/settings/language', query),
  notifications: (query?: RouteQuery) => href('/(tabs)/settings/notifications', query),
  privacy: (query?: RouteQuery) => href('/(tabs)/settings/privacy', query),
  recurringTemplates: (query?: RouteQuery) => href('/(tabs)/settings/recurring', query),
  recurringTemplateForm: (query?: RouteQuery) =>
    href('/(tabs)/settings/recurring/form', query),
  sync: (query?: RouteQuery) => href('/(tabs)/settings/sync', query),
} as const;
