import { program } from "commander";
import { DaemonModule } from "./daemon.module";

export function initializeDaemonCommands() {

  program
    .command("daemon")
    .description("Run persistence node daemon")
    .option("--http <number>", "Http port")
    .option("--https <number>", "Https port")
    .option("--ssl <string>", "Directory with SSL certificates")
    .option("--data <string>", "Path to the data directory")
    .option("--log", "Enable logging")
    .option("--from-block <number>", "Block number to start listening from")
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

      const daemon = await DaemonModule.build(!!options.log, options.data);
      daemon.run(httpConfig, httpsConfig);

    });
}