import { UnresponsiveIpfsHashInfo } from "./UnresponsiveIpfsHashInfo";

export type TrackedIpfsHashInfo = {
  ipfsHash: string;
  isWrapper?: boolean;
  isPinned: boolean;
  unresponsiveInfo?: UnresponsiveIpfsHashInfo;
  indexes: string[];
  isLost?: boolean;
};
