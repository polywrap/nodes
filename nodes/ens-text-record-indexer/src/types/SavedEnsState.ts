import { TextRecordValue } from "./TextRecordValue";

export type SavedEnsState = {
  lastBlockNumber: number;
  ensRecordKeys: Record<string, Record<string, TextRecordValue>>;
  isFullySynced: boolean;
};
