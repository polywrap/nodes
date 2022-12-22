import axios from "axios";
import { splitArrayIntoChunks } from "./splitArrayIntoChunks";

const ENS_DOMAIN_TRACKING_URL = "https://reverse-namehash.wrappers.dev";
const ENS_DOMAIN_TRACKING_MAX_ADD_LIMIT = 25;

export const trackEnsDomains = async (domains: string[]): Promise<void> => {
  const uniqueDomains = [...new Set(domains)];
  console.log("TRACKING: ", uniqueDomains);

  const chunks = splitArrayIntoChunks(uniqueDomains, ENS_DOMAIN_TRACKING_MAX_ADD_LIMIT);

  await Promise.all(
    chunks.map(domainChunk => {
      axios
        .post(`${ENS_DOMAIN_TRACKING_URL}/add`, domainChunk, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .catch((err: any) => {
          console.error("TRACKING ERROR: " + domainChunk, err);
        })
    })
  );
};
