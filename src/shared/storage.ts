import type { Profile, Settings, SiteEntry, StoreData } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import type { BackupPayload } from "./backup";
import { serializeBackup } from "./backup";

const SETTINGS_KEY = "settings";
const SITES_KEY = "sites";
/** データ本体の最終更新時刻。同期時の新旧判定に使う（本体と同一 set で原子的に更新） */
const UPDATED_AT_KEY = "dataUpdatedAt";
const SYNC_ENABLED_KEY = "syncEnabled";
const SYNC_ERROR_KEY = "syncError";

/** background の同期処理が「データ本体の変更」を検知するためのキー一覧 */
export const DATA_KEYS = [SETTINGS_KEY, SITES_KEY, UPDATED_AT_KEY, SYNC_ENABLED_KEY] as const;

export async function getSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function setSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings, [UPDATED_AT_KEY]: Date.now() });
}

export async function getSites(): Promise<Record<string, SiteEntry>> {
  const res = await chrome.storage.local.get(SITES_KEY);
  return (res[SITES_KEY] as Record<string, SiteEntry> | undefined) ?? {};
}

export async function setSites(sites: Record<string, SiteEntry>): Promise<void> {
  await chrome.storage.local.set({ [SITES_KEY]: sites, [UPDATED_AT_KEY]: Date.now() });
}

export async function getDataUpdatedAt(): Promise<number> {
  const res = await chrome.storage.local.get(UPDATED_AT_KEY);
  return (res[UPDATED_AT_KEY] as number | undefined) ?? 0;
}

export async function getSyncEnabled(): Promise<boolean> {
  const res = await chrome.storage.local.get(SYNC_ENABLED_KEY);
  return (res[SYNC_ENABLED_KEY] as boolean | undefined) ?? false;
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [SYNC_ENABLED_KEY]: enabled });
}

export async function getSyncError(): Promise<string | null> {
  const res = await chrome.storage.local.get(SYNC_ERROR_KEY);
  return (res[SYNC_ERROR_KEY] as string | undefined) ?? null;
}

export async function setSyncError(error: string | null): Promise<void> {
  // 値が変わらない書き込みは onChanged の無駄な発火（と同期ループ）を避ける
  if ((await getSyncError()) === error) return;
  if (error === null) {
    await chrome.storage.local.remove(SYNC_ERROR_KEY);
  } else {
    await chrome.storage.local.set({ [SYNC_ERROR_KEY]: error });
  }
}

/**
 * クラウド側の内容をこの端末へ反映する（background の同期処理専用）。
 * setSites 等と違い dataUpdatedAt をリモートの時刻に合わせるため、再 push はされない。
 */
export async function applyRemoteData(
  settings: Settings,
  sites: Record<string, SiteEntry>,
  remoteUpdatedAt: number,
): Promise<void> {
  await chrome.storage.local.set({
    [SETTINGS_KEY]: settings,
    [SITES_KEY]: sites,
    [UPDATED_AT_KEY]: remoteUpdatedAt,
  });
}

export async function getSite(urlKey: string): Promise<SiteEntry | null> {
  const sites = await getSites();
  return sites[urlKey] ?? null;
}

export async function setSite(urlKey: string, entry: SiteEntry): Promise<void> {
  const sites = await getSites();
  if (entry.profiles.length === 0) {
    delete sites[urlKey];
  } else {
    sites[urlKey] = entry;
  }
  await setSites(sites);
}

export async function deleteSite(urlKey: string): Promise<void> {
  const sites = await getSites();
  delete sites[urlKey];
  await setSites(sites);
}

export async function addProfile(urlKey: string, profile: Profile): Promise<void> {
  const entry = (await getSite(urlKey)) ?? { profiles: [], lastUsedProfileId: null };
  entry.profiles.push(profile);
  entry.lastUsedProfileId = profile.id;
  await setSite(urlKey, entry);
}

export async function markUsed(urlKey: string, profileId: string): Promise<void> {
  const entry = await getSite(urlKey);
  if (!entry || !entry.profiles.some((p) => p.id === profileId)) return;
  entry.lastUsedProfileId = profileId;
  await setSite(urlKey, entry);
}

export async function getStore(): Promise<StoreData> {
  return { settings: await getSettings(), sites: await getSites() };
}

/** 現在の設定・同期設定・全サイトデータを 1 つの JSON テキストに直列化する */
export async function exportBackup(): Promise<string> {
  const [settings, syncEnabled, sites] = await Promise.all([
    getSettings(),
    getSyncEnabled(),
    getSites(),
  ]);
  return serializeBackup(settings, syncEnabled, sites);
}

/** バックアップの内容で設定・同期設定・全サイトデータを丸ごと置き換える */
export async function importBackup(payload: BackupPayload): Promise<void> {
  await Promise.all([
    setSettings(payload.settings),
    setSyncEnabled(payload.syncEnabled),
    setSites(payload.sites),
  ]);
}

/** storage の変更を購読する。戻り値は購読解除関数 */
export function onStoreChanged(callback: () => void): () => void {
  const listener = (
    _changes: Record<string, chrome.storage.StorageChange>,
    area: string,
  ) => {
    if (area === "local") callback();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
