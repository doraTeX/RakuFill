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

/**
 * リンク（href）として開いてよい URL かどうか。
 * URL キーは通常 urlKeyOf が生成するが、インポートしたバックアップ JSON からは
 * 任意の文字列がキーになり得るため、javascript: などを href に載せないよう確認する。
 */
export function isLinkableUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "file:";
}
