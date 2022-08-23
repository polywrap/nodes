import { ValidationResult as ValidationResultV0_1 } from "@polywrap/package-validation/v0_1";
import { ValidationResult as ValidationResultV0_2 } from "@polywrap/package-validation/v0_2";
import { ValidationResult as ValidationResultV0_3 } from "@polywrap/package-validation/v0_3";

export type AllValidatorResult = {
  valid: boolean;
  failReason: string;
  results?: [ValidationResultV0_3, ValidationResultV0_2, ValidationResultV0_1];
};