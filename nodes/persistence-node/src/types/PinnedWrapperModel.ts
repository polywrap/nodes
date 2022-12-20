import { IndexWithEnsNodes } from "./IndexWithEnsNodes";

export type PinnedWrapperModel = { 
  cid: string, 
  name: string,
  version: string,
  type: string,
  size: string,
  indexes: IndexWithEnsNodes[],
};
