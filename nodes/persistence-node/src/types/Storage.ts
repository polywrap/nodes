import fs from 'fs';

export class Storage {
  lastBlockNumber: number;
  ensIpfs: Record<string, string | undefined>;
  ipfsEns: Record<string, string | undefined>;
  unresponsiveEnsNodes: Map<string, boolean>;
  constructor() {
    this.lastBlockNumber = 0;
    this.ensIpfs = {};
    this.ipfsEns = {};
    this.unresponsiveEnsNodes = new Map();
  }

  async load(): Promise<void> {
    if(!fs.existsSync('./storage.json')) {
      await this.save();
    }

    const obj = JSON.parse(fs.readFileSync('./storage.json', 'utf8'), this.reviver);
    Object.assign(this, obj);
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
};
