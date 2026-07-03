import type { Profile, SiteEntry } from "./types";

/** JSON の構文は正しいがデータ形式が SiteEntry として不正な場合に投げる */
export class SiteEntryShapeError extends Error {
  constructor() {
    super("invalid site entry shape");
    this.name = "SiteEntryShapeError";
  }
}

/**
 * 既にパース済みのデータを SiteEntry として検証・正規化する。
 * 形式エラーは SiteEntryShapeError を投げる。
 * id / savedAt の欠けは補完し、lastUsedProfileId は実在しなければ先頭に付け替える。
 */
export function parseSiteEntryObject(data: unknown): SiteEntry {
  if (typeof data !== "object" || data === null || !Array.isArray((data as SiteEntry).profiles)) {
    throw new SiteEntryShapeError();
  }
  const raw = data as { profiles: unknown[]; lastUsedProfileId?: unknown; alias?: unknown };
  const profiles: Profile[] = raw.profiles.map((p) => {
    if (typeof p !== "object" || p === null) throw new SiteEntryShapeError();
    const prof = p as Partial<Profile>;
    if (typeof prof.name !== "string" || !Array.isArray(prof.fields)) {
      throw new SiteEntryShapeError();
    }
    return {
      id: typeof prof.id === "string" && prof.id ? prof.id : crypto.randomUUID(),
      name: prof.name,
      savedAt: typeof prof.savedAt === "number" ? prof.savedAt : Date.now(),
      fields: prof.fields,
    };
  });
  const lastUsed =
    typeof raw.lastUsedProfileId === "string" &&
    profiles.some((p) => p.id === raw.lastUsedProfileId)
      ? raw.lastUsedProfileId
      : (profiles[0]?.id ?? null);
  const alias = typeof raw.alias === "string" && raw.alias.trim() ? raw.alias.trim() : undefined;
  return { profiles, lastUsedProfileId: lastUsed, ...(alias ? { alias } : {}) };
}

/**
 * JSON テキストを SiteEntry として検証・正規化する。
 * 構文エラーは SyntaxError、形式エラーは SiteEntryShapeError を投げる。
 */
export function parseSiteEntry(text: string): SiteEntry {
  return parseSiteEntryObject(JSON.parse(text) as unknown);
}
