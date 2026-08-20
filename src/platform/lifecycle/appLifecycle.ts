import type {
  AuthAutoRefreshController,
  LifecycleCleanup,
} from './appLifecycle.types';

/** Fallback lifecycle for non-platform runtimes. */
export function bindAuthAutoRefreshLifecycle(
  controller: AuthAutoRefreshController,
): LifecycleCleanup {
  void controller.startAutoRefresh().catch(() => undefined);
  return () => {
    void controller.stopAutoRefresh().catch(() => undefined);
  };
}

export function subscribeToAppForeground(
  _listener: () => void,
): LifecycleCleanup {
  return () => undefined;
}
