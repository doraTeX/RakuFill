import { describe, expect, it } from "vitest";
import { locateJsonError } from "../src/shared/json-lint";

describe("locateJsonError", () => {
  it("妥当な JSON は null", () => {
    expect(locateJsonError('{ "a": 1, "b": [1, 2, "x"], "c": { "d": null } }')).toBeNull();
  });

  it("空文字列は 1行目1列目のエラーとして扱う", () => {
    const result = locateJsonError("");
    expect(result).toEqual({ message: "empty input", index: 0, line: 1, column: 1 });
  });

  it("末尾カンマ（オブジェクト）の位置を特定する", () => {
    const result = locateJsonError('{\n  "a": 1,\n}');
    expect(result?.line).toBe(3);
    expect(result?.column).toBe(1);
  });

  it("プロパティ間のカンマ抜けの位置を特定する", () => {
    const result = locateJsonError('{\n  "a": 1\n  "b": 2\n}');
    expect(result?.line).toBe(3);
    expect(result?.column).toBe(3);
  });

  it("コロン抜けの位置を特定する", () => {
    const result = locateJsonError('{ "a" 1 }');
    expect(result?.line).toBe(1);
    expect(result?.column).toBe(7);
  });

  it("未終端の文字列の位置を特定する", () => {
    const result = locateJsonError('{ "a": "unterminated }');
    expect(result?.line).toBe(1);
    expect(result?.column).toBe(8);
  });

  it("配列内のカンマ抜けの位置を特定する", () => {
    const result = locateJsonError("[1, 2 3]");
    expect(result?.line).toBe(1);
    expect(result?.column).toBe(7);
  });

  it("値がない箇所（不正なトークン）の位置を特定する", () => {
    const result = locateJsonError('{ "a": }');
    expect(result?.line).toBe(1);
    expect(result?.column).toBe(8);
  });

  it("複数行にまたがる場合も正しい行番号を返す", () => {
    const text = ['{', '  "name": "テスト",', '  "value": ,', "}"].join("\n");
    const result = locateJsonError(text);
    expect(result?.line).toBe(3);
  });

  it("末尾に余分な内容がある場合を検出する", () => {
    const result = locateJsonError('{ "a": 1 } extra');
    expect(result?.line).toBe(1);
    expect(result?.column).toBe(12);
  });
});
