import {
  EmailTemplateManager,
  type EmailTemplateManagerContext
} from "./components/email-template-manager.js";

export const EMAIL_PACK_ADMIN_RENDERERS = {
  settingsSections: {
    "email-pack:email-template-manager": (context: EmailTemplateManagerContext) => (
      <EmailTemplateManager {...context} />
    )
  }
};

export { EmailTemplateManager };
