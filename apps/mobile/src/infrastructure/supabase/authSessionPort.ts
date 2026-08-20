import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { AuthSessionPort } from '@debtulator/application/auth/AuthSessionCoordinator';

export function createSupabaseAuthSessionPort(
  client: SupabaseClient,
): AuthSessionPort<Session> {
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw error;
      }
      return data.session;
    },
    subscribe(listener) {
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, session) => {
        // Keep this callback synchronous and free of nested auth/database work.
        listener(session);
      });
      return () => subscription.unsubscribe();
    },
  };
}
