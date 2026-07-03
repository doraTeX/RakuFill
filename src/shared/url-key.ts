/**
 * 保存データの紐付けキー。オリジン + パスに正規化し、クエリ・ハッシュは無視する。
 * 末尾スラッシュの有無で別ページ扱いにならないよう、ルート以外は取り除く。
 */
export function urlKeyOf(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:" && parsed.protocol !== "file:") {
    return null;
  }
  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return parsed.origin === "null" ? `file://${path}` : parsed.origin + path;
}
