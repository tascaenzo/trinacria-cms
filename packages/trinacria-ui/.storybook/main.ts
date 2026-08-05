import { fileURLToPath, URL } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {}
  },
  docs: {
    autodocs: "tag"
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [
        {
          name: "trinacria-storybook-file-url-resolver",
          enforce: "pre",
          resolveId(source) {
            if (!source.startsWith("file://")) {
              return null;
            }

            return fileURLToPath(source);
          }
        }
      ],
      resolve: {
        alias: [
          {
            find: /^file:\/\/\.\/node_modules\/(.*)$/,
            replacement: `${fileURLToPath(new URL("../node_modules/", import.meta.url))}$1`
          }
        ]
      }
    });
  }
};

export default config;
