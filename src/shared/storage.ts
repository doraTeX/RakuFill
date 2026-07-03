import type { Profile, Settings, SiteEntry, StoreData } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const SETTINGS_KEY = "settings";
const SITES_KEY = "sites";

export async function getSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] as Partial<Settings> | undefined) };
}

export async function setSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getSites(): Promise<Record<string, SiteEntry>> {
  const res = await chrome.storage.local.get(SITES_KEY);
  return (res[SITES_KEY] as Record<string, SiteEntry> | undefined) ?? {};
}

export async function setSites(sites: Record<string, SiteEntry>): Promise<void> {
  await chrome.storage.local.set({ [SITES_KEY]: sites });
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
