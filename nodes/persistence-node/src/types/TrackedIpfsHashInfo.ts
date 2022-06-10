import { UnresponsiveIpfsHashInfo } from "./UnresponsiveIpfsHashInfo";

export type TrackedIpfsHashInfo = {
  ipfsHash: string;
  status: Status;
  previousStatus?: Status;
  unresponsiveInfo?: UnresponsiveIpfsHashInfo;
  indexes: string[];
};

export enum Status {
  CheckingIfWrapper = "CheckingIfWrapper", 
  Pinning = "Pinning", 
  Pinned = "Pinned", 
  Unpinning = "Unpinning", 
  NotAWrapper = "NotAWrapper", 
  Lost = "Lost"
}