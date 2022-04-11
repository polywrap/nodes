import { buildCliDependencyContainer, CliDependencyContainer } from "./cli.deps";
import fs from "fs";
import path from "path";
import { buildDefaultConfig } from "../../config/buildDefaultConfig";

export class CliModule {

    private constructor(
        private deps: CliDependencyContainer
    ) {
    }

    static async build(shouldLog: boolean): Promise<CliModule> {
        const container = await buildCliDependencyContainer(shouldLog);

        return new CliModule(container.cradle);
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
}
