import { CORE_TOKENS, classProvider, createToken, defineModule } from "@trinacria-cms/kernel";
import { IamSafetyService } from "./services/iam-safety.service.js";

export const IAM_SAFETY = createToken<IamSafetyService>("CORE_PACK_IAM_SAFETY");
export const CorePackIamSafetyModule = defineModule({
  name: "CorePackIamSafetyModule",
  providers: [classProvider(IAM_SAFETY, IamSafetyService, [CORE_TOKENS.DB_ADAPTER])],
  exports: [IAM_SAFETY]
});
