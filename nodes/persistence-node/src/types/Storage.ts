import fs from 'fs';

export class NetworkState {
  constructor(
    public networkId: string,
    public lastBlockNumber: number = 0,
    public ensIpfs: Record<string, string | undefined> = {},
    public ipfsEns: Record<string, string | undefined> = {},
    public unresponsiveEnsNodes: Record<string, boolean> = {},
  ) { }
}

export class Storage {

  constructor(
    private networks: NetworkState[] = []
  ) { }

  async load(): Promise<void> {
    if (!fs.existsSync('./storage.json')) {
      await this.save();
    }

    const obj = JSON.parse(fs.readFileSync('./storage.json', 'utf8'));
    Object.assign(this, obj);
  }

  async reset(): Promise<void> {
    if (fs.existsSync("./storage.json")) {
      fs.rmSync("./storage.json");
    }

    this.resetToDefaultValues();
  }

  get(networkId: string): NetworkState {
    const network = this.networks.find(n => n.networkId === networkId);

    if (network != null) {
      return network;
    }

    const newNetwork = new NetworkState(networkId);
    this.networks.push(newNetwork);

    return newNetwork;
  }

  getAll() {
    return this.networks;
  }

  async save(): Promise<void> {
    fs.writeFileSync('./storage.json', JSON.stringify(this, null, 2));
  }

  // TODO: mbrizic implement this again
  getStats(): string {
    return "";
    // return `Last block number was ${this.lastBlockNumber}\n` +
    //   `There are ${Object.keys(this.ensIpfs).length} pinned ENS domains\n` +
    //   `There are ${Object.keys(this.ipfsEns).length} pinned IPFS hashes\n` +
    //   `There are ${Object.keys(this.unresponsiveEnsNodes).length} unresponsive ENS domains/IPFS hashes\n`
  }

  private resetToDefaultValues() {
    this.networks = [];
  }
};
