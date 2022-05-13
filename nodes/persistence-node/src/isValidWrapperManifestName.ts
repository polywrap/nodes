export const isValidWrapperManifestName = (fileName: string): boolean => {
  return fileName === 'web3api.yaml' || fileName === 'web3api.yml' || fileName === 'web3api.json';
};