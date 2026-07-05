import type { Message, Profile } from "../shared/types";
import { addProfile, getSettings, getSite, markUsed, onStoreChanged } from "../shared/storage";
import { t } from "../shared/i18n";
import { urlKeyOf } from "../shared/url-key";
import { captureFields } from "./capture";
import { applyFieldsWithRetry } from "./apply";
import { initBar, setProfiles, showBar, showToast, toggleBar } from "./bar";

/** このナビゲーションで自動適用済みの urlKey（SPA 遷移で戻ってきた場合の二重適用防止） */
const autoAppliedFor = new Set<string>();

function currentUrlKey(): string | null {
  return urlKeyOf(location.href);
}

async function refreshBarProfiles(): Promise<void> {
  const key = currentUrlKey();
  if (!key) return;
  const site = await getSite(key);
  setProfiles(site?.profiles ?? [], site?.lastUsedProfileId ?? null);
}

async function handleSave(name: string): Promise<void> {
  const key = currentUrlKey();
  if (!key) return;
  const settings = await getSettings();
  const fields = captureFields({ includePasswords: settings.savePasswordsEnabled });
  if (fields.length === 0) {
    showToast(t("toastNoFields"));
    return;
  }
  const profile: Profile = {
    id: crypto.randomUUID(),
    name,
    savedAt: Date.now(),
    fields,
  };
  await addProfile(key, profile);
  await refreshBarProfiles();
  showToast(t("toastSaved", name));
}

async function handleSelect(profileId: string): Promise<void> {
  const key = currentUrlKey();
  if (!key) return;
  const site = await getSite(key);
  const profile = site?.profiles.find((p) => p.id === profileId);
  if (!profile) return;
  applyFieldsWithRetry(profile.fields);
  await markUsed(key, profileId);
  showToast(t("toastApplied", profile.name));
}

/**
 * 要件5: 保存済みデータのあるページに出くわしたら、バーを自動表示し、
 * 設定が ON なら最後に使ったプロファイルを自動適用する。
 */
async function checkPage(): Promise<void> {
  const key = currentUrlKey();
  if (!key) return;
  const site = await getSite(key);
  if (!site || site.profiles.length === 0) return;

  showBar();
  await refreshBarProfiles();

  if (autoAppliedFor.has(key)) return;
  autoAppliedFor.add(key);

  const settings = await getSettings();
  if (!settings.autoApplyEnabled) return;
  const last =
    site.profiles.find((p) => p.id === site.lastUsedProfileId) ?? site.profiles[0];
  applyFieldsWithRetry(last.fields);
  showToast(t("toastApplied", last.name));
}

initBar({
  onSaveRequested: handleSave,
  onProfileSelected: handleSelect,
  onDashboardRequested: () => {
    void chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" } satisfies Message);
  },
});

chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.type === "TOGGLE_BAR") {
    toggleBar();
    void refreshBarProfiles();
  }
});

let lastUrlKey = currentUrlKey();

function handleUrlMaybeChanged(): void {
  const next = currentUrlKey();
  if (next === lastUrlKey) return;
  lastUrlKey = next;
  void checkPage();
}

function installUrlWatcher(): void {
  const wrapHistoryMethod = (name: "pushState" | "replaceState") => {
    const original = history[name];
    history[name] = function (...args) {
      const result = original.apply(this, args);
      queueMicrotask(handleUrlMaybeChanged);
      return result;
    };
  };

  wrapHistoryMethod("pushState");
  wrapHistoryMethod("replaceState");
  addEventListener("popstate", handleUrlMaybeChanged);
  addEventListener("hashchange", handleUrlMaybeChanged);
}

// ダッシュボードや他タブでの変更をプルダウンへ即時反映
onStoreChanged(() => {
  void refreshBarProfiles();
});

installUrlWatcher();
void checkPage();
