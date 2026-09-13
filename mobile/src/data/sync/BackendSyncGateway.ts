import {
  BackendClient,
  BackendError,
} from "@/src/data/backend/BackendClient";
import type { Currency } from "@/src/features/currencies/model/Currency";
import type { Profile } from "@/src/features/profile/model/Profile";

import type {
  BootstrapStartResponse,
  PullSyncResponse,
  RemoteSyncChange,
  SyncBootstrapItem,
  SyncBootstrapPageResponse,
  SyncEntityType,
  SyncMutation,
  SyncMutationResult,
} from "./syncTypes";

const PAGE_SIZE = 500;

export class SyncCursorExpiredError extends BackendError {
  constructor(readonly minimumCursor: string | null) {
    super(
      "The local sync cursor has expired and a full bootstrap is required.",
      410,
      "SYNC_CURSOR_EXPIRED",
    );
    this.name = "SyncCursorExpiredError";
  }
}

export class BackendSyncGateway {
  constructor(private readonly backend: BackendClient) {}

  async pushMutation(mutation: SyncMutation): Promise<SyncMutationResult> {
    const payload =
      mutation.payloadJson === null ? null : JSON.parse(mutation.payloadJson);

    const response = await this.backend.post<{ results: unknown[] }>(
      "/api/v1/sync/mutations",
      {
        mutations: [
          {
            id: mutation.id,
            entityType: mutation.entityType,
            entityId: mutation.entityId,
            operation: mutation.operation,
            baseVersion: mutation.baseVersion,
            payload,
          },
        ],
      },
    );

    if (!Array.isArray(response.results) || response.results.length !== 1) {
      throw new Error("Backend returned an invalid sync mutation response.");
    }

    const result = parseMutationResult(response.results[0]);

    if (result.mutationId !== mutation.id) {
      throw new Error("Backend returned a result for a different mutation.");
    }

    return result;
  }

  async getChangesAfter(cursor: string): Promise<PullSyncResponse> {
    assertCursor(cursor);

    try {
      const response = await this.backend.get<{
        changes: unknown;
        nextCursor: unknown;
        hasMore: unknown;
      }>(
        `/api/v1/sync/changes?after=${encodeURIComponent(cursor)}&limit=${PAGE_SIZE}`,
      );

      if (!Array.isArray(response.changes)) {
        throw new Error("Backend returned an invalid sync change list.");
      }

      const nextCursor = requireString(response.nextCursor, "nextCursor");
      assertCursor(nextCursor);

      return {
        changes: response.changes.map(parseRemoteChange),
        nextCursor,
        hasMore: requireBoolean(response.hasMore, "hasMore"),
      };
    } catch (error) {
      if (error instanceof BackendError && error.status === 410) {
        const minimumCursor =
          typeof error.problem?.minimumCursor === "string"
            ? error.problem.minimumCursor
            : null;

        throw new SyncCursorExpiredError(minimumCursor);
      }

      throw error;
    }
  }

  async startBootstrap(): Promise<BootstrapStartResponse> {
    const response = await this.backend.get<{
      cursor: unknown;
      entityTypes: unknown;
    }>("/api/v1/sync/bootstrap");

    const cursor = requireString(response.cursor, "cursor");
    assertCursor(cursor);

    if (!Array.isArray(response.entityTypes)) {
      throw new Error("Backend returned invalid bootstrap entity types.");
    }

    return {
      cursor,
      entityTypes: response.entityTypes.map((value) =>
        parseEntityType(value, "entityTypes"),
      ),
    };
  }

  async getBootstrapPage(
    entityType: SyncEntityType,
    afterId: string | null,
  ): Promise<SyncBootstrapPageResponse> {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });

    if (afterId) {
      query.set("afterId", afterId);
    }

    const response = await this.backend.get<{
      entityType: unknown;
      items: unknown;
      nextAfterId: unknown;
      hasMore: unknown;
    }>(`/api/v1/sync/bootstrap/${entityType}?${query.toString()}`);

    const returnedEntityType = parseEntityType(
      response.entityType,
      "entityType",
    );

    if (returnedEntityType !== entityType) {
      throw new Error("Backend returned bootstrap data for another entity type.");
    }

    if (!Array.isArray(response.items)) {
      throw new Error("Backend returned an invalid bootstrap item list.");
    }

    return {
      entityType: returnedEntityType,
      items: response.items.map(parseBootstrapItem),
      nextAfterId:
        response.nextAfterId === null
          ? null
          : requireString(response.nextAfterId, "nextAfterId"),
      hasMore: requireBoolean(response.hasMore, "hasMore"),
    };
  }

  async getCurrencyCatalogue(): Promise<Currency[]> {
    const value = await this.backend.get<unknown>("/api/v1/currencies");

    if (!Array.isArray(value)) {
      throw new Error("Backend returned an invalid currency catalogue.");
    }

    return value.map(parseCurrency);
  }

  async getProfile(): Promise<Profile> {
    const value = requireObject(
      await this.backend.get<unknown>("/api/v1/profile"),
      "profile",
    );

    return {
      userId: requireString(value.userId, "userId"),
      username: requireString(value.username, "username"),
      name: requireNullableString(value.name, "name"),
      phoneNumber: requireNullableString(value.phoneNumber, "phoneNumber"),
      baseCurrencyCode: requireString(value.baseCurrency, "baseCurrency"),
    };
  }
}

function parseCurrency(value: unknown): Currency {
  const object = requireObject(value, "currency");
  const code = requireString(object.code, "code");
  const decimalPlaces = requireSafeInteger(object.decimalPlaces, "decimalPlaces");
  const displayOrder = requireSafeInteger(object.displayOrder, "displayOrder");

  if (!/^[A-Z]{3}$/.test(code)) {
    throw new Error("Backend returned an invalid currency code.");
  }

  if (decimalPlaces < 0 || decimalPlaces > 8) {
    throw new Error("Backend returned invalid currency decimal places.");
  }

  if (displayOrder < 0) {
    throw new Error("Backend returned an invalid currency display order.");
  }

  return {
    code,
    name: requireString(object.name, "name"),
    symbol: requireString(object.symbol, "symbol"),
    decimalPlaces,
    enabled: requireBoolean(object.enabled, "enabled"),
    displayOrder,
  };
}

function parseMutationResult(value: unknown): SyncMutationResult {
  const object = requireObject(value, "mutation result");

  return {
    mutationId: requireString(object.mutationId, "mutationId"),
    status: parseMutationStatus(object.status),
    entityType: parseEntityType(object.entityType, "entityType"),
    entityId: requireString(object.entityId, "entityId"),
    version: requireNullableVersion(object.version),
    errorCode:
      object.errorCode === null
        ? null
        : requireString(object.errorCode, "errorCode"),
    message:
      object.message === null ? null : requireString(object.message, "message"),
    replayed: requireBoolean(object.replayed, "replayed"),
  };
}

function parseRemoteChange(value: unknown): RemoteSyncChange {
  const object = requireObject(value, "sync change");
  const sequence = requireString(object.sequence, "sequence");
  assertCursor(sequence);

  return {
    sequence,
    entityType: parseEntityType(object.entityType, "entityType"),
    entityId: requireString(object.entityId, "entityId"),
    operation: parseOperation(object.operation),
    payload:
      object.payload === null
        ? null
        : requireObject(object.payload, "payload"),
    changedAt: requireString(object.changedAt, "changedAt"),
  };
}

function parseBootstrapItem(value: unknown): SyncBootstrapItem {
  const object = requireObject(value, "bootstrap item");

  return {
    entityId: requireString(object.entityId, "entityId"),
    version: requireVersion(object.version),
    payload: requireObject(object.payload, "payload"),
  };
}

function parseEntityType(value: unknown, field: string): SyncEntityType {
  const text = requireString(value, field);

  if (text !== "member" && text !== "debt") {
    throw new Error(`Unsupported sync entity type '${text}'.`);
  }

  return text;
}

function parseOperation(value: unknown): "upsert" | "delete" {
  const text = requireString(value, "operation");

  if (text !== "upsert" && text !== "delete") {
    throw new Error(`Unsupported sync operation '${text}'.`);
  }

  return text;
}

function parseMutationStatus(
  value: unknown,
): "applied" | "conflict" | "rejected" | "retry" {
  const text = requireString(value, "status");

  if (
    text !== "applied" &&
    text !== "conflict" &&
    text !== "rejected" &&
    text !== "retry"
  ) {
    throw new Error(`Unsupported sync mutation status '${text}'.`);
  }

  return text;
}

function requireNullableVersion(value: unknown): number | null {
  return value === null ? null : requireVersion(value);
}

function requireVersion(value: unknown): number {
  const version = requireSafeInteger(value, "version");

  if (version < 0) {
    throw new Error("Backend returned an invalid entity version.");
  }

  return version;
}

function requireSafeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Backend returned an invalid ${field}.`);
  }

  return value;
}

function requireObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Backend returned an invalid ${field}.`);
  }

  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Backend returned an invalid ${field}.`);
  }

  return value;
}

function requireNullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }

  return requireString(value, field);
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Backend returned an invalid ${field}.`);
  }

  return value;
}

function assertCursor(value: string): void {
  if (!/^\d+$/.test(value)) {
    throw new Error("Backend returned an invalid sync cursor.");
  }
}
