import { IPFSIndex, IndexWithEnsNodes } from "../../../types";
import { TrackedIpfsHashInfo } from "../../../types/TrackedIpfsHashInfo";
import { TrackedIpfsHashStatus } from "../../../types/TrackedIpfsHashStatus";
import { PersistenceStateManager } from "../../PersistenceStateManager";

export const calculateCIDsToTrackAndUntrack = (
  indexes: IPFSIndex[],
  trackedInfos: TrackedIpfsHashInfo[],
  persistenceStateManager: PersistenceStateManager
): {
  toTrack: {
    ipfsHash: string,
    indexes: IndexWithEnsNodes[]
  }[], 
  toUntrack: TrackedIpfsHashInfo[]
} => {
  //Creates a map of unresponsive indexes to later check in constant time (O(1)) if an index is unresponsive
  const unresponsiveIndexMap = buildUnresponsiveIndexMap(indexes);

  //Go through all CIDs of all indexes and add to "toTrackMap" 
  //if they're not already being tracked
  const {cidToTrackMap, cidIndexesMap} = calculateTrackAndIndexesMapsForCIDs(indexes, persistenceStateManager);

  const {cidsToUntrack, unresponsiveHashesToTrackMap} = calculateCIDsToUntrack(unresponsiveIndexMap, trackedInfos, cidIndexesMap, persistenceStateManager);

  persistenceStateManager.save();

  const cidsToTrack = calculateCIDsToTrack(cidToTrackMap, cidIndexesMap, unresponsiveHashesToTrackMap);

  return {
    toTrack: cidsToTrack,
    toUntrack: cidsToUntrack
  };
};

  //Creates a map of unresponsive indexes to check in constant time (O(1)) if an index is unresponsive
const buildUnresponsiveIndexMap = (indexes: IPFSIndex[]): Record<string, boolean> => {
  const unresponsiveIndexMap: Record<string, boolean> = {};

  for (const index of indexes) {
    if(index.error) {
      unresponsiveIndexMap[index.name] = true;
    }
  }

  return unresponsiveIndexMap;
};

//Go through all CIDs of all indexes and add to "toTrack" 
//if they're not already being tracked
const calculateTrackAndIndexesMapsForCIDs = (indexes: IPFSIndex[], persistenceStateManager: PersistenceStateManager) => {
  //Map of CID to set of index names that contain that CID
  const cidIndexesMap: Record<string, Set<IndexWithEnsNodes>> = {};
  //Map of CID to boolean indicating if the CID is to be tracked
  const cidToTrackMap: Record<string, boolean> = {};

  //Go through all CIDs of all indexes and add to "toTrack" 
  //if they're not already being tracked
  for(const index of indexes) {
    for(const cidInfo of index.cids) {
      if(!persistenceStateManager.containsIpfsHash(cidInfo.cid)) {
        cidToTrackMap[cidInfo.cid] = true;
      }

      //Add to shorten lookup later
      cidIndexesMap[cidInfo.cid] = !cidIndexesMap[cidInfo.cid]
        ? new Set([{
          name: index.name,
          ensNodes: cidInfo.ensNodes
        }])
        : new Set(cidIndexesMap[cidInfo.cid].add({
          name: index.name,
          ensNodes: cidInfo.ensNodes
        }));
    }
  }

  return {
    cidToTrackMap,
    cidIndexesMap,
  };
};

const calculateCIDsToUntrack = (
  unresponsiveIndexMap: Record<string, boolean>, 
  trackedInfos: TrackedIpfsHashInfo[],
  cidIndexesMap: Record<string, Set<IndexWithEnsNodes>>, 
  persistenceStateManager: PersistenceStateManager
) => {
  const cidsToUntrack: TrackedIpfsHashInfo[] = [];

  const unresponsiveHashesToTrackMap: Record<string, boolean> = {};
  //Go through all tracked CIDs and add to "toUntrack" if they're not in the indexes,
  //provided the indexes were able to be retrieved
  //If they are in an index and they're logged as unresponsive, check if their scheduledRetryDate is past
  //if true, add to "unresponsiveHashesToTrackMap" to add them to the "toTrack" list at the end
  //This puts the unresponsive hashes at the end of the processing queue
  // All pinned wrappers are ignored with this because we want to keep them pinned forever
  for(const info of trackedInfos) {
    if (info.status === TrackedIpfsHashStatus.Pinned ||
      info.status === TrackedIpfsHashStatus.Pinning ||
      info.status === TrackedIpfsHashStatus.Unpinning
    ) {
      //Add all indexes which contain this IPFS hash
      const updatedIndexes: Set<IndexWithEnsNodes> = new Set(cidIndexesMap[info.ipfsHash]);
      
      //Also add all unresponsive indexes which were present in the info before
      //If an index is unresponsive, it does not mean it does not have the IPFS hash
      //and for those cases we pretend it still does
      for(const index of info.indexes) {
        if(unresponsiveIndexMap[index.name]) {
          updatedIndexes.add(index);
        }
      }

      //This updates the indexes of the CIDs in the tracked info, in memory
      //Later we save it with persistenceStateManager.save()
      info.indexes = [...updatedIndexes];
      continue;
    }
    //If the IPFS hash is not in any index
    if(!cidIndexesMap[info.ipfsHash]) {
      //Untrack the IPFS hash unless the index for which it was previously logged for is not able to be retrieved
      // and if it's not considered lost
      if(!info.indexes.some(x => unresponsiveIndexMap[x.name])) {
        if(info.unresponsiveInfo) {
          if(new Date(info.unresponsiveInfo.scheduledRetryDate) > new Date()) {
            continue;
          }
        }

        cidsToUntrack.push(persistenceStateManager.getTrackedIpfsHashInfo(info.ipfsHash));
      }
    } else {
      if(info?.unresponsiveInfo) {
        if(new Date(info.unresponsiveInfo.scheduledRetryDate) <= new Date()) {
          unresponsiveHashesToTrackMap[info.ipfsHash] = true;
        }
      }

      //Add all indexes which contain this IPFS hash
      const updatedIndexes: Set<IndexWithEnsNodes> = new Set(cidIndexesMap[info.ipfsHash]);
      
      //Also add all unresponsive indexes which were present in the info before
      //If an index is unresponsive, it does not mean it does not have the IPFS hash
      //and for those cases we pretend it still does
      for(const index of info.indexes) {
        if(unresponsiveIndexMap[index.name]) {
          updatedIndexes.add(index);
        }
      }

      //This updates the indexes of the CIDs in the tracked info, in memory
      //Later we save it with persistenceStateManager.save()
      info.indexes = [...updatedIndexes];
    }
  }

  return {
    cidsToUntrack,
    unresponsiveHashesToTrackMap
  };
};

const calculateCIDsToTrack = (
  cidToTrackMap: Record<string, boolean>, 
  cidIndexesMap: Record<string, Set<IndexWithEnsNodes>>, 
  unresponsiveHashesToTrackMap: Record<string, boolean>
) => {
  const ipfsHashesToTrack = Object.keys(cidToTrackMap)
    .map(ipfsHash => ({
        ipfsHash,
        indexes: [...cidIndexesMap[ipfsHash]]
    }));

  const unresponsiveHashesToTrack = Object.keys(unresponsiveHashesToTrackMap)
    .filter(ipfsHash => !cidToTrackMap[ipfsHash])
    .map(ipfsHash => ({
      ipfsHash,
      indexes: [...cidIndexesMap[ipfsHash]]
    }));

  return [...ipfsHashesToTrack, ...unresponsiveHashesToTrack];
};
