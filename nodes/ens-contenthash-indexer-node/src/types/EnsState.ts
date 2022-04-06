export type EnsState = {
  lastBlockNumber: number;
  ensContenthash: Record<string, string>;
  contenthashEns: Record<string, Record<string, boolean>>;
};
