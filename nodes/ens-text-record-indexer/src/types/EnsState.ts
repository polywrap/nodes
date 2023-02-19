import { TextRecordValue } from "./TextRecordValue";

export type EnsState = {
  lastBlockNumber: number;
  lastBlockNumberProcessed: number;
  ensRecordKeys: Record<string, Record<string, TextRecordValue>>;
  isFullySynced: boolean;
};


