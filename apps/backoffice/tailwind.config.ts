import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/admin-kernel/src/**/*.{ts,tsx}",
    "../../packages/media-pack/src/admin/**/*.{ts,tsx}",
    "../../packages/trinacria-ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        shell: "0 24px 80px rgba(54, 43, 30, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
