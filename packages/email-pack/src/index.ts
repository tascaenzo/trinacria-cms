export type {
  EmailTemplateRecord,
  EmailTemplateStatus
} from "./modules/email-templates/email-templates.schemas.js";
export type {
  EmailDeliveryOperations,
  EmailTemplateOperations
} from "./operations/email-operations.js";
export {
  EMAIL_DELIVERY_OPERATIONS,
  EMAIL_TEMPLATE_OPERATIONS
} from "./operations/email-operations.js";
export * from "./plugin/index.js";
