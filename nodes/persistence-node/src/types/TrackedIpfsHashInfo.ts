import { UnresponsiveIpfsHashInfo } from "./UnresponsiveIpfsHashInfo";
import { TrackedIpfsHashStatus } from "./TrackedIpfsHashStatus";
import { IndexWithEnsNodes } from "./IndexWithEnsNodes";

export type TrackedIpfsHashInfo = {
  ipfsHash: string;
  status: TrackedIpfsHashStatus;
  previousStatus?: TrackedIpfsHashStatus;
  unresponsiveInfo?: UnresponsiveIpfsHashInfo;
  indexes: IndexWithEnsNodes[];
};
