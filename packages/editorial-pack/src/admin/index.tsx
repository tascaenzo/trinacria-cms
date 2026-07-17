import {
  EditorialWorkQueueWidget,
  type EditorialWorkQueueWidgetContext
} from "./editorial-work-queue-widget.js";
import {
  EditorialContentTypesPage,
  type EditorialContentTypesPageContext
} from "./editorial-content-types-page.js";
export const EDITORIAL_PACK_ADMIN_RENDERERS = {
  dashboardWidgets: {
    "editorial-pack:work-queue": (context: EditorialWorkQueueWidgetContext) => (
      <EditorialWorkQueueWidget {...context} />
    )
  },
  pages: {
    "editorial-pack:content-types": (context: EditorialContentTypesPageContext) => (
      <EditorialContentTypesPage {...context} />
    )
  }
};
export { EditorialWorkQueueWidget };
export { EditorialContentTypesPage };
