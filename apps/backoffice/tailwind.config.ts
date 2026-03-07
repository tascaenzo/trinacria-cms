import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/admin-ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        shell: "0 24px 80px rgba(54, 43, 30, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
