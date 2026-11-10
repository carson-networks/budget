import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Caddy's templates directive swaps this for a per-request nonce (see Caddyfile).
  html:
    command === "build"
      ? { cspNonce: "{{placeholder `http.request.uuid`}}" }
      : undefined,
  server: {
    // Mirrors the Caddyfile so dev is same-origin too.
    proxy: {
      "^/[a-z]+\\.v1\\.[A-Za-z]+Service/": {
        target: process.env.API_UPSTREAM ?? "http://127.0.0.1:9447",
      },
    },
    watch: {
      usePolling: true,
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "src/**/*_test.{ts,tsx}",
    ],
  },
}));
