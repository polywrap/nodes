import { IndexConfig } from "../types";
import { WrapperConfig } from "./WrapperConfig";

export type Config = {
    apiPort: number,
    persistenceMaxParallelTaskCount: number,
    persistenceIntervalSeconds: number,
    gateway: {
        port: number,
        requestTimeout: number,
        ipfsTimeout: number
    },
    wrapper: WrapperConfig,
    ipfs: {
        provider: string,
        gateways: string[],
        timeouts: {
            gatewayTimeout: number,
            pinTimeout: number,
            unpinTimeout: number,
        }
    },
    loggerEnabled: boolean,
    indexes: IndexConfig[],
    ensTextRecordIndexes: IndexConfig[],
};