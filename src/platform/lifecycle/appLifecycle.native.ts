import { AppState, type AppStateStatus } from 'react-native';

import type {
  AuthAutoRefreshController,
  LifecycleCleanup,
} from './appLifecycle.types';

let activeAuthLifecycleBinding: symbol | null = null;
let authLifecycleTransition = Promise.resolve();

function enqueueAuthLifecycleTransition(operation: () => Promise<void>) {
  authLifecycleTransition = authLifecycleTransition
    .catch(() => undefined)
    .then(operation)
    .catch(() => undefined);
}

export function bindAuthAutoRefreshLifecycle(
  controller: AuthAutoRefreshController,
): LifecycleCleanup {
  const binding = Symbol('auth-auto-refresh-lifecycle');
  activeAuthLifecycleBinding = binding;
  let disposed = false;
  let active: boolean | null = null;

  const updateAutoRefresh = (state: AppStateStatus) => {
    const nextActive = state === 'active';
    if (active === nextActive) {
      return;
    }
    active = nextActive;
    enqueueAuthLifecycleTransition(async () => {
      if (activeAuthLifecycleBinding !== binding) {
        return;
      }
      await (nextActive
        ? controller.startAutoRefresh()
        : controller.stopAutoRefresh());
    });
  };

  updateAutoRefresh(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateAutoRefresh);

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;
    subscription.remove();
    if (activeAuthLifecycleBinding === binding) {
      activeAuthLifecycleBinding = null;
    }
    enqueueAuthLifecycleTransition(async () => {
      // React Strict Mode can immediately replace a binding after cleanup.
      // Do not let the stale cleanup stop the replacement's refresh loop.
      if (activeAuthLifecycleBinding === null) {
        await controller.stopAutoRefresh();
      }
    });
  };
}

export function subscribeToAppForeground(
  listener: () => void,
): LifecycleCleanup {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      listener();
    }
  });
  return () => subscription.remove();
}
