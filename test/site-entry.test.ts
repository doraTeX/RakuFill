import { describe, expect, it } from "vitest";
import { parseSiteEntry, SiteEntryShapeError } from "../src/shared/site-entry";

const validProfile = {
  id: "p1",
  name: "テスト入力",
  savedAt: 1700000000000,
  fields: [{ locator: { id: "a" }, kind: "text", value: "x" }],
};

describe("parseSiteEntry", () => {
  it("正しい JSON を SiteEntry として受け入れる", () => {
    const entry = parseSiteEntry(
      JSON.stringify({ profiles: [validProfile], lastUsedProfileId: "p1" }),
    );
    expect(entry.profiles).toHaveLength(1);
    expect(entry.lastUsedProfileId).toBe("p1");
    expect(entry.alias).toBeUndefined();
  });

  it("alias を保持し、空白のみなら未設定にする", () => {
    const withAlias = parseSiteEntry(
      JSON.stringify({ profiles: [validProfile], lastUsedProfileId: "p1", alias: " 申請フォーム " }),
    );
    expect(withAlias.alias).toBe("申請フォーム");

    const blankAlias = parseSiteEntry(
      JSON.stringify({ profiles: [validProfile], lastUsedProfileId: "p1", alias: "   " }),
    );
    expect(blankAlias.alias).toBeUndefined();
  });

  it("id / savedAt の欠けは補完する", () => {
    const entry = parseSiteEntry(
      JSON.stringify({ profiles: [{ name: "n", fields: [] }], lastUsedProfileId: null }),
    );
    expect(entry.profiles[0].id).toBeTruthy();
    expect(entry.profiles[0].savedAt).toBeGreaterThan(0);
  });

  it("実在しない lastUsedProfileId は先頭プロファイルに付け替える", () => {
    const entry = parseSiteEntry(
      JSON.stringify({ profiles: [validProfile], lastUsedProfileId: "gone" }),
    );
    expect(entry.lastUsedProfileId).toBe("p1");
  });

  it("構文エラーは SyntaxError", () => {
    expect(() => parseSiteEntry("{ oops")).toThrow(SyntaxError);
  });

  it("形式エラーは SiteEntryShapeError", () => {
    expect(() => parseSiteEntry(JSON.stringify({ notProfiles: [] }))).toThrow(SiteEntryShapeError);
    expect(() =>
      parseSiteEntry(JSON.stringify({ profiles: [{ name: 123, fields: [] }] })),
    ).toThrow(SiteEntryShapeError);
    expect(() =>
      parseSiteEntry(JSON.stringify({ profiles: [{ name: "n" }] })),
    ).toThrow(SiteEntryShapeError);
  });
});
