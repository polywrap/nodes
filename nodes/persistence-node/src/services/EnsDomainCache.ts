export class EnsDomainCache {
  cachedDomains: Map<string, string>;

  constructor() {
    this.cachedDomains = new Map();
  }

  cache(node: string, domain: string) {
    this.cachedDomains.set(node, domain);
  }

  get(node: string): string | undefined {
    return this.cachedDomains.get(node);
  }
}
