import { UnresponsiveIpfsHashInfo } from "./UnresponsiveIpfsHashInfo";
import { TrackedIpfsHashStatus } from "./TrackedIpfsHashStatus";

export type TrackedIpfsHashInfo = {
  ipfsHash: string;
  status: TrackedIpfsHashStatus;
  previousStatus?: TrackedIpfsHashStatus;
  unresponsiveInfo?: UnresponsiveIpfsHashInfo;
  indexes: string[];
};
