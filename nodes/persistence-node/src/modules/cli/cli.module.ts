import axios from "axios";
import { buildCliDependencyContainer, CliDependencyContainer } from "./cli.deps";

export class CliModule {

    private constructor(
        private deps: CliDependencyContainer,
        loggerEnabled: boolean
    ) {
        this.deps.loggerConfig.loggerEnabled = loggerEnabled;
    }

    static async build(shouldLog: boolean): Promise<CliModule> {
        const container = await buildCliDependencyContainer();

        return new CliModule(container.cradle, shouldLog);
    }

    async getInfo() {
        const data = await this.performApiCall('api/info')

        console.log(data);
    }

    async resetStorage() {
        const data = await this.performApiCall('api/reset')

        console.log(data);
    }

    private async performApiCall(url: string): Promise<string> {
        try {
            const res = await axios({
                method: 'GET',
                url: `http://localhost:${this.deps.persistenceNodeApiConfig.adminRpcApiPort}/${url}`,
            });

            return res.data;
        } catch (error) {
            return "ERROR: Persistence node daemon not running.";
        }
    }
}
