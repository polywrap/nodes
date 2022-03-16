import fs from "fs";
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

    async runForPastBlocks(blocks: number) {
        await this.deps.cacheRunner.runForPastBlocks(blocks);
    }

    async runForMissedBlocks() {
        await this.deps.cacheRunner.runForMissedBlocks();
    }

    async processUnresponsive() {
        await this.deps.cacheRunner.processUnresponsive()
    }

    getInfo() {
        const storage = this.deps.storage;

        console.log(`Last block number was ${storage.lastBlockNumber}`);
        console.log(`There are ${Object.keys(storage.ensIpfs).length} pinned ENS domains`);
        console.log(`There are ${Object.keys(storage.ipfsEns).length} pinned IPFS hashes`);
        console.log(`There are ${Object.keys(storage.unresponsiveEnsNodes).length} unresponsive ENS domains/IPFS hashes`);
    }

    resetStorage() {
        if (fs.existsSync("./storage.json")) {
            fs.rmSync("./storage.json");
        }
    }
}
