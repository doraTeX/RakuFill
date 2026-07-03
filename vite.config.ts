import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    target: "es2022",
    rollupOptions: {
      // manifest から参照されない拡張機能ページは明示的に入力へ加える
      input: {
        dashboard: "src/dashboard/index.html",
      },
    },
  },
});
