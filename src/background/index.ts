import type { Message } from "../shared/types";
import {
  applyRemoteData,
  DATA_KEYS,
  getDataUpdatedAt,
  getSettings,
  getSites,
  getSyncEnabled,
  setSyncError,
} from "../shared/storage";
import { parsePayload, readRemote, writeRemote } from "../shared/sync";

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

// バー内の「ダッシュボード」ボタン
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === "OPEN_DASHBOARD") openDashboard();
});

// ---------------------------------------------------------------------------
// クラウド同期（chrome.storage.sync）
//
// local が正、sync がミラー。background だけが同期を行う。
//   - この端末でデータが変わったら push
//   - 他端末の変更が sync 経由で届いたら pull（新しい updatedAt が勝つ）
// 自分の push も onChanged を発火させるが、内容が一致していれば何もしないので
// ループにはならない。
// ---------------------------------------------------------------------------

const RECONCILE_DEBOUNCE_MS = 1500;
let reconcileTimer: ReturnType<typeof setTimeout> | undefined;
let reconciling = false;
let reconcileQueued = false;

function scheduleReconcile(): void {
  clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(() => void runReconcile(), RECONCILE_DEBOUNCE_MS);
}

async function runReconcile(): Promise<void> {
  if (reconciling) {
    reconcileQueued = true;
    return;
  }
  reconciling = true;
  try {
    await reconcile();
  } catch (e) {
    await setSyncError(e instanceof Error ? e.message : String(e));
  } finally {
    reconciling = false;
    if (reconcileQueued) {
      reconcileQueued = false;
      scheduleReconcile();
    }
  }
}

async function reconcile(): Promise<void> {
  if (!(await getSyncEnabled())) return;

  const [settings, sites, localUpdatedAt] = await Promise.all([
    getSettings(),
    getSites(),
    getDataUpdatedAt(),
  ]);
  const localPayload = JSON.stringify({ settings, sites });
  const remote = await readRemote();

  if (remote && remote.payload === localPayload) {
    await setSyncError(null);
    return;
  }

  if (remote && remote.meta.updatedAt > localUpdatedAt) {
    // クラウド側が新しい → この端末へ取り込む
    const parsed = parsePayload(remote.payload);
    if (parsed) {
      await applyRemoteData(parsed.settings, parsed.sites, remote.meta.updatedAt);
      await setSyncError(null);
      return;
    }
    // クラウド側が壊れている場合はローカルで上書きする
  }

  // ローカル側が新しい（またはクラウドが空/不正）→ push
  await writeRemote(localPayload, localUpdatedAt || Date.now());
  await setSyncError(null);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync") {
    scheduleReconcile();
  } else if (area === "local" && DATA_KEYS.some((key) => key in changes)) {
    scheduleReconcile();
  }
});

chrome.runtime.onStartup.addListener(() => scheduleReconcile());
chrome.runtime.onInstalled.addListener(() => scheduleReconcile());
