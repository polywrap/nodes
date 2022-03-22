import { IPFS } from "ipfs-core";
import { Logger } from "./services/Logger";
import { Storage } from "./types/Storage";
import { asyncIterableToArray } from "./utils/asyncIterableToArray";

export const getPinnedWrapperCIDs = async (storage: Storage, ipfsNode: IPFS, logger: Logger): Promise<string[]> => {

  const pinnedCidsFromIpfs = (await asyncIterableToArray(
    ipfsNode.pin.ls()
  )).map(pinned => pinned.cid.toString());

  const pinnedCidsFromStorageFile = Object.keys(storage.ipfsEns)

  const intersection = pinnedCidsFromStorageFile.filter(file => {
    if (pinnedCidsFromIpfs.includes(file)) {
      return true;
    } else {
      logger.log(
        `CID ${file} is saved in storage file, but not pinned on currently used IPFS node`
      );
    }
  })

  return intersection;
};
