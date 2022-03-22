import fs from 'fs';

export class Storage {
  constructor(
    public lastBlockNumber: number = 0,
    private ensIpfs: Record<string, string | undefined> = {},
    private ipfsEns: Record<string, string[] | undefined> = {},
    public unresponsiveEnsNodes: Map<string, boolean> = new Map(),
  ) { }

  getIpfsHash(ensNode: string) {
    return this.ensIpfs[ensNode];
  }

  getAllIpfsHashes() {
    return Object.keys(this.ipfsEns);
  }

  hashExists(ipfsHash: string) {
    return !!this.ipfsEns[ipfsHash];
  }

  set(ensNode: string, ipfsHash: string) {
    this.ensIpfs[ensNode] = ipfsHash;
    if (!this.ipfsEns[ipfsHash]) {
      this.ipfsEns[ipfsHash] = [ensNode];
    } else if (!this.ipfsEns[ipfsHash]!.some(ens => ens === ensNode)) {
      this.ipfsEns[ipfsHash]!.push(ensNode);
    }
  }

  remove(ipfsHash: string) {
    const ensNodes = this.ipfsEns[ipfsHash] || [];
    for (const node of ensNodes) {
      delete this.ensIpfs[node];
    }
    delete this.ipfsEns[ipfsHash];
  }

  async save(): Promise<void> {
    fs.writeFileSync('./storage.json', JSON.stringify(this, this.replacer, 2));
  }

  async load(): Promise<void> {
    if (!fs.existsSync('./storage.json')) {
      await this.save();
    }

    const obj = JSON.parse(fs.readFileSync('./storage.json', 'utf8'), this.reviver);
    Object.assign(this, obj);
  }

  async reset(): Promise<void> {
    if (fs.existsSync("./storage.json")) {
      fs.rmSync("./storage.json");
    }

    this.resetToDefaultValues();
  }

  reviver(key: any, value: any) {
    if (key === "unresponsiveEnsNodes") {
      return new Map(Object.entries(value));
    }
    return value;
  }

  replacer(key: any, value: any) {
    if (key === "unresponsiveEnsNodes") {
      return Object.fromEntries(value.entries());
    } else {
      return value;
    }
  }

  getStats(): string {
    return `Last block number was ${this.lastBlockNumber}\n` +
      `There are ${Object.keys(this.ensIpfs).length} pinned ENS domains\n` +
      `There are ${Object.keys(this.ipfsEns).length} pinned IPFS hashes\n` +
      `There are ${Object.keys(this.unresponsiveEnsNodes).length} unresponsive ENS domains/IPFS hashes\n`
  }

  private resetToDefaultValues() {
    this.lastBlockNumber = 0;
    this.ensIpfs = {};
    this.ipfsEns = {};
    this.unresponsiveEnsNodes = new Map();
  }
};
