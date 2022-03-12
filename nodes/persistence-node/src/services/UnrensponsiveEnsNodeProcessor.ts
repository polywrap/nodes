import { sleep } from "../sleep";
import { Storage } from "../types/Storage";
import { CacheRunner } from "./CacheRunner";
import { Logger } from "./Logger";

interface IDependencies {
    storage: Storage,
    cacheRunner: CacheRunner,
    logger: Logger
}

export class UnrensponsiveEnsNodeProcessor {
    isCanceled = false;
    deps: IDependencies;

    constructor(deps: IDependencies) {
        this.deps = deps;
    }

    async execute() {
        this.deps.logger.log("Processing unrensponsive packages...");

        while (true) {
            const unresponsiveEnsNodes = Object.keys(this.deps.storage.unresponsiveEnsNodes);
            
            if (this.isCanceled && !unresponsiveEnsNodes.length) {
                return;
            }
            
            if (!unresponsiveEnsNodes.length) {
                await sleep(500);
                continue;
            }
            
            this.deps.storage.unresponsiveEnsNodes = {};

            await this.deps.cacheRunner.processEnsNodes(unresponsiveEnsNodes);
        }
    }

    cancel() {
        this.isCanceled = true;
    }
}