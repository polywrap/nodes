#!/usr/bin/env node
import { program } from "commander";
import { initializeCliCommands } from "./modules/cli/cli.commands";
import { initializeDaemonCommands } from "./modules/daemon/daemon.commands";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("custom-env").env();

initializeDaemonCommands();
initializeCliCommands();

program.parse(process.argv);
