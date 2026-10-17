import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "server-only": resolve(root, "tests/server-only.ts"),
    },
  },
  test: {
    include: ["tests/**/*.unit.spec.ts"],
    environment: "node",
  },
});
