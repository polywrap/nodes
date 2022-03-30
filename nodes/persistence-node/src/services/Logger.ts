import { PersistenceNodeConfig } from "../config/PersistenceNodeConfig";

interface IDependencies {
  persistenceNodeConfig: PersistenceNodeConfig;
}

export class Logger {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async log(
    message: string
  ) {
    if(this.deps.persistenceNodeConfig.loggerEnabled) {
      const timestamp = new Date().toLocaleString();
      console.log(`${timestamp}: ${message}`);
    }
  }
}
