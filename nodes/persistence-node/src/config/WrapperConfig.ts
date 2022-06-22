import { WasmPackageConstraints } from "@polywrap/package-validation";

export type WrapperConfig = {
  constraints: WasmPackageConstraints;
  resolution: {
    retries: {
        max: number,
        startingDelayInSec: number
    }
  }
};