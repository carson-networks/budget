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
