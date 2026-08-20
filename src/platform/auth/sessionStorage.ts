import { createMemoryAuthSessionStorage } from './sessionStorage.shared';

/**
 * Safe fallback for non-native, non-browser runtimes such as unit tests.
 * Metro resolves the native and web implementations in application builds.
 */
export const authSessionStorage = createMemoryAuthSessionStorage();
