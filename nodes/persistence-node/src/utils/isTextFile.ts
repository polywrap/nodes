const textExtensions = [".graphql", ".yaml", ".txt", ".json", ".md"]

export const isTextFile = (fileName: string): boolean => {
  return textExtensions.some(ext => fileName.endsWith(ext));
};