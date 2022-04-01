export class EnsIndexerConfig {
  maxBlockRangePerRequest: number = process.env.MAX_BLOCK_RANGE_PER_REQUEST ? parseInt(process.env.MAX_BLOCK_RANGE_PER_REQUEST) : 4999;
  requestInterval: number = process.env.REQUEST_INTERVAL ? parseInt(process.env.REQUEST_INTERVAL) : 15000;
}
