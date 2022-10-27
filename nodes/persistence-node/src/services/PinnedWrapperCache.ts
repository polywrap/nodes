import { PinnedWrapperModel } from "../types/PinnedWrapperModel";

export class PinnedWrapperCache {
  cachedPinnedWrappers: Map<string, PinnedWrapperModel>;

  constructor() {
    this.cachedPinnedWrappers = new Map();
  }

  cache(wrapper: PinnedWrapperModel) {
    this.cachedPinnedWrappers.set(wrapper.cid, wrapper);
  }

  get(cid: string): PinnedWrapperModel | undefined {
    return this.cachedPinnedWrappers.get(cid);
  }
}
