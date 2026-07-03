import type { Message } from "../shared/types";

const DASHBOARD_MENU_ID = "rakufill-dashboard";
const DASHBOARD_URL = "src/dashboard/index.html";

function openDashboard(): void {
  void chrome.tabs.create({ url: chrome.runtime.getURL(DASHBOARD_URL) });
}

// アイコン左クリック → ページ上部バーのトグル
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  chrome.tabs
    .sendMessage(tab.id, { type: "TOGGLE_BAR" } satisfies Message)
    .catch(() => {
      // chrome:// ページ等、content script が入らないタブでは何もしない
    });
});

// アイコン右クリックメニュー「ダッシュボード」
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: DASHBOARD_MENU_ID,
    title: chrome.i18n.getMessage("dashboard"),
    contexts: ["action"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === DASHBOARD_MENU_ID) openDashboard();
});

// SPA を含む URL 変化を検知して content script に再チェックさせる（要件5の「常に監視」）
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  chrome.tabs
    .sendMessage(tabId, { type: "URL_CHANGED" } satisfies Message)
    .catch(() => {});
});

// バー内の「ダッシュボード」ボタン
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === "OPEN_DASHBOARD") openDashboard();
});
