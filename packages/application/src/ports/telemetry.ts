export type TelemetryRecord = {
  action: 'beta_breadcrumb' | 'beta_event' | 'beta_crash';
  targetId: string;
  metadata: Record<string, unknown>;
};

export interface TelemetrySink {
  write(record: TelemetryRecord): Promise<void>;
}
