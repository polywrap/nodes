import { HttpConfig } from "../../api-server/HttpConfig";
import { HttpsConfig } from "../../api-server/HttpsConfig";
import { buildMainDependencyContainer, MainDependencyContainer } from "./daemon.deps";
import fs from "fs";
import path from "path";
import { Config } from "../../config/Config";

export class DaemonModule {

    private constructor(
        private deps: MainDependencyContainer,
        loggerEnabled: boolean
    ) {
        this.deps.loggerConfig.loggerEnabled = loggerEnabled;
     }

     static async build(shouldLog: boolean, dataDirPathForSetup?: string): Promise<DaemonModule> {
        const { config, dataDirPath } = await DaemonModule.setupDataDirectory(dataDirPathForSetup);

        const container = await buildMainDependencyContainer(dataDirPath, config);

        return new DaemonModule(container.cradle, shouldLog);
    }

    async run(httpConfig: HttpConfig, httpsConfig: HttpsConfig) {
        Promise.all([
            this.deps.persistenceNodeApi.run(),
            this.deps.ipfsGatewayApi.run(
                httpConfig,
                httpsConfig
            ),
            this.deps.persistenceService.run()
        ]);
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
}
