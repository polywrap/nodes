#!/usr/bin/env node
import { program } from "commander";
import { initializeCliCommands } from "./modules/cli/cli.commands";
import { initializeDaemonCommands } from "./modules/daemon/daemon.commands";

initializeDaemonCommands();
initializeCliCommands();

program.parse(process.argv);
