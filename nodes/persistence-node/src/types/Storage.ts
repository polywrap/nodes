import fs from 'fs';

export class Storage {

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

  async save(): Promise<void> {
    fs.writeFileSync('./storage.json', JSON.stringify(this, null, 2));
  }

  private resetToDefaultValues() {
  }
};
