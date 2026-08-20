const mockRemove = jest.fn();
let mockState: 'active' | 'background' = 'active';
let mockListener: ((state: 'active' | 'background') => void) | null = null;

import { AppState, type AppStateStatus } from 'react-native';
import { bindAuthAutoRefreshLifecycle } from '../appLifecycle.native';

async function flushLifecycleQueue() {
  for (let step = 0; step < 12; step += 1) {
    await Promise.resolve();
  }
}

describe('native auth refresh lifecycle', () => {
  beforeEach(() => {
    mockState = 'active';
    mockListener = null;
    mockRemove.mockClear();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        mockListener = listener as (state: 'active' | 'background') => void;
        return { remove: mockRemove };
      });
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => mockState as AppStateStatus,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('starts once, follows foreground/background transitions, and cleans up', async () => {
    const controller = {
      startAutoRefresh: jest.fn(async () => undefined),
      stopAutoRefresh: jest.fn(async () => undefined),
    };

    const cleanup = bindAuthAutoRefreshLifecycle(controller);
    await flushLifecycleQueue();
    expect(controller.startAutoRefresh).toHaveBeenCalledTimes(1);

    mockListener?.('active');
    await flushLifecycleQueue();
    expect(controller.startAutoRefresh).toHaveBeenCalledTimes(1);

    mockListener?.('background');
    await flushLifecycleQueue();
    expect(controller.stopAutoRefresh).toHaveBeenCalledTimes(1);

    mockListener?.('active');
    await flushLifecycleQueue();
    expect(controller.startAutoRefresh).toHaveBeenCalledTimes(2);

    cleanup();
    await flushLifecycleQueue();
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(controller.stopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  test('strict-mode replacement is not stopped by stale cleanup', async () => {
    const first = {
      startAutoRefresh: jest.fn(async () => undefined),
      stopAutoRefresh: jest.fn(async () => undefined),
    };
    const replacement = {
      startAutoRefresh: jest.fn(async () => undefined),
      stopAutoRefresh: jest.fn(async () => undefined),
    };

    const cleanupFirst = bindAuthAutoRefreshLifecycle(first);
    const cleanupReplacement = bindAuthAutoRefreshLifecycle(replacement);
    cleanupFirst();
    await flushLifecycleQueue();

    expect(replacement.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(replacement.stopAutoRefresh).not.toHaveBeenCalled();

    cleanupReplacement();
    await flushLifecycleQueue();
    expect(replacement.stopAutoRefresh).toHaveBeenCalledTimes(1);
  });
});
