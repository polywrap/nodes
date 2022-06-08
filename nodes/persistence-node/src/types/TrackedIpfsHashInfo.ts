import { UnresponsiveIpfsHashInfo } from "./UnresponsiveIpfsHashInfo";

export type TrackedIpfsHashInfo = {
  ipfsHash: string;
  status: Status;
  previousStatus?: Status;
  unresponsiveInfo?: UnresponsiveIpfsHashInfo;
  indexes: string[];
};

export enum Status {
  CheckingIfWrapper,
  Pinning,
  Pinned,
  Unpinning,
  NotAWrapper,
  Lost,
}