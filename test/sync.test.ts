import { describe, expect, it } from "vitest";
import { joinChunks, parsePayload, splitIntoChunks } from "../src/shared/sync";

function roundTrip(payload: string): string | null {
  const chunks = splitIntoChunks(payload);
  const items = Object.fromEntries(chunks.map((c, i) => [`data${i}`, c]));
  return joinChunks(items, chunks.length);
}

describe("sync のチャンク分割", () => {
  it("分割 → 結合で元に戻る（日本語含む）", () => {
    const payload = JSON.stringify({
      settings: { autoApplyEnabled: true, savePasswordsEnabled: false },
      sites: {
        "https://example.com/フォーム": {
          profiles: [{ id: "p1", name: "申請 その1", savedAt: 1, fields: [] }],
          lastUsedProfileId: "p1",
        },
      },
    });
    expect(roundTrip(payload)).toBe(payload);
  });

  it("チャンク境界をまたぐ長いデータも元に戻る", () => {
    const long = "あいうえおABCDE\\\"\n".repeat(3000); // 数チャンク分
    const payload = JSON.stringify({ data: long });
    const chunks = splitIntoChunks(payload);
    expect(chunks.length).toBeGreaterThan(1);
    expect(roundTrip(payload)).toBe(payload);
  });

  it("各チャンクは QUOTA_BYTES_PER_ITEM (8192) に収まる", () => {
    // 最悪ケースに近い CJK 主体のデータ
    const payload = "日本語テキストのかたまり／記号\"\\も混ぜる".repeat(2000);
    for (const [i, chunk] of splitIntoChunks(payload).entries()) {
      const itemBytes =
        new TextEncoder().encode(JSON.stringify(chunk)).length + `data${i}`.length;
      expect(itemBytes).toBeLessThanOrEqual(8192);
    }
  });

  it("空文字列は 1 チャンクとして扱う", () => {
    expect(splitIntoChunks("")).toEqual([""]);
    expect(roundTrip("")).toBe("");
  });

  it("チャンクが欠けていたら null", () => {
    expect(joinChunks({ data0: "a" }, 2)).toBeNull();
    expect(joinChunks({ data0: "a", data1: 42 }, 2)).toBeNull();
  });
});

describe("parsePayload", () => {
  it("正しい payload を受け入れる", () => {
    const parsed = parsePayload(
      JSON.stringify({ settings: { autoApplyEnabled: false }, sites: {} }),
    );
    expect(parsed?.settings.autoApplyEnabled).toBe(false);
    expect(parsed?.sites).toEqual({});
  });

  it("不正な payload は null", () => {
    expect(parsePayload("{ broken")).toBeNull();
    expect(parsePayload(JSON.stringify({ settings: null, sites: {} }))).toBeNull();
    expect(parsePayload(JSON.stringify({ sites: {} }))).toBeNull();
    expect(parsePayload(JSON.stringify("just a string"))).toBeNull();
  });
});
