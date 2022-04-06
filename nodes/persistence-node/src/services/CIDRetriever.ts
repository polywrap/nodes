import { Logger } from "./Logger";
import { IndexerConfig } from "../config/IndexerConfig";
import axios from "axios";

interface IDependencies {
  indexerConfig: IndexerConfig;
  logger: Logger;
}

export class CIDRetriever {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async getCIDs(): Promise<string[]> {
    const cids: string[] = [];

    for(const indexerEndpoint of this.deps.indexerConfig.indexers) {
      try {
        const response = await axios({
          method: 'GET',
          url: indexerEndpoint,
        });
        
        if(response.status === 200) {
          this.deps.logger.log(`Successfully retrieved CIDs from ${indexerEndpoint}`);
          console.log(`response.data`, response.data);
          cids.push(...response.data);
        } else {
          this.deps.logger.log(`Failed to get CIDs from ${indexerEndpoint}, status code: ${response.status}`);
        }
      }
      catch(ex) {
        this.deps.logger.log(`Failed to get CIDs from ${indexerEndpoint}, error: ${JSON.stringify(ex)}`);
      }
    }

    return cids;
  }
}