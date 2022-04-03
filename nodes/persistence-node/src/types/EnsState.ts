export type EnsState = {
  lastBlockNumber: number;
  ensIpfs: Record<string, string>;
  ipfsEns: Record<string, Record<string, boolean>>;
};
