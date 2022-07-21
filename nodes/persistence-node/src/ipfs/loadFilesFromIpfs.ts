
import all from "it-all";
import toBuffer from "it-to-buffer";
import map from "it-map";
import { pipe } from "it-pipe";
import { extract } from "it-tar";
import { InMemoryFile } from "../types/InMemoryFile";
import { IPFS } from "ipfs-core";

async function * tarballed (source: any) {
  yield * pipe(
    source,
    extract(),
    async function * (source: any) {
      for await (const entry of source) {
        yield {
          ...entry,
          body: await toBuffer(map(entry.body, (buf: any) => buf.slice()))
        }
      }
    }
  )
}

export const loadFilesFromIpfs = async (cid: string, ipfsNode: IPFS, timeout: number): Promise<InMemoryFile[] | undefined> => {
  try {
    const output = await pipe(
      ipfsNode.get(cid, { 
        timeout,
      }),
      tarballed,
      (source) => all(source)
    );
    const files = output
      .filter(x => x.header.name !== cid)
      .map(x => {
      return {
        path: x.header.name.slice(cid.length + 1, x.header.name.length),
        content: x.body
      };
    });

    return files && files.length
      ? files
      : undefined;
  } catch {
    return undefined;
  }
};

export const loadFilesFromIpfsOrThrow = async (cid: string, ipfsNode: IPFS, timeout: number): Promise<InMemoryFile[] | undefined> => {
  const output = await pipe(
    ipfsNode.get(cid, { 
      timeout,
    }),
    tarballed,
    (source) => all(source)
  );

  const files = output
    .filter(x => x.header.name !== cid)
    .map(x => {
    return {
      path: x.header.name.slice(cid.length + 1, x.header.name.length),
      content: x.body
    };
  });

  if(files && files.length) {
    return files;
  } else {
    throw new Error("No files found");
  }
};