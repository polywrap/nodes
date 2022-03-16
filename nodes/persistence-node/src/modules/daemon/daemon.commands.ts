import { program } from "commander";
import { Daemon } from "./daemon.model";

export function initializeDaemonCommands() {
    const daemon = program
      .command('daemon')
      .action(() => console.log("DAEMON SELECTED"));
  
    daemon
      .command("listen")
      .description("Listen for events and pin wrappers")
      .option("--log", "Enable logging")
      .action(async (options) => {
  
        const daemon = await Daemon.build(!!options.log)
        await daemon.listenForEvents();
      });
  
    daemon
      .command("api")
      .description("Run the API")
      .option("-l, --listen", "Listen to events")
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
  
        const daemon = await Daemon.build(!!options.log);
  
        if (options.listen) {
          await Promise.all([
            daemon.runApi(httpConfig, httpsConfig),
            daemon.listenForEvents()
          ]);
        } else {
          await daemon.runApi(httpConfig, httpsConfig)
        }
      });
  }