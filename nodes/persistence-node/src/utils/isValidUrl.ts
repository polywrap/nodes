export const isValidUrl = (url: string | undefined): boolean => {

  if (url == undefined || url.length == 0) {
    return false;    
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch (ex) { 
    return false;
  }
};