import type {
  TelemetryRecord,
  TelemetrySink,
} from '@debtulator/application/ports/telemetry';
import { nowIso } from '@debtulator/domain/shared/identifiers';
import { supabase } from '@/src/infrastructure/supabase/client';

export const supabaseTelemetrySink: TelemetrySink = {
  async write(input: TelemetryRecord) {
    if (!supabase) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      actor_user_id: user?.id ?? null,
      action: input.action,
      target_type: 'app_telemetry',
      target_id: input.targetId,
      group_id: null,
      metadata: input.metadata,
      device_id: null,
      created_at: nowIso(),
    });
  },
};
