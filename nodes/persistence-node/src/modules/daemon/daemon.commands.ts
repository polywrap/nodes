import { program } from "commander";
import { DaemonModule } from "./daemon.module";

export function initializeDaemonCommands() {

  program
    .command("daemon")
    .description("Run persistence node daemon")
    .option("--api-port <number>", "API port")
    .option("--gateway-port <number>", "Gateway port")
    .option("--data <string>", "Path to the data directory")
    .option("--log", "Enable logging")
    .action(async (options) => {
      const daemon = await DaemonModule.build(!!options.log, options.data);
      daemon.run(options.apiPort, options.gatewayPort);
    });
}