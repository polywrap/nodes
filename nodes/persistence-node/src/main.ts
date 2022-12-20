#!/usr/bin/env node
import { program } from "commander";
import { initializeCliCommands } from "./modules/cli/cli.commands";
import { initializeDaemonCommands } from "./modules/daemon/daemon.commands";
import * as dotenv from "dotenv";

dotenv.config()

initializeDaemonCommands();
initializeCliCommands();

program.parse(process.argv);
