import { HttpConfig } from "../../api-server/HttpConfig";
import { HttpsConfig } from "../../api-server/HttpsConfig";
import { EthereumNetwork } from "../../services/EthereumNetwork";
import { buildMainDependencyContainer, MainDependencyContainer } from "./daemon.deps";

export class DaemonModule {

    private constructor(
        private deps: MainDependencyContainer,
        loggerEnabled: boolean
    ) {
        this.deps.loggerConfig.loggerEnabled = loggerEnabled;
     }

    static async build(shouldLog: boolean): Promise<DaemonModule> {
        const container = await buildMainDependencyContainer();

        return new DaemonModule(container.cradle, shouldLog);
    }

    async run(fromBlockNumber: number, httpConfig: HttpConfig, httpsConfig: HttpsConfig) {
        const indexingNetworks = this.deps.ensConfig.networks.map(networkConfig => new EthereumNetwork(networkConfig));

        const indexingTask = this.deps.ensIndexingService.startIndexing(fromBlockNumber, indexingNetworks[2]);
        
        Promise.all([
            this.deps.persistenceNodeApi.run(),
            this.deps.ipfsGatewayApi.run(
                httpConfig,
                httpsConfig
            ),
            indexingTask,
            this.deps.persistenceService.run()
        ]);
    }
}
