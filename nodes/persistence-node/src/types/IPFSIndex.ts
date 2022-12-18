import { CIDWithEnsNodes } from "./CIDWithEnsNodes";

export type IPFSIndex = {
  name: string;
  cids: CIDWithEnsNodes[],
  error: boolean
};
