import { IPFSIndexConfig } from "../types/IPFSIndexConfig";

export type Config = {
    apiPort: number,
    gatewayPort: number,
    ipfs: {
        provider: string,
        gateway: string,
        timeouts: {
            objectGetTimeout: number,
            pinTimeout: number,
            unpinTimeout: number,
            gatewayTimeout: number
        }
    },
    loggerEnabled: boolean,
    indexes: IPFSIndexConfig[],
    wrapperResolution: {
        retries: {
            max: number,
            startingDelayInSec: number
        }
    }
};