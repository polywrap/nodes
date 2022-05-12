import { program } from "commander";
import { CliModule } from "./cli.module";

export function initializeCliCommands() {
  program
    .command("init")
    .option("--data <string>", "Path to the data directory")
    .option("--log", "Enable logging")
    .description("Initialize the node")
    .action(async (options) => {
      const cli = await CliModule.build(!!options.log);
      await cli.initialize(options.data);

      process.exit(0);
    });
}