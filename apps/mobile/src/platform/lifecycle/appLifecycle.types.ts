export type AuthAutoRefreshController = {
  startAutoRefresh: () => Promise<void>;
  stopAutoRefresh: () => Promise<void>;
};

export type LifecycleCleanup = () => void;
