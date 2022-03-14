#!/usr/bin/env node
import { buildDependencyContainer } from "./di/buildDependencyContainer";
import { program } from "commander";
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("custom-env").env();

(async () => {
  const dependencyContainer = await buildDependencyContainer();
  const {
    cacheRunner,
    unrensponsiveEnsNodeProcessor,
    ipfsGatewayApi,
    storage,
    loggerConfig
  } = dependencyContainer.cradle;

  program
    .command("past")
    .description("Run for a past block count")
    .requiredOption("-b, --blocks <number>", "Past block count")
    .option("--log", "Enable logging")
    .option("--processUnresponsive", "Retry fetching unresponsive wrappers")
    .action(async (options) => {
      if (!!options.log) {
        loggerConfig.shouldLog = true;
      }

      if (!!options.processUnresponsive) {
        await Promise.all([
          unrensponsiveEnsNodeProcessor.execute(), 

          cacheRunner.runForPastBlocks(Number(options.blocks))
            .then(() => unrensponsiveEnsNodeProcessor.cancel())]);

        process.exit(0);
      } else {
        await cacheRunner.runForPastBlocks(Number(options.blocks));
      
        process.exit(0);
      }
    });
  
  program
    .command("missed")
    .description("Run for missed blocks while the app was offline")
    .option("--log", "Enable logging")
    .option("--processUnresponsive", "Retry fetching unresponsive wrappers")
    .action(async (options) => {
      if (!!options.log) {
        loggerConfig.shouldLog = true;
      }
      
      if (!!options.processUnresponsive) {
        await Promise.all([
          unrensponsiveEnsNodeProcessor.execute(),
          
          cacheRunner.runForMissedBlocks()
            .then(() => unrensponsiveEnsNodeProcessor.cancel())]);
        
        process.exit(0);
      } else {
        await cacheRunner.runForMissedBlocks();
        process.exit(0);
      }
    });

  program
    .command("listen")
    .description("Listen for events and pin wrappers")
    .option("--log", "Enable logging")
    .option("--processUnresponsive", "Retry fetching unresponsive wrappers")
    .action(async (options) => {
      if(!!options.log) {
        loggerConfig.shouldLog = true;
      }

      if (!!options.processUnresponsive) {
        await Promise.all([
          unrensponsiveEnsNodeProcessor.execute(),
          cacheRunner.listenForEvents()])
      } else {
        await cacheRunner.listenForEvents();
      }
    });

  program
    .command("api")
    .description("Run the API")
    .option("-l, --listen", "Listen to events")
    .option("--http <number>", "Http port")
    .option("--https <number>", "Https port")
    .option("--ssl <string>", "Directory with SSL certificates")
    .option("--log", "Enable logging")
    .option("--processUnresponsive", "Retry fetching unresponsive wrappers")
    .action(async (options) => {
      if(!!options.log) {
        loggerConfig.shouldLog = true;
      }

      if(!options.http && !options.https) {
        console.error("You must specify either an http or an https port(or both)");
        process.exit();
      }

      const httpConfig = options.http 
        ? {
            port: Number(options.http),
          }
        : undefined;
      
      const httpsConfig = options.https
        ? {
            port: Number(options.https),
            sslDir: options.ssl,
          }
        : undefined;

      const promises: Promise<void>[] = [ipfsGatewayApi.run(httpConfig, httpsConfig)];

      if (options.listen) {
        promises.push(cacheRunner.listenForEvents());
      } else if (options.listen && options.processUnresponsive) {
        promises.push(unrensponsiveEnsNodeProcessor.execute(), 
          cacheRunner.listenForEvents()
            .then(() => unrensponsiveEnsNodeProcessor.cancel()));
      }
      
      await Promise.all(promises);
    });

  program
    .command("unresponsive")
    .description("Process unresponsive IPFS URIs")
    .option("--log", "Enable logging")
    .action(async (options) => {
      if(!!options.log) {
        loggerConfig.shouldLog = true;
      }

      const promise = unrensponsiveEnsNodeProcessor.execute();
      unrensponsiveEnsNodeProcessor.cancel();
      await promise;

      process.exit(0);
    });

  program
    .command("info")
    .description("Display useful information about the current state (pinned hash count, unresponsive count, etc)")
    .action(async (options) => {
      console.log(`Last block number was ${storage.lastBlockNumber}`);
      console.log(`There are ${Object.keys(storage.ensIpfs).length} pinned ENS domains`);
      console.log(`There are ${Object.keys(storage.ipfsEns).length} pinned IPFS hashes`);
      console.log(`There are ${Object.keys(storage.unresponsiveEnsNodes).length} unresponsive ENS domains/IPFS hashes`);
      process.exit(0);
    });

  program
    .command("reset")
    .description("Delete the storage file")
    .action(async (options) => {
      if(fs.existsSync("./storage.json")) {
        fs.rmSync("./storage.json");
      }
      process.exit(0);
    });

  program.parse(process.argv);
})();
