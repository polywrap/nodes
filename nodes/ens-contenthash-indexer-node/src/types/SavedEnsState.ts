export type SavedEnsState = {
  lastBlockNumber: number;
  ensContenthash: Record<string, string>;
  contenthashEns: Record<string, Record<string, boolean>>;
  isFullySynced: boolean;
  lastSyncedAt: Date | null;
};
