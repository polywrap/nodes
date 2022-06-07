export type PinnedWrapperModel = { 
  cid: string, 
  name: string,
  manifest: {
    cid: string,
    name: string,
  },
  schema: {
    cid: string,
    name: string,
  },
  size: string,
};