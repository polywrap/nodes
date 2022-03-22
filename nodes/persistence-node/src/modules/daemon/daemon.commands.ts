import { program } from "commander";
import { DaemonModule } from "./daemon.module";

export function initializeDaemonCommands() {

  program
    .command("daemon")
    .description("Run persistence node daemon")
    .option("--http <number>", "Http port")
    .option("--https <number>", "Https port")
    .option("--ssl <string>", "Directory with SSL certificates")
    .option("--log", "Enable logging")
    .action(async (options) => {

      if (!options.http && !options.https) {
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

      const daemon = await DaemonModule.build(!!options.log);
      daemon.run(httpConfig, httpsConfig);

    });

  program
    .command("past")
    .description("Run for a past block count")
    .requiredOption("-b, --blocks <number>", "Past block count")
    .option("--log", "Enable logging")
    .action(async (options) => {
      const daemon = await DaemonModule.build(!!options.log)
      await daemon.runForPastBlocks(
        Number(options.blocks)
      );

      process.exit(0);
    });

  program
    .command("missed")
    .description("Run for missed blocks while the app was offline")
    .option("--log", "Enable logging")
    .action(async (options) => {
      const daemon = await DaemonModule.build(!!options.log)
      await daemon.runForMissedBlocks();

      process.exit(0);
    });

  program
    .command("unresponsive")
    .description("Process unresponsive IPFS URIs")
    .option("--log", "Enable logging")
    .action(async (options) => {

      const daemon = await DaemonModule.build(!!options.log);
      await daemon.processUnresponsive();

      process.exit(0);
    });
}