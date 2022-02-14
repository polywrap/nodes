import { ethers } from "ethers";
import { Base58 } from "@ethersproject/basex";

export const getPastContenthashChanges = async (ethersProvider: ethers.providers.Provider, resolverContract: ethers.Contract, blockNumber: number): Promise<{
  fromBlock: number,
  toBlock: number,
  results: {
  ensNode: string,
  ipfsHash: string | undefined,
}[]
}> => {
  const latestBlock = await ethersProvider.getBlockNumber();

  const fromBlock = blockNumber;
  const toBlock = latestBlock;

  const events = await resolverContract.queryFilter(resolverContract.filters.ContenthashChanged(), fromBlock, toBlock);

  const results = [];

  for (const event of events) { 
    const ensNode = event.args!.node;
    const contentHash = event.args!.hash;
    // IPFS (CID: 1, Type: DAG-PB)
    const ipfs = contentHash.match(/^0xe3010170(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/);
    if (ipfs) {
        const length = parseInt(ipfs[3], 16);
        if (ipfs[4].length === length * 2) {
          const x = "ipfs:/\/" + Base58.encode("0x" + ipfs[1]);
        
          results.push({
            ensNode: ensNode,
            ipfsHash: x
          });

          continue;
        }
    }

    results.push({
      ensNode: ensNode,
      ipfsHash: undefined
    });
  }

  return {
    fromBlock,
    toBlock,
    results
  };
};