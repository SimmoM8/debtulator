import { supabase } from '@/src/services/supabase';

export async function resetHostedDevelopmentData() {
  if (!__DEV__) {
    throw new Error('Development reset is unavailable in production builds.');
  }
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.functions.invoke('reset-test-data', {
    method: 'POST',
  });
  if (error) {
    let message = error.message || 'Hosted test-data reset failed.';
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (typeof context?.json === 'function') {
      const body = await context.json().catch(() => null) as { error?: string } | null;
      message = body?.error ?? message;
    }
    throw new Error(message);
  }
}
