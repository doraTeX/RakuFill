import type { FieldRecord } from "../shared/types";
import { buildLocator, collectFormElements } from "./locator";

export interface CaptureOptions {
  includePasswords?: boolean;
}

/**
 * ページ内の全フォーム要素の現在の入力状態を収集する。
 * type=file は復元不可能、type=hidden は CSRF トークン等を含み得るため対象外。
 * type=password は設定で明示的に許可された場合だけ保存する。
 */
export function captureFields(options: CaptureOptions = {}): FieldRecord[] {
  const records: FieldRecord[] = [];
  for (const el of collectFormElements()) {
    if (el instanceof HTMLInputElement) {
      if (el.type === "file" || el.type === "hidden") continue;
      if (el.type === "password" && !options.includePasswords) continue;
      const locator = buildLocator(el);
      if (el.type === "checkbox") {
        records.push({ locator, kind: "checkbox", checked: el.checked });
      } else if (el.type === "radio") {
        records.push({ locator, kind: "radio", checked: el.checked });
      } else {
        records.push({ locator, kind: "text", value: el.value });
      }
    } else if (el instanceof HTMLTextAreaElement) {
      records.push({ locator: buildLocator(el), kind: "textarea", value: el.value });
    } else if (el instanceof HTMLSelectElement) {
      if (el.multiple) {
        const values = [...el.selectedOptions].map((o) => o.value);
        records.push({ locator: buildLocator(el), kind: "select-multiple", values });
      } else {
        records.push({ locator: buildLocator(el), kind: "select", value: el.value });
      }
    }
  }
  return records;
}
