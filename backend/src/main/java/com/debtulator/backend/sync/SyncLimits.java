package com.debtulator.backend.sync;

public final class SyncLimits {

    public static final int MAX_PUSH_BATCH_SIZE = 100;
    public static final int DEFAULT_PULL_PAGE_SIZE = 500;
    public static final int MAX_PULL_PAGE_SIZE = 500;
    public static final int DEFAULT_BOOTSTRAP_PAGE_SIZE = 500;
    public static final int MAX_BOOTSTRAP_PAGE_SIZE = 500;

    private SyncLimits() {
    }
}
