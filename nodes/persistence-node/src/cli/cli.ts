#!/usr/bin/env node
import axios from "axios";
import { program } from "commander";
import { PassThrough, Stream } from "stream";
import { buildCliDependencyContainer } from "../di/buildCliDependencyContainer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("custom-env").env();

(async () => {
  const dependencyContainer = await buildCliDependencyContainer();
  const {
    loggerConfig,
    internalApiConfig,
  } = dependencyContainer.cradle;

  program
    .command("past")
    .description("Run for a past block count")
    .requiredOption("-b, --blocks <number>", "Past block count")
    .option("--log", "Enable logging")
    .action(async (options) => {
      if (!!options.log) {
        loggerConfig.shouldLog = true;
      }

      const res = await axios({
        method: 'get',
        url: `http://localhost:${internalApiConfig.port}/api/v0/past?blocks=${options.blocks}`,
        responseType: "stream",
      });

      await streamResponseUntilEnd(res.data)

      process.exit(0);
    });

  program.parse(process.argv);
})();

function streamResponseUntilEnd(stream: Stream): Promise<void> {
  return new Promise((resolve, reject) => {
    stream
      .on('data', (chunk: string) => console.log(chunk.toString()))
      .on('end', () => resolve())
      .on('error', () => reject())
  })
}