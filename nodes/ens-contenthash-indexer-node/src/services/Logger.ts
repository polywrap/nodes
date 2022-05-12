import { LoggerConfig } from "../config/LoggerConfig";

interface IDependencies {
  loggerConfig: LoggerConfig;
}

export class Logger {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async log(
    message: string
  ) {
    if(this.deps.loggerConfig.loggerEnabled) {
      const timestamp = new Date().toLocaleString();
      console.log(`${timestamp}: ${message}`);
    }
  }
}
