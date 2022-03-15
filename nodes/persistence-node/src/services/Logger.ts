import { LoggerConfig } from "../config/LoggerConfig";

type Listener = (log: string) => void;

interface IDependencies {
  loggerConfig: LoggerConfig;
}

const emptyListener: Listener = (log: string) => null;

export class Logger {
  deps: IDependencies;

  private listener = emptyListener;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  registerListener(listener: Listener) {
    this.listener = listener;
  }

  unregisterListener() {
    this.listener = emptyListener;
  }

  async log(
    message: string
  ) {
    if(this.deps.loggerConfig.shouldLog) {
      const timestamp = new Date().toLocaleString();
      const log = `${timestamp}: ${message}`
      this.listener(log);
      console.log(log);
    }
  }
}
