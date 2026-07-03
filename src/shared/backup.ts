import type { Settings, SiteEntry } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { parseSiteEntryObject, SiteEntryShapeError } from "./site-entry";

/** エクスポート/インポートされるファイル全体の形式 */
export interface BackupPayload {
  exportedAt: number;
  settings: Settings;
  syncEnabled: boolean;
  sites: Record<string, SiteEntry>;
}

export function serializeBackup(
  settings: Settings,
  syncEnabled: boolean,
  sites: Record<string, SiteEntry>,
): string {
  const payload: BackupPayload = { exportedAt: Date.now(), settings, syncEnabled, sites };
  return JSON.stringify(payload, null, 2);
}

/**
 * バックアップ JSON テキストを検証・正規化する。
 * 構文エラーは SyntaxError、形式エラーは SiteEntryShapeError を投げる。
 * settings / syncEnabled の欠けはデフォルト値で補う。sites の各エントリは
 * parseSiteEntryObject と同じ検証（id/savedAt 補完、壊れた lastUsedProfileId の付け替え）を通す。
 */
export function parseBackup(text: string): BackupPayload {
  const data = JSON.parse(text) as unknown;
  if (typeof data !== "object" || data === null) throw new SiteEntryShapeError();
  const raw = data as Partial<BackupPayload>;
  if (typeof raw.sites !== "object" || raw.sites === null) throw new SiteEntryShapeError();

  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(typeof raw.settings === "object" && raw.settings !== null
      ? (raw.settings as Partial<Settings>)
      : {}),
  };
  const syncEnabled = typeof raw.syncEnabled === "boolean" ? raw.syncEnabled : true;

  const sites: Record<string, SiteEntry> = {};
  for (const [key, value] of Object.entries(raw.sites)) {
    sites[key] = parseSiteEntryObject(value);
  }

  return {
    exportedAt: typeof raw.exportedAt === "number" ? raw.exportedAt : Date.now(),
    settings,
    syncEnabled,
    sites,
  };
}
