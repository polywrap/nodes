import { program } from "commander";
import { DaemonModule } from "./daemon.module";

export function initializeDaemonCommands() {

  program
    .command("daemon")
    .description("Run the daemon for the node")
    .option("--log", "Enable logging")
    .option("--from-block <number>", "Block number to start listening from")
    .option("--port <number>", "Port number for the HTTP RPC API")
    .option("--data <string>", "Path to the data directory")
    .action(async (options) => {
      const daemon = await DaemonModule.build(!!options.log, options.data);
      daemon.run(parseInt(options.fromBlock) ?? 0, parseInt(options.port) ?? 0);
    });
}