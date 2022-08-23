import { ValidationResult as ValidationResultV0_1, ValidationFailReason as ValidationFailReasonV0_1 } from "@polywrap/package-validation/v0_1";

export const buildFailReasonMessageV0_1 = (result: ValidationResultV0_1) => {
  switch (result.failReason) {
    case ValidationFailReasonV0_1.InvalidWrapManifest:
      return "Validator(v0.1): Invalid wrap manifest";
    case ValidationFailReasonV0_1.MultipleWrapManifests:
      return "Validator(v0.1): Multiple wrap manifests found";
    case ValidationFailReasonV0_1.WrapManifestNotFound:
      return "Validator(v0.1): Invalid wrap manifest";
    case ValidationFailReasonV0_1.InvalidBuildManifest:
      return "Validator(v0.1): Invalid build manifest";
    case ValidationFailReasonV0_1.InvalidMetaManifest:
      return "Validator(v0.1): Invalid meta manifest";
    case ValidationFailReasonV0_1.FileTooLarge:
      return "Validator(v0.1): A file is too large";    
    case ValidationFailReasonV0_1.PackageTooLarge:
      return "Validator(v0.1): Package too large";    
    case ValidationFailReasonV0_1.ModuleTooLarge:
      return "Validator(v0.1): WASM module too large";   
    case ValidationFailReasonV0_1.InvalidAbi:
      return "Validator(v0.1): Invalid WRAP ABI";
    case ValidationFailReasonV0_1.AbiNotFound:
      return "Validator(v0.1): WRAP ABI not found";
    case ValidationFailReasonV0_1.TooManyFiles:
      return "Validator(v0.1): Too many files in package";
  }
};
