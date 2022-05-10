import { program } from "commander";
import { CliModule } from "./cli.module";

export function initializeCliCommands() {
  program
    .command("init")
    .option("--network <string>", "Network name (defaults to mainnet)")
    .option("--port <number>", "Port number for the HTTP RPC API")
    .option("--data <string>", "Path to the data directory")
    .option("--log", "Enable logging")
    .description("Initialize the node")
    .action(async (options) => {
      await CliModule.initialize(options.data, options.network);

      process.exit(0);
    });
  program
    .command("upload-fast-sync")
    .option("--port <number>", "Port number for the HTTP RPC API")
    .option("--data <string>", "Path to the data directory")
    .option("--log", "Enable logging")
    .description("Initialize the node")
    .action(async (options) => {
      const cli = await CliModule.build(!!options.log, options.data, options.port);
      await cli.uploadFastSyncFile();

      process.exit(0);
    });
}