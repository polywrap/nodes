import { ValidationResult as ValidationResultV0_1 } from "@polywrap/package-validation/v0_1";
import { ValidationResult as ValidationResultV0_2 } from "@polywrap/package-validation/v0_2";
import { ValidationResult as ValidationResultV0_3 } from "@polywrap/package-validation/v0_3";
import { buildFailReasonMessageV0_1 } from "./build-fail-reason/buildFailReasonMessageV0_1";
import { buildFailReasonMessageV0_2 } from "./build-fail-reason/buildFailReasonMessageV0_2";
import { buildFailReasonMessageV0_3 } from "./build-fail-reason/buildFailReasonMessageV0_3";

export const buildFailReasonMessageForAll = (
  results: [
    ValidationResultV0_3, 
    ValidationResultV0_2, 
    ValidationResultV0_1
  ]
): string => {
  return `\n${buildFailReasonMessageV0_3(results[0])}\n${buildFailReasonMessageV0_2(results[1])}\n${buildFailReasonMessageV0_1(results[2])}`;
};