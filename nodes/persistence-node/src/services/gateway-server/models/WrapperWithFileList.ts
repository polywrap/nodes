export type WrapperWithFileList = { 
  cid: string,
  files: {
    cid: string,
    name: string,
  }[]
};