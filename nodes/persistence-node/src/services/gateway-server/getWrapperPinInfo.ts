import * as IPFS from "ipfs-core";
import { TrackedIpfsHashInfo } from "../../types/TrackedIpfsHashInfo";
import { WrapperWithFileList } from "./models/WrapperWithFileList";
import { formatFileSize } from "../../utils/formatFileSize";
import { IpfsPackageReader } from "../../types";
import { deserializeWrapManifest } from "@polywrap/wrap-manifest-types-js";
import { WRAPPER_DEFAULT_NAME } from "../../constants/wrappers";
import { PinnedWrapperModel } from "../../types/PinnedWrapperModel";
import { WRAP_INFO } from "@polywrap/package-validation";

export const getWrapperPinInfo = async (info: TrackedIpfsHashInfo, ipfs: IPFS.IPFS, timeout: number, controller?: AbortController): Promise<PinnedWrapperModel | undefined> => {
  const object = await ipfs.object.get(IPFS.CID.parse(info.ipfsHash), {
    signal: controller?.signal,
    timeout: timeout
  });

  const wrapper = {
    cid: info.ipfsHash,
    files: object.Links
      .filter(x => x.Name)
      .map(x => {
        return {
          name: x.Name as string,
          cid: x.Hash.toString()
        };
      })
  } as WrapperWithFileList;

  const statResult = await ipfs.files.stat(`/ipfs/${info.ipfsHash}`, {
    signal: controller?.signal,
    timeout: timeout
  });

  const wrapperSize = formatFileSize(statResult.cumulativeSize);
  const manifestFile = wrapper.files.find(x => WRAP_INFO === x.name);

  if (!manifestFile) {
    return undefined;
  }

  const reader = new IpfsPackageReader(ipfs, wrapper.cid);
  const manifestContent = await reader.readFile(manifestFile?.name);
  const manifest = await deserializeWrapManifest(manifestContent);

  if(manifest.name) {
    return {
      name: manifest.name,
      version: manifest.version,
      type: manifest.type,
      size: wrapperSize,
      cid: wrapper.cid,
      indexes: info.indexes,
    };
  }

  return {
    name: WRAPPER_DEFAULT_NAME,
    version: manifest.version,
    type: manifest.type,
    size: wrapperSize,
    cid: wrapper.cid,
    indexes: info.indexes,
  };
};
