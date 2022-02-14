import { Base58 } from "@ethersproject/basex";

export const getIpfsHashFromContenthash = (contenthash: string): string | undefined => {
  const ipfs = contenthash.match(/^0xe3010170(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/);
  if (ipfs) {
    const length = parseInt(ipfs[3], 16);
    if (ipfs[4].length === length * 2) {
      const hash = Base58.encode("0x" + ipfs[1]);
    
      return hash;
    }
  } 

  return undefined;
};
