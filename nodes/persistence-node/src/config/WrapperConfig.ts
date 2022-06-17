import { WrapperConstraints } from '@web3api/core-validation';

export type WrapperConfig = {
  constraints: WrapperConstraints;
  resolution: {
    retries: {
        max: number,
        startingDelayInSec: number
    }
  }
};