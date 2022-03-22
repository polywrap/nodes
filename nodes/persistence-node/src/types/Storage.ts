import fs from 'fs';

export class Storage {
  constructor(
    public lastBlockNumber: number = 0,
    public ensIpfs: Record<string, string | undefined> = {},
    public ipfsEns: Record<string, string | undefined> = {},
    public unresponsiveEnsNodes: Map<string, boolean> = new Map(),
  ) { }

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

  async save(): Promise<void> {
    fs.writeFileSync('./storage.json', JSON.stringify(this, this.replacer, 2));
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
