export type DetailedPinnedWrapperModel = { 
  cid: string, 
  name: string,
  version: string,
  type: string,
  size: string,
  indexes: IndexWithEnsInfo[],
};

export type IndexWithEnsInfo = {
  name: string,
  ens: {
    domain?: string,
    node: string
  }[],
};
