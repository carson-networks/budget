import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
  },
  test: {
    environment: "happy-dom",
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "src/**/*_test.{ts,tsx}",
    ],
  },
});
