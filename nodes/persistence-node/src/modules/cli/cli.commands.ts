import { program } from "commander";
import { CLI } from "./cli.model";

export function initializeCliCommands() {
    const cli = program
      .command('cli')
      .action(() => console.log("CLI SELECTED"));
  
    cli
      .command("past")
      .description("Run for a past block count")
      .requiredOption("-b, --blocks <number>", "Past block count")
      .option("--log", "Enable logging")
      .action(async (options) => {
        const cli = await CLI.build(!!options.log)
        await cli.runForPastBlocks(
          Number(options.blocks)
        );
  
        process.exit(0);
      });
  
    cli
      .command("missed")
      .description("Run for missed blocks while the app was offline")
      .option("--log", "Enable logging")
      .action(async (options) => {
        const cli = await CLI.build(!!options.log)
        await cli.runForMissedBlocks();
  
        process.exit(0);
      });
  
    cli
      .command("unresponsive")
      .description("Process unresponsive IPFS URIs")
      .option("--log", "Enable logging")
      .action(async (options) => {
  
        const cli = await CLI.build(!!options.log);
        await cli.processUnresponsive();
  
        process.exit(0);
      });
  
    cli
      .command("info")
      .description("Display useful information about the current state (pinned hash count, unresponsive count, etc)")
      .action(async (options) => {
  
        const cli = await CLI.build(!!options.log)
        cli.getInfo()
  
        process.exit(0);
      });
  
    cli
      .command("reset")
      .description("Delete the storage file")
      .action(async (options) => {
  
        const cli = await CLI.build(!!options.log)
        cli.resetStorage()
  
        process.exit(0);
      });
  }