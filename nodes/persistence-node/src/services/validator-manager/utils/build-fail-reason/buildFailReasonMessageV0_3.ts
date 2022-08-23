import { ValidationResult as ValidationResultV0_3, ValidationFailReason as ValidationFailReasonV0_3, WasmPackageValidator as WasmPackageValidatorV0_3 } from "@polywrap/package-validation/v0_3";

export const buildFailReasonMessageV0_3 = (result: ValidationResultV0_3) => {
  switch (result.failReason) {
    case ValidationFailReasonV0_3.InvalidWrapManifest:
      return "Validator(v0.3): Invalid wrap manifest";
    case ValidationFailReasonV0_3.MultipleWrapManifests:
      return "Validator(v0.3): Multiple wrap manifests found";
    case ValidationFailReasonV0_3.WrapManifestNotFound:
      return "Validator(v0.3): Invalid wrap manifest";
    case ValidationFailReasonV0_3.InvalidBuildManifest:
      return "Validator(v0.3): Invalid build manifest";
    case ValidationFailReasonV0_3.InvalidMetaManifest:
      return "Validator(v0.3): Invalid meta manifest";
    case ValidationFailReasonV0_3.FileTooLarge:
      return "Validator(v0.3): A file is too large";    
    case ValidationFailReasonV0_3.PackageTooLarge:
      return "Validator(v0.3): Package too large";    
    case ValidationFailReasonV0_3.ModuleTooLarge:
      return "Validator(v0.3): WASM module too large";   
    case ValidationFailReasonV0_3.InvalidAbi:
      return "Validator(v0.3): Invalid WRAP ABI";
    case ValidationFailReasonV0_3.AbiNotFound:
      return "Validator(v0.3): WRAP ABI not found";
    case ValidationFailReasonV0_3.TooManyFiles:
      return "Validator(v0.3): Too many files in package";
  }
};
