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

    async run(httpConfig: HttpConfig, httpsConfig: HttpsConfig, processUnresponsive: boolean) {
        Promise.all([
            this.deps.persistenceNodeApi.run(),
            this.deps.ipfsGatewayApi.run(
                httpConfig,
                httpsConfig
            ),
            this.deps.cacheRunner.listenForEvents(),
            this.deps.ensNodeProcessor.run(processUnresponsive),
        ]);
    }

    async runForPastBlocks(blocks: number) {
        await this.deps.cacheRunner.runForPastBlocks(blocks);
    }

    async runForMissedBlocks() {
        await this.deps.cacheRunner.runForMissedBlocks();
    }
}
