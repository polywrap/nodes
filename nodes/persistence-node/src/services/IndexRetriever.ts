import { Logger } from "./Logger";
import { IndexerConfig } from "../config/IndexerConfig";
import axios, { AxiosError } from "axios";
import { URL } from 'url';

interface IDependencies {
  indexerConfig: IndexerConfig;
  logger: Logger;
}

export class IndexRetriever {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async getCIDs(): Promise<{
    name: string;
    cids: string[],
    error: boolean
  }[]> {
    const indexes: {
      name: string;
      cids: string[],
      error: boolean
    }[] = [];

    for(const index of this.deps.indexerConfig.indexes) {
      try {
        const response = await axios({
          method: 'GET',
          url: new URL('api/ipfs/ls', index.provider).href,
        });
        
        if(response.status === 200) {
          this.deps.logger.log(`Successfully retrieved CIDs from ${index.name} (${response.data.length})`);
          indexes.push({
            name: index.name,
            cids: response.data,
            error: false
          });
          continue;
        } else {
          this.deps.logger.log(`Failed to get CIDs from ${index.name}, status code: ${response.status}`);
        }
      }
      catch(err) {
        const error = (err as AxiosError).response?.data.error
          ? (err as AxiosError).response?.data.error
          : JSON.stringify(err);

        this.deps.logger.log(`Failed to get CIDs from ${index.name}, error: ${error}`);
      }

      indexes.push({
        name: index.name,
        cids: [],
        error: true
      });
    }

    return indexes;
  }
}