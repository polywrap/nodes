import { WrapperConstraints } from '@polywrap/core-validation';

export type WrapperConfig = {
  constraints: WrapperConstraints;
  resolution: {
    retries: {
        max: number,
        startingDelayInSec: number
    }
  }
};