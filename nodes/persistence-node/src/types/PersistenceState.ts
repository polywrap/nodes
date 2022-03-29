import { TrackedIpfsHashInfo } from "./TrackedIpfsHashInfo";

export type PersistenceState = {
  trackedIpfsHashes: Record<string, TrackedIpfsHashInfo>;
};

