import express, { NextFunction, Request, Response } from "express";
import { runServer } from "../api-server/runServer";
import { MainDependencyContainer } from "../modules/daemon/daemon.deps";

export class ApiServer {
  constructor(
    private deps: MainDependencyContainer
  ) { }

  async run(port?: number) {
    const app = express();

    const apiPort = port ?? this.deps.apiPort;

    runServer(
      app,
      apiPort, 
      this.deps.logger,
      () => console.log(`Gateway started at http://localhost:${apiPort}`)
    );
  }
}