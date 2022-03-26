export type PersistenceState = {
  trackedIpfsHashes: Map<string, TrackedIpfsHashInfo>;
  unresponsiveIpfsHashes: Map<string, boolean>,
};

export type TrackedIpfsHashInfo = {
  ipfsHash: string;
  isWrapper?: boolean;
  isPinned: boolean;
  isUnresponsive: boolean;
};