export type TrackedIpfsHashInfo = {
  ipfsHash: string;
  isWrapper?: boolean;
  isPinned: boolean;
  unresponsiveInfo?: UnresponsiveInfo;
};

export type UnresponsiveInfo = {
  scheduledRetryDate: Date;
  retryCount: number;
};