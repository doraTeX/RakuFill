import { describe, expect, it } from "vitest";
import { parseBackup, serializeBackup } from "../src/shared/backup";
import { SiteEntryShapeError } from "../src/shared/site-entry";
import type { SiteEntry } from "../src/shared/types";

const sites: Record<string, SiteEntry> = {
  "https://example.com/form": {
    profiles: [
      { id: "p1", name: "申請 その1", savedAt: 1700000000000, fields: [] },
      { id: "p2", name: "申請 その2", savedAt: 1700000001000, fields: [] },
    ],
    lastUsedProfileId: "p2",
    alias: "経費申請フォーム",
  },
};

describe("serializeBackup / parseBackup ラウンドトリップ", () => {
  it("設定・同期設定・サイトデータをすべて保持する", () => {
    const json = serializeBackup(
      { autoApplyEnabled: false, savePasswordsEnabled: true },
      true,
      sites,
    );
    const parsed = parseBackup(json);
    expect(parsed.settings).toEqual({ autoApplyEnabled: false, savePasswordsEnabled: true });
    expect(parsed.syncEnabled).toBe(true);
    expect(parsed.sites).toEqual(sites);
    expect(parsed.exportedAt).toBeGreaterThan(0);
  });

  it("settings / syncEnabled が欠けていてもデフォルト値で補う", () => {
    const parsed = parseBackup(JSON.stringify({ sites: {} }));
    expect(parsed.settings).toEqual({ autoApplyEnabled: true, savePasswordsEnabled: false });
    expect(parsed.syncEnabled).toBe(false);
    expect(parsed.sites).toEqual({});
  });

  it("各サイトの profiles も parseSiteEntryObject と同様に検証・補完される", () => {
    const parsed = parseBackup(
      JSON.stringify({
        sites: {
          "https://a.example/x": {
            profiles: [{ name: "n", fields: [] }],
            lastUsedProfileId: "存在しないID",
          },
        },
      }),
    );
    const entry = parsed.sites["https://a.example/x"];
    expect(entry.profiles[0].id).toBeTruthy();
    expect(entry.lastUsedProfileId).toBe(entry.profiles[0].id);
  });

  it("構文エラーは SyntaxError", () => {
    expect(() => parseBackup("{ oops")).toThrow(SyntaxError);
  });

  it("sites が無い/不正な形式は SiteEntryShapeError", () => {
    expect(() => parseBackup(JSON.stringify({ settings: {} }))).toThrow(SiteEntryShapeError);
    expect(() => parseBackup(JSON.stringify({ sites: "not an object" }))).toThrow(
      SiteEntryShapeError,
    );
    expect(() =>
      parseBackup(JSON.stringify({ sites: { x: { profiles: [{ name: 1, fields: [] }] } } })),
    ).toThrow(SiteEntryShapeError);
  });
});
