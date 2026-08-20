import type {
  AuthAutoRefreshController,
  LifecycleCleanup,
} from './appLifecycle.types';

/** Supabase Auth already owns browser visibility-based token refresh. */
export function bindAuthAutoRefreshLifecycle(
  _controller: AuthAutoRefreshController,
): LifecycleCleanup {
  return () => undefined;
}

export function subscribeToAppForeground(
  listener: () => void,
): LifecycleCleanup {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      listener();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}
