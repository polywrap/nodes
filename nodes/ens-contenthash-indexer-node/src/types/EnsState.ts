export type EnsState = {
  lastBlockNumber: number;
  lastBlockNumberProcessed: number;
  ensContenthash: Record<string, string>;
  contenthashEns: Record<string, Record<string, boolean>>;
  isFullySynced: boolean;
};
