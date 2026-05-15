import type { Preview } from "@storybook/react-vite";
import "../theme.css";
import "./storybook.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      name: "Theme",
      defaultValue: "light",
      toolbar: {
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" }
        ]
      }
    },
    accent: {
      name: "Accent",
      defaultValue: "default",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "default", title: "Default" },
          { value: "ocean", title: "Ocean" },
          { value: "forest", title: "Forest" },
          { value: "trinacria", title: "Trinacria" }
        ]
      }
    }
  },
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    layout: "padded",
    backgrounds: {
      default: "canvas",
      values: [
        { name: "canvas", value: "#ffffff" },
        { name: "panel", value: "#ffffff" },
        { name: "slate", value: "#0f172a" }
      ]
    }
  },
  decorators: [
    (Story, context) => (
      <div
        data-trinacria-admin-theme
        data-theme={context.globals.theme}
        data-accent={context.globals.accent}
        className="min-h-screen bg-[color:var(--color-canvas)] p-6"
      >
        <Story />
      </div>
    )
  ]
};

export default preview;
