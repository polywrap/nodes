import { buildMainDependencyContainer, MainDependencyContainer } from "./daemon.deps";
import fs from "fs";
import path from "path";
import { Config } from "../../config/Config";
import { TrackedIpfsHashStatus } from "../../types/TrackedIpfsHashStatus";

export class DaemonModule {

    private constructor(
        private deps: MainDependencyContainer,
        loggerEnabled: boolean
    ) {
        this.deps.loggerConfig.loggerEnabled = loggerEnabled;
     }

    static async build(
        shouldLog: boolean, 
        dataDirPathForSetup?: string, 
        apiPort?: number,
        gatewayPort?: number
    ): Promise<DaemonModule> {
        const { config, dataDirPath } = await DaemonModule.setupDataDirectory(dataDirPathForSetup);

        const container = await buildMainDependencyContainer(dataDirPath, config, apiPort, gatewayPort);

        return new DaemonModule(container.cradle, shouldLog);
    }

    async run(shouldPurgeInvalidWrappers: boolean) {
        if(shouldPurgeInvalidWrappers) {
          await this.deps.validationService.purgeInvalidWrappers();
        }

        await this.processPinnedWrappers();

        Promise.all([
            this.deps.apiServer.run(),
            this.deps.gatewayServer.run(),
            this.deps.persistenceService.run()
        ]);
    }

    async processPinnedWrappers(): Promise<void> {
      const wrappers = this.deps.persistenceStateManager.getTrackedIpfsHashInfos()
        .filter(
          x => x.status === TrackedIpfsHashStatus.Pinned
        );
  
      await this.deps.wrapperProcessor.processMultipleWrappers(wrappers.map(x => x.ipfsHash));
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
