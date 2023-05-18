import { IndexConfig } from "../types";
import { IpfsApi } from "./IpfsConfig";
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
        },
        apis: IpfsApi[],
    },
    loggerEnabled: boolean,
    indexes: IndexConfig[],
    ensTextRecordIndexes: IndexConfig[],
};