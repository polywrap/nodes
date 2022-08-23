import { ValidationResult as ValidationResultV0_2, ValidationFailReason as ValidationFailReasonV0_2 } from "@polywrap/package-validation/v0_2";

export const buildFailReasonMessageV0_2 = (result: ValidationResultV0_2) => {
  switch (result.failReason) {
    case ValidationFailReasonV0_2.InvalidWrapManifest:
      return "Validator(v0.2): Invalid wrap manifest";
    case ValidationFailReasonV0_2.MultipleWrapManifests:
      return "Validator(v0.2): Multiple wrap manifests found";
    case ValidationFailReasonV0_2.WrapManifestNotFound:
      return "Validator(v0.2): Invalid wrap manifest";
    case ValidationFailReasonV0_2.InvalidBuildManifest:
      return "Validator(v0.2): Invalid build manifest";
    case ValidationFailReasonV0_2.InvalidMetaManifest:
      return "Validator(v0.2): Invalid meta manifest";
    case ValidationFailReasonV0_2.FileTooLarge:
      return "Validator(v0.2): A file is too large";    
    case ValidationFailReasonV0_2.PackageTooLarge:
      return "Validator(v0.2): Package too large";    
    case ValidationFailReasonV0_2.ModuleTooLarge:
      return "Validator(v0.2): WASM module too large";   
    case ValidationFailReasonV0_2.InvalidAbi:
      return "Validator(v0.2): Invalid WRAP ABI";
    case ValidationFailReasonV0_2.AbiNotFound:
      return "Validator(v0.2): WRAP ABI not found";
    case ValidationFailReasonV0_2.TooManyFiles:
      return "Validator(v0.2): Too many files in package";
  }
};
