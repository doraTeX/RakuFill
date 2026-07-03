import type { FieldRecord } from "../shared/types";
import { resolveLocator } from "./locator";

/**
 * 保存されたフィールドを現在のページへ適用する。
 * 見つからないフィールドは黙ってスキップし、未適用のものを返す（リトライ用）。
 * 保存データに無い新設フィールドには一切触れない。
 */
export function applyFields(fields: FieldRecord[]): FieldRecord[] {
  const remaining: FieldRecord[] = [];
  for (const field of fields) {
    const el = resolveLocator(field.locator);
    if (!el) {
      remaining.push(field);
      continue;
    }
    try {
      applyOne(el, field);
    } catch {
      // 個別フィールドの失敗で全体を止めない
    }
  }
  return remaining;
}

function applyOne(el: Element, field: FieldRecord): void {
  switch (field.kind) {
    case "text":
      if (el instanceof HTMLInputElement) setNativeValue(el, field.value ?? "");
      break;
    case "textarea":
      if (el instanceof HTMLTextAreaElement) setNativeValue(el, field.value ?? "");
      break;
    case "checkbox":
    case "radio":
      // click() ならフレームワークのハンドラも含めて自然に発火する
      if (el instanceof HTMLInputElement && el.checked !== (field.checked ?? false)) {
        el.click();
      }
      break;
    case "select":
      if (el instanceof HTMLSelectElement && field.value !== undefined) {
        const option = [...el.options].find((o) => o.value === field.value);
        if (option && el.value !== field.value) {
          el.value = field.value;
          dispatchEvents(el, ["input", "change"]);
        }
      }
      break;
    case "select-multiple":
      if (el instanceof HTMLSelectElement && field.values) {
        const wanted = new Set(field.values);
        let changed = false;
        for (const option of el.options) {
          const next = wanted.has(option.value);
          if (option.selected !== next) {
            option.selected = next;
            changed = true;
          }
        }
        if (changed) dispatchEvents(el, ["input", "change"]);
      }
      break;
  }
}

/**
 * React 等の制御コンポーネントでも値が反映されるよう、プロトタイプの
 * ネイティブ value setter を経由してから input/change を発火する定石。
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  if (el.value === value) return;
  const proto = el instanceof HTMLInputElement
    ? HTMLInputElement.prototype
    : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
  dispatchEvents(el, ["input", "change"]);
}

function dispatchEvents(el: Element, types: string[]): void {
  for (const type of types) {
    el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
  }
}

const RETRY_WINDOW_MS = 10_000;
const RETRY_DEBOUNCE_MS = 200;

/**
 * 即時適用し、未解決のフィールドが残る場合は SPA の遅延レンダリングに備えて
 * DOM 変化を監視しながら最大 10 秒間リトライする。
 */
export function applyFieldsWithRetry(fields: FieldRecord[]): void {
  let remaining = applyFields(fields);
  if (remaining.length === 0) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      remaining = applyFields(remaining);
      if (remaining.length === 0) stop();
    }, RETRY_DEBOUNCE_MS);
  });
  const stop = () => {
    clearTimeout(timer);
    observer.disconnect();
  };
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(stop, RETRY_WINDOW_MS);
}
