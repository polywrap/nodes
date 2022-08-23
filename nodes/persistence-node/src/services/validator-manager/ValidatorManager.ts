import { WasmPackageValidator as WasmPackageValidatorV0_1 } from "@polywrap/package-validation/v0_1";
import { WasmPackageValidator as WasmPackageValidatorV0_2 } from "@polywrap/package-validation/v0_2";
import { WasmPackageValidator as WasmPackageValidatorV0_3 } from "@polywrap/package-validation/v0_3";
import { PersistenceConfig } from "../../config/PersistenceConfig";
import { InMemoryFile, InMemoryPackageReader } from "../../types";
import { buildFailReasonMessageForAll } from "./utils/buildFailReasonForAll";
import { AllValidatorResult } from "./utils/types/AllValidatorResult";

interface IDependencies {
  persistenceConfig: PersistenceConfig;
}

export class ValidatorManager {
  deps: IDependencies;

  constructor(deps: IDependencies) {
    this.deps = deps;
  }

  async validateWithAllValidators(
    files: InMemoryFile[]
  ): Promise<AllValidatorResult> {
    const reader = new InMemoryPackageReader(files);

    const wrapperConfig = this.deps.persistenceConfig.wrapper;

    const results = await Promise.all([
      await new WasmPackageValidatorV0_3(wrapperConfig.constraints).validate(reader),
      await new WasmPackageValidatorV0_2(wrapperConfig.constraints).validate(reader),
      await new WasmPackageValidatorV0_1(wrapperConfig.constraints).validate(reader),
    ]);

    console.log("results", results);
    return {
      valid: results.some(x => x.valid),
      failReason: buildFailReasonMessageForAll(results),
      results: results,
    }
  }
}
