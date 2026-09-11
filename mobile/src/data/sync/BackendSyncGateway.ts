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

type AccessTokenProvider = () => Promise<string>;

type ProblemDetail = {
  title?: unknown;
  detail?: unknown;
  minimumCursor?: unknown;
};

export class BackendApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

export class SyncCursorExpiredError extends BackendApiError {
  constructor(readonly minimumCursor: string | null) {
    super(
      "The local sync cursor has expired and a full bootstrap is required.",
      410,
    );
    this.name = "SyncCursorExpiredError";
  }
}

export class BackendSyncGateway {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly getAccessToken: AccessTokenProvider,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async pushMutation(mutation: SyncMutation): Promise<SyncMutationResult> {
    const payload =
      mutation.payloadJson === null ? null : JSON.parse(mutation.payloadJson);

    const response = await this.request<{ results: unknown[] }>(
      "/api/v1/sync/mutations",
      {
        method: "POST",
        body: JSON.stringify({
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
        }),
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

    const response = await this.request<{
      changes: unknown;
      nextCursor: unknown;
      hasMore: unknown;
    }>(
      `/api/v1/sync/changes?after=${encodeURIComponent(cursor)}&limit=${PAGE_SIZE}`,
      { method: "GET" },
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
  }

  async startBootstrap(): Promise<BootstrapStartResponse> {
    const response = await this.request<{
      cursor: unknown;
      entityTypes: unknown;
    }>("/api/v1/sync/bootstrap", { method: "GET" });

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
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
    });

    if (afterId) {
      query.set("afterId", afterId);
    }

    const response = await this.request<{
      entityType: unknown;
      items: unknown;
      nextAfterId: unknown;
      hasMore: unknown;
    }>(
      `/api/v1/sync/bootstrap/${entityType}?${query.toString()}`,
      { method: "GET" },
    );

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

    const nextAfterId =
      response.nextAfterId === null
        ? null
        : requireString(response.nextAfterId, "nextAfterId");

    return {
      entityType: returnedEntityType,
      items: response.items.map(parseBootstrapItem),
      nextAfterId,
      hasMore: requireBoolean(response.hasMore, "hasMore"),
    };
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      const problem = await readProblemDetail(response);

      if (response.status === 410) {
        const minimumCursor =
          typeof problem?.minimumCursor === "string"
            ? problem.minimumCursor
            : null;

        throw new SyncCursorExpiredError(minimumCursor);
      }

      const message =
        typeof problem?.detail === "string"
          ? problem.detail
          : typeof problem?.title === "string"
            ? problem.title
            : `Backend request failed with status ${response.status}.`;

      throw new BackendApiError(message, response.status);
    }

    return (await response.json()) as T;
  }
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

function parseEntityType(
  value: unknown,
  field: string,
): SyncEntityType {
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
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error("Backend returned an invalid entity version.");
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
  if (typeof value !== "string") {
    throw new Error(`Backend returned an invalid ${field}.`);
  }

  return value;
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

async function readProblemDetail(
  response: Response,
): Promise<ProblemDetail | null> {
  try {
    return (await response.json()) as ProblemDetail;
  } catch {
    return null;
  }
}
