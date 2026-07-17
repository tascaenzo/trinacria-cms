import {
  EditorialWorkQueueWidget,
  type EditorialWorkQueueWidgetContext
} from "./editorial-work-queue-widget.js";
export const EDITORIAL_PACK_ADMIN_RENDERERS = {
  dashboardWidgets: {
    "editorial-pack:work-queue": (context: EditorialWorkQueueWidgetContext) => (
      <EditorialWorkQueueWidget {...context} />
    )
  }
};
export { EditorialWorkQueueWidget };
