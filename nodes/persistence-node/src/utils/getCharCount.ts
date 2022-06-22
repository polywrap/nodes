export const getCharCount = (str: string, charToCount: string): number => {
  let cnt = 0;
  for(const char of str) {
    if(char === charToCount) {
      cnt++;
    }
  }
  return cnt;
};