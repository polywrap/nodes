import fs from 'fs';

const isRetryingKey = "isRetrying";

export class Storage {
  lastBlockNumber: number;
  ensIpfs: Record<string, string | undefined>;
  ipfsEns: Record<string, string | undefined>;
  unresponsiveEnsNodes: Record<string, { [isRetryingKey]: boolean | undefined }>;
  constructor() {
    this.lastBlockNumber = 0;
    this.ensIpfs = {};
    this.ipfsEns = {};
    this.unresponsiveEnsNodes = {};
  }

  async load(): Promise<void> {
    if(!fs.existsSync('./storage.json')) {
      await this.save();
    }

    const obj = JSON.parse(fs.readFileSync('./storage.json', 'utf8'));
    Object.assign(this, obj);
  }
  async save(): Promise<void> {
    fs.writeFileSync('./storage.json', JSON.stringify(this, (key, value) => key === isRetryingKey ? undefined : value, 2));
  }
};
