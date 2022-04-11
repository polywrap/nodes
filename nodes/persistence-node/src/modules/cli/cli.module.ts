import axios from "axios";
import { buildCliDependencyContainer, CliDependencyContainer } from "./cli.deps";
import fs from "fs";
import path from "path";
import { buildDefaultConfig } from "../../config/buildDefaultConfig";

export class CliModule {

    private constructor(
        private deps: CliDependencyContainer,
        loggerEnabled: boolean
    ) {
        this.deps.loggerConfig.loggerEnabled = loggerEnabled;
    }

    async initialize(dataDirPath?: string, networkName?: string) {
        if(!dataDirPath) {
            dataDirPath = "./";
        }

        if(!fs.existsSync(dataDirPath)) {
            fs.mkdirSync(dataDirPath, { recursive: true });
        }

        const configFilePath = path.join(dataDirPath, "config.json");
        if(!fs.existsSync(configFilePath)) {
            fs.writeFileSync(configFilePath, JSON.stringify(buildDefaultConfig(), null, 2));
        } else {
            console.log("Already initialized. Skipping initialization.");
        }
    }

    static async build(shouldLog: boolean): Promise<CliModule> {
        const container = await buildCliDependencyContainer(shouldLog);

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
