import type { Settings, SiteEntry } from "./types";

/**
 * chrome.storage.sync（Chrome にログイン中の Google アカウントで端末間同期される領域）への
 * 読み書き。1 アイテム 8KB の制限があるため、全データを 1 つの JSON 文字列に直列化して
 * 固定長チャンクに分割して保存する。
 *
 * sync 側のキー構成:
 *   meta    → { updatedAt, chunkCount }
 *   data0.. → 直列化した JSON のチャンク
 */

const META_KEY = "meta";
const CHUNK_PREFIX = "data";
/**
 * 1 チャンクの文字数。最悪ケース（CJK 3バイト/文字）でも
 * 2000 * 3 + エスケープ余裕 < QUOTA_BYTES_PER_ITEM (8192) に収まる。
 */
const CHUNK_CHARS = 2000;

export interface SyncMeta {
  updatedAt: number;
  chunkCount: number;
}

export interface SyncPayload {
  settings: Settings;
  sites: Record<string, SiteEntry>;
}

export function splitIntoChunks(payload: string, chunkChars: number = CHUNK_CHARS): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < payload.length; i += chunkChars) {
    chunks.push(payload.slice(i, i + chunkChars));
  }
  return chunks.length > 0 ? chunks : [""];
}

/** チャンク群を連結して元の文字列に戻す。欠けがあれば null */
export function joinChunks(items: Record<string, unknown>, chunkCount: number): string | null {
  let out = "";
  for (let i = 0; i < chunkCount; i++) {
    const part = items[`${CHUNK_PREFIX}${i}`];
    if (typeof part !== "string") return null;
    out += part;
  }
  return out;
}

export async function readRemote(): Promise<{ meta: SyncMeta; payload: string } | null> {
  const metaRes = await chrome.storage.sync.get(META_KEY);
  const meta = metaRes[META_KEY] as SyncMeta | undefined;
  if (!meta || typeof meta.chunkCount !== "number" || typeof meta.updatedAt !== "number") {
    return null;
  }
  const keys = Array.from({ length: meta.chunkCount }, (_, i) => `${CHUNK_PREFIX}${i}`);
  const items = await chrome.storage.sync.get(keys);
  const payload = joinChunks(items, meta.chunkCount);
  return payload === null ? null : { meta, payload };
}

export async function writeRemote(payload: string, updatedAt: number): Promise<void> {
  const chunks = splitIntoChunks(payload);
  const items: Record<string, unknown> = {
    [META_KEY]: { updatedAt, chunkCount: chunks.length } satisfies SyncMeta,
  };
  chunks.forEach((c, i) => {
    items[`${CHUNK_PREFIX}${i}`] = c;
  });
  await chrome.storage.sync.set(items);

  // データが縮んだときに残る古いチャンクを掃除する
  const all = await chrome.storage.sync.get(null);
  const stale = Object.keys(all).filter(
    (k) => k.startsWith(CHUNK_PREFIX) && Number(k.slice(CHUNK_PREFIX.length)) >= chunks.length,
  );
  if (stale.length > 0) await chrome.storage.sync.remove(stale);
}

/** 直列化した payload を SyncPayload として軽く検証しつつパースする。不正なら null */
export function parsePayload(payload: string): SyncPayload | null {
  try {
    const data = JSON.parse(payload) as Partial<SyncPayload>;
    if (typeof data !== "object" || data === null) return null;
    if (typeof data.settings !== "object" || data.settings === null) return null;
    if (typeof data.sites !== "object" || data.sites === null) return null;
    return { settings: data.settings as Settings, sites: data.sites };
  } catch {
    return null;
  }
}
