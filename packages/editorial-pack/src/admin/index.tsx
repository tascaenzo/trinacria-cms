import {
  EditorialContentTypeDetailPage,
  type EditorialContentTypeDetailPageContext
} from "./editorial-content-type-detail-page.js";
import {
  EditorialContentTypesPage,
  type EditorialContentTypesPageContext
} from "./editorial-content-types-page.js";
import {
  EditorialCreateContentTypePage,
  type EditorialCreateContentTypePageContext
} from "./editorial-create-content-type-page.js";
import {
  EditorialEntriesPage,
  type EditorialEntriesPageContext
} from "./editorial-entries-page.js";
import {
  EditorialEntryDetailPage,
  type EditorialEntryDetailPageContext
} from "./editorial-entry-detail-page.js";
import {
  EditorialOverviewPage,
  type EditorialOverviewPageContext
} from "./editorial-overview-page.js";
import {
  EditorialWorkQueueWidget,
  type EditorialWorkQueueWidgetContext
} from "./editorial-work-queue-widget.js";

export { loadEditorialContentNavigation } from "./editorial-content-navigation.js";
export const EDITORIAL_PACK_ADMIN_RENDERERS = {
  dashboardWidgets: {
    "editorial-pack:work-queue": (context: EditorialWorkQueueWidgetContext) => (
      <EditorialWorkQueueWidget {...context} />
    )
  },
  pages: {
    "editorial-pack:overview": (context: EditorialOverviewPageContext) => (
      <EditorialOverviewPage {...context} />
    ),
    "editorial-pack:entry-detail": (context: EditorialEntryDetailPageContext) => (
      <EditorialEntryDetailPage {...context} />
    ),
    "editorial-pack:content-type-detail": (context: EditorialContentTypeDetailPageContext) => (
      <EditorialContentTypeDetailPage {...context} />
    ),
    "editorial-pack:content-types": (context: EditorialContentTypesPageContext) => (
      <EditorialContentTypesPage {...context} />
    ),
    "editorial-pack:content-type-create": (context: EditorialCreateContentTypePageContext) => (
      <EditorialCreateContentTypePage {...context} />
    ),
    "editorial-pack:entries": (context: EditorialEntriesPageContext) => (
      <EditorialEntriesPage {...context} />
    )
  }
};
export {
  EditorialContentTypeDetailPage,
  EditorialContentTypesPage,
  EditorialCreateContentTypePage,
  EditorialEntriesPage,
  EditorialEntryDetailPage,
  EditorialOverviewPage,
  EditorialWorkQueueWidget
};
