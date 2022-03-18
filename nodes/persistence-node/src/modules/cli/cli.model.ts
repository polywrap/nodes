import axios from "axios";
import { buildCliDependencyContainer, CliDependencyContainer } from "./cli.deps";

export class CLI {

    private constructor(
        private deps: CliDependencyContainer,
        shouldLog: boolean
    ) {
        this.deps.loggerConfig.shouldLog = shouldLog;
    }

    static async build(shouldLog: boolean): Promise<CLI> {
        const container = await buildCliDependencyContainer();

        return new CLI(container.cradle, shouldLog);
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
                url: `http://localhost:${this.deps.internalApiConfig.port}/${url}`,
            });

            return res.data;
        } catch (error) {
            return "ERROR: Persistence node daemon not running.";
        }
    }
}
