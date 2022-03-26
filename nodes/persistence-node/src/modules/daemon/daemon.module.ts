import { HttpConfig } from "../../api-server/HttpConfig";
import { HttpsConfig } from "../../api-server/HttpsConfig";
import { buildMainDependencyContainer, MainDependencyContainer } from "./daemon.deps";

export class DaemonModule {

    private constructor(
        private deps: MainDependencyContainer,
        shouldLog: boolean
    ) {
        this.deps.loggerConfig.shouldLog = shouldLog;
     }

    static async build(shouldLog: boolean): Promise<DaemonModule> {
        const container = await buildMainDependencyContainer();

        return new DaemonModule(container.cradle, shouldLog);
    }

    async run(fromBlockNumber: number, httpConfig: HttpConfig, httpsConfig: HttpsConfig) {
        Promise.all([
            this.deps.persistenceNodeApi.run(),
            this.deps.ipfsGatewayApi.run(
                httpConfig,
                httpsConfig
            ),
            this.deps.ensIndexer.startIndexing(fromBlockNumber)
        ]);
    }
}
