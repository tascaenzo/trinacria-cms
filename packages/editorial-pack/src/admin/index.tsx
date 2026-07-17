import {
  EditorialWorkQueueWidget,
  type EditorialWorkQueueWidgetContext
} from "./editorial-work-queue-widget.js";
import {
  EditorialContentTypesPage,
  type EditorialContentTypesPageContext
} from "./editorial-content-types-page.js";
import {
  EditorialEntriesPage,
  type EditorialEntriesPageContext
} from "./editorial-entries-page.js";
import {
  EditorialContentTypeDetailPage,
  type EditorialContentTypeDetailPageContext
} from "./editorial-content-type-detail-page.js";
export { loadEditorialContentNavigation } from "./editorial-content-navigation.js";
export const EDITORIAL_PACK_ADMIN_RENDERERS = {
  dashboardWidgets: {
    "editorial-pack:work-queue": (context: EditorialWorkQueueWidgetContext) => (
      <EditorialWorkQueueWidget {...context} />
    )
  },
  pages: {
    "editorial-pack:content-type-detail": (context: EditorialContentTypeDetailPageContext) => (
      <EditorialContentTypeDetailPage {...context} />
    ),
    "editorial-pack:entries": (context: EditorialEntriesPageContext) => (
      <EditorialEntriesPage {...context} />
    ),
    "editorial-pack:content-types": (context: EditorialContentTypesPageContext) => (
      <EditorialContentTypesPage {...context} />
    )
  }
};
export { EditorialWorkQueueWidget };
export { EditorialContentTypesPage };
export { EditorialEntriesPage };
export { EditorialContentTypeDetailPage };
