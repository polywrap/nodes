import * as IPFS from 'ipfs-core';
import { PersistenceNodeConfig } from './config/PersistenceNodeConfig';
import { nudgeIpfsHash } from './nudgeIpfsHash';
import { isValidWrapperManifestName } from './isValidWrapperManifestName';
import { sleep } from './sleep';
import { Logger } from './services/Logger';

export const isWrapper = async (ipfs: IPFS.IPFS, config: PersistenceNodeConfig, logger: Logger, cid: string): Promise<"yes" | "no" | "timeout"> => {
  try {
    const info = await ipfs.object.get(IPFS.CID.parse(cid), {
      timeout: config.objectGetTimeout,
    });

    return info.Links.some(x => x.Name && isValidWrapperManifestName(x.Name))
      ? "yes"
      : "no";
  } catch (e) {
    const success = await nudgeIpfsHash(config, cid);

    if(!success) {
      return "timeout";
    }

    try {
      //Waiting a bit to let IPFS catch up
      await sleep(10000);

      const info = await ipfs.object.get(IPFS.CID.parse(cid), {
        timeout: config.objectGetTimeout,
      });
  
      return info.Links.some(x => x.Name && isValidWrapperManifestName(x.Name))
        ? "yes"
        : "no";
    } catch (e: any) {
      logger.log(JSON.stringify(e));
      return "timeout";
    }
  }
};