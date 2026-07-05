import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "__MSG_extName__",
  description: "__MSG_extDescription__",
  version: "1.0.0",
  // 日本語 UI 環境では ja/messages.json が使われ、それ以外の言語環境では
  // 一致するロケールが無いため既定ロケールの en/messages.json（英語）にフォールバックする
  default_locale: "en",
  icons: {
    16: "icons/icon16.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  action: {
    default_title: "__MSG_actionTitle__",
    // default_popup は設定しない: 左クリックで action.onClicked を発火させる
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  permissions: ["storage", "contextMenus"],
  host_permissions: ["<all_urls>"],
});
