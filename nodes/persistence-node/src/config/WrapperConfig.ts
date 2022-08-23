import { WasmPackageConstraints } from "@polywrap/package-validation/v0_1";

export type WrapperConfig = {
  constraints: WasmPackageConstraints;
  resolution: {
    retries: {
        max: number,
        startingDelayInSec: number
    }
  }
};