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
    ipfsGatewayApi,
    storage,
    loggerConfig
  } = dependencyContainer.cradle;

  program
    .command("past")
    .description("Run for a past block count")
    .requiredOption("-b, --blocks <number>", "Past block count")
    .option("--log", "Enable logging")
    .action(async (options) => {
      if(!!options.log) {
        loggerConfig.shouldLog = true;
      }
      
      await cacheRunner.runForPastBlocks(Number(options.blocks));
      process.exit(0);
    });
  
  program
    .command("missed")
    .description("Run for missed blocks while the app was offline")
    .option("--log", "Enable logging")
    .action(async (options) => {
      if(!!options.log) {
        loggerConfig.shouldLog = true;
      }
      
      await cacheRunner.runForMissedBlocks();
      process.exit(0);
    });

  program
    .command("listen")
    .description("Listen for events and pin wrappers")
    .option("--log", "Enable logging")
    .action(async (options) => {
      if(!!options.log) {
        loggerConfig.shouldLog = true;
      }
      
      await cacheRunner.listenForEvents();
    });

  program
    .command("api")
    .description("Run the API")
    .option("-l, --listen", "Listen to events")
    .option("--http <number>", "Http port")
    .option("--https <number>", "Https port")
    .option("--ssl <string>", "Directory with SSL certificates")
    .option("--log", "Enable logging")
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

      if(options.listen) {
        await Promise.all([
          ipfsGatewayApi.run(
            httpConfig, 
            httpsConfig
          ),
          cacheRunner.listenForEvents()
        ]);
      } else {
        await ipfsGatewayApi.run(
          httpConfig, 
          httpsConfig
        );
      }
    });

  program
    .command("unresponsive")
    .description("Process unresponsive IPFS URIs")
    .option("--log", "Enable logging")
    .action(async (options) => {
      if(!!options.log) {
        loggerConfig.shouldLog = true;
      }

      await cacheRunner.processUnresponsive();
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
