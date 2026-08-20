import { nowIso } from '@/src/domain/shared/identifiers';
import type {
  TelemetryRecord,
  TelemetrySink,
} from '@/src/application/ports/telemetry';

type TelemetryMetadata = Record<string, unknown>;

type TelemetryBreadcrumb = {
  timestamp: string;
  category: string;
  step: string;
  metadata: Record<string, string | number | boolean>;
};

const MAX_BREADCRUMBS = 40;

const ALLOWED_METADATA_KEYS = new Set([
  'attempts',
  'conflicts',
  'conflictType',
  'debtCount',
  'entityType',
  'errorCode',
  'errorName',
  'groupCount',
  'failed',
  'flow',
  'hasSession',
  'hasUser',
  'includeArchived',
  'includeAttachments',
  'includeComments',
  'includeNotes',
  'includePrivateNotes',
  'includeRejected',
  'includeRejectedDisputed',
  'memberCount',
  'method',
  'mode',
  'operation',
  'paymentCount',
  'processed',
  'pulled',
  'reason',
  'resolution',
  'result',
  'schemaVersion',
  'screen',
  'settlementCount',
  'source',
  'status',
  'succeeded',
  'syncQueueSize',
  'valid',
  'warningsCount',
]);

let telemetryEnabled = true;
let crashReportingEnabled = true;
let breadcrumbs: TelemetryBreadcrumb[] = [];
let globalHandlerInstalled = false;
const firstSuccess = new Set<string>();
let telemetrySink: TelemetrySink | null = null;

type GlobalErrorUtils = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

export function configureTelemetry(input: { telemetryEnabled?: boolean; crashReportingEnabled?: boolean }) {
  if (typeof input.telemetryEnabled === 'boolean') {
    telemetryEnabled = input.telemetryEnabled;
  }
  if (typeof input.crashReportingEnabled === 'boolean') {
    crashReportingEnabled = input.crashReportingEnabled;
  }
}

export function configureTelemetrySink(sink: TelemetrySink | null) {
  telemetrySink = sink;
}

export function installGlobalCrashHandler() {
  if (globalHandlerInstalled) {
    return;
  }
  const maybeErrorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!maybeErrorUtils?.getGlobalHandler || !maybeErrorUtils.setGlobalHandler) {
    return;
  }
  const previous = maybeErrorUtils.getGlobalHandler();
  maybeErrorUtils.setGlobalHandler((error, isFatal) => {
    captureTelemetryException(error, 'global_js_exception', { result: isFatal ? 'fatal' : 'non_fatal' });
    previous(error, isFatal);
  });
  globalHandlerInstalled = true;
}

export function addTelemetryBreadcrumb(category: string, step: string, metadata: TelemetryMetadata = {}) {
  const crumb: TelemetryBreadcrumb = {
    timestamp: nowIso(),
    category,
    step,
    metadata: sanitizeTelemetryMetadata(metadata),
  };
  breadcrumbs = breadcrumbs.concat(crumb).slice(-MAX_BREADCRUMBS);
  if (!telemetryEnabled) {
    return;
  }
  void writeTelemetryRecord({
    action: 'beta_breadcrumb',
    targetId: `${category}:${step}`,
    metadata: crumb.metadata,
  });
}

export function trackTelemetryEvent(event: string, metadata: TelemetryMetadata = {}) {
  if (!telemetryEnabled) {
    return;
  }
  void writeTelemetryRecord({
    action: 'beta_event',
    targetId: event,
    metadata: sanitizeTelemetryMetadata(metadata),
  });
}

export function trackFirstSuccess(milestone: 'auth' | 'sync' | 'export' | 'restore', metadata: TelemetryMetadata = {}) {
  if (firstSuccess.has(milestone)) {
    return;
  }
  firstSuccess.add(milestone);
  trackTelemetryEvent(`first_success_${milestone}`, metadata);
}

export function captureTelemetryException(error: unknown, context: string, metadata: TelemetryMetadata = {}) {
  const summary = summariseError(error);
  addTelemetryBreadcrumb('crash', context, summary);
  if (!crashReportingEnabled) {
    return;
  }
  void writeTelemetryRecord({
    action: 'beta_crash',
    targetId: context,
    metadata: {
      ...sanitizeTelemetryMetadata(metadata),
      ...summary,
      breadcrumbs: breadcrumbs.slice(-12).map((crumb) => ({
        timestamp: crumb.timestamp,
        category: crumb.category,
        step: crumb.step,
        metadata: crumb.metadata,
      })),
    },
  });
}

export function sanitizeTelemetryMetadata(metadata: TelemetryMetadata) {
  const sanitized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      continue;
    }
    if (typeof value === 'boolean') {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[key] = value;
      continue;
    }
    if (typeof value === 'string' && value) {
      sanitized[key] = value.slice(0, 80);
    }
  }
  return sanitized;
}

export function __resetTelemetryForTests() {
  telemetryEnabled = true;
  crashReportingEnabled = true;
  breadcrumbs = [];
  firstSuccess.clear();
  globalHandlerInstalled = false;
}

export function __getTelemetryBreadcrumbsForTests() {
  return breadcrumbs.slice();
}

function summariseError(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const objectError = error as { name?: unknown; code?: unknown };
    return sanitizeTelemetryMetadata({
      errorName: typeof objectError.name === 'string' ? objectError.name : 'Error',
      errorCode: typeof objectError.code === 'string' ? objectError.code : 'unknown',
    });
  }
  return { errorName: 'Error', errorCode: 'unknown' };
}

async function writeTelemetryRecord(input: TelemetryRecord) {
  if (!telemetrySink) {
    return;
  }
  try {
    await telemetrySink.write(input);
  } catch {
    // Ignore telemetry transport failures.
  }
}
