/**
 * Mobile dependency assembly belongs in this layer. Expo Router layouts remain
 * the runtime composition roots while reusable wiring is extracted here.
 */
export {};
export {
  openMobileLocalData,
  SqliteLocalLedgerAdapter,
  type MobileLocalDataRuntime,
} from './local-data/SqliteLocalLedgerAdapter';
