import express from "express";
import { runServer } from "../http-server/runServer";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";

export class ApiServer {
  constructor(
    private deps: MainDependencyContainer
  ) { }

  async run(port?: number) {
    const app = express();

    runServer(
      app,
      this.deps.apiPort, 
      this.deps.logger,
      () => console.log(`Gateway listening on http://localhost:${this.deps.apiPort}`)
    );
  }
}