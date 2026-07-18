import { describe, expect, it } from "vitest";
import { isLinkableUrl, urlKeyOf } from "../src/shared/url-key";

describe("urlKeyOf", () => {
  it("オリジン+パスに正規化し、クエリとハッシュを無視する", () => {
    expect(urlKeyOf("https://example.com/entry/form?id=123&t=abc#section")).toBe(
      "https://example.com/entry/form",
    );
  });

  it("末尾スラッシュの有無で同一キーになる", () => {
    expect(urlKeyOf("https://example.com/form/")).toBe(urlKeyOf("https://example.com/form"));
  });

  it("ルートパスはそのまま", () => {
    expect(urlKeyOf("https://example.com/")).toBe("https://example.com/");
  });

  it("ポート番号はオリジンの一部として保持する", () => {
    expect(urlKeyOf("http://localhost:8080/form")).toBe("http://localhost:8080/form");
  });

  it("file: URL も扱える（ローカルのテストページ用）", () => {
    expect(urlKeyOf("file:///Users/me/test.html?x=1")).toBe("file:///Users/me/test.html");
  });

  it("http(s)/file 以外や不正な URL は null", () => {
    expect(urlKeyOf("chrome://extensions")).toBeNull();
    expect(urlKeyOf("about:blank")).toBeNull();
    expect(urlKeyOf("not a url")).toBeNull();
  });
});

describe("isLinkableUrl", () => {
  it("http/https/file はリンクにできる", () => {
    expect(isLinkableUrl("https://example.com/form")).toBe(true);
    expect(isLinkableUrl("http://localhost:8080/form")).toBe(true);
    expect(isLinkableUrl("file:///Users/me/test.html")).toBe(true);
  });

  it("javascript: など危険なスキームはリンクにしない", () => {
    // インポートしたバックアップ JSON には任意のキーが入り得る
    expect(isLinkableUrl("javascript:alert(1)")).toBe(false);
    expect(isLinkableUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isLinkableUrl("chrome://extensions")).toBe(false);
  });

  it("URL として解釈できない文字列はリンクにしない", () => {
    expect(isLinkableUrl("not a url")).toBe(false);
    expect(isLinkableUrl("")).toBe(false);
  });
});
