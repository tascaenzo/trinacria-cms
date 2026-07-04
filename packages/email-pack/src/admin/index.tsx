import {
  EmailDeliveryWidget,
  type EmailDeliveryWidgetContext
} from "./email-delivery-widget.js";
import {
  EmailTemplateManager,
  type EmailTemplateManagerContext
} from "./components/email-template-manager.js";

export const EMAIL_PACK_ADMIN_RENDERERS = {
  dashboardWidgets: {
    "email-pack:delivery-status-widget": (context: EmailDeliveryWidgetContext) => (
      <EmailDeliveryWidget {...context} />
    )
  },
  settingsSections: {
    "email-pack:email-template-manager": (context: EmailTemplateManagerContext) => (
      <EmailTemplateManager {...context} />
    )
  }
};

export { EmailDeliveryWidget, EmailTemplateManager };
