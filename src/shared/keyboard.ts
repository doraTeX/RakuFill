/**
 * IME の文節確定・変換確定のために押された Enter を、フォーム入力の確定（送信）
 * とみなさないための判定。日本語などの IME 入力中に Enter を押すと keydown 自体は
 * 発火するため、`e.isComposing` だけを見ずに `keyCode === 229`（IME 処理中を示す
 * 歴史的な値、composition 終了直後の Enter で isComposing が false になる
 * ブラウザの揺れをカバーする）も合わせて確認する。
 */
export function isSubmitEnter(e: KeyboardEvent): boolean {
  return e.key === "Enter" && !e.isComposing && e.keyCode !== 229;
}
