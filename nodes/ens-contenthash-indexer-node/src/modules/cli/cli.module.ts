import { buildCliDependencyContainer, CliDependencyContainer } from "./cli.deps";
import fs from "fs";
import path from "path";
import { buildDefaultConfig } from "../../config/buildDefaultConfig";
import { Config } from "../../config/Config";
import axios from "axios";

export class CliModule {

    private constructor(
        private deps: CliDependencyContainer,
        loggerEnabled: boolean
    ) {
        this.deps.loggerConfig.loggerEnabled = loggerEnabled;
    }

    static async build(shouldLog: boolean, dataDirPathForSetup?: string, apiPort?: number): Promise<CliModule> {
        const { config, dataDirPath } = await CliModule.setupDataDirectory(dataDirPathForSetup);

        const container = await buildCliDependencyContainer(dataDirPath, config, apiPort);

        return new CliModule(container.cradle, shouldLog);
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
            fs.writeFileSync(configFilePath, JSON.stringify(buildDefaultConfig(networkName), null, 2));
        } else {
            console.log("Already initialized. Skipping initialization.");
        }
    }

    async updateFastSyncFile() {
        const ipfsHash = await this.performApiPost('api/fast-sync/upload')

        console.log(`Fast sync file uploaded to ${ipfsHash}`);
    }

    static async setupDataDirectory(
        dataDirPath?: string
    ): Promise<{
        config: Config;
        dataDirPath: string;
    }> {
        if(!dataDirPath) {
            dataDirPath = "./";
        }
       
        const configFilePath = path.join(dataDirPath, "config.json");
        if(!fs.existsSync(configFilePath)) {
            console.log(`No config file found at ${configFilePath}. Run the 'init' command before running the daemon.`);
            process.exit(1);
        }

        return {
            config: JSON.parse(fs.readFileSync(configFilePath, "utf8")),
            dataDirPath
        };
    }

    private async performApiGet(url: string): Promise<string> {
        try {
            const res = await axios({
                method: 'GET',
                url: `http://localhost:${this.deps.apiPort}/${url}`
            });

            return res.data;
        } catch (error) {
            return "ERROR: Daemon not running.";
        }
    }

    private async performApiPost(url: string, data?: any): Promise<string> {
        try {
            const res = await axios({
                method: 'POST',
                url: `http://localhost:${this.deps.apiPort}/${url}`,
                data: data
            });

            return res.data;
        } catch (error) {
            return "ERROR: Daemon not running.";
        }
    }
}
