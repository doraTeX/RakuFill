/** chrome.i18n.getMessage の薄いラッパー。全 UI 文字列は _locales 経由で参照する */
export function t(key: string, substitutions?: string | string[]): string {
  const msg = chrome.i18n.getMessage(key, substitutions);
  return msg || key;
}
