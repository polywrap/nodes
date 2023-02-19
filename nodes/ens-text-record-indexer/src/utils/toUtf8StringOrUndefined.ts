import { ethers } from "ethers";

export const toUtf8StringOrUndefined = (str: string): string | undefined => {
  try {
    return ethers.utils.toUtf8String(str);
  } catch (e) {
    return undefined;
  }
};
