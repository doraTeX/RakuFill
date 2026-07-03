import type { Locator } from "../shared/types";

export type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** 保存対象のフォーム要素を列挙する。RakuFill 自身の UI 内は除外 */
export function collectFormElements(root: Document | Element = document): FormElement[] {
  const all = root.querySelectorAll<FormElement>("input, textarea, select");
  return [...all].filter((el) => !el.closest("[data-rakufill-ui]"));
}

/** 要素から復元用の特定子を作る。優先順: id → name(+出現順) → 構造的 CSS パス */
export function buildLocator(el: FormElement): Locator {
  if (el.id) {
    return { id: el.id };
  }
  const name = el.getAttribute("name");
  if (name) {
    if (el instanceof HTMLInputElement && el.type === "radio") {
      return { name, radioValue: el.value };
    }
    const sameName = collectFormElements().filter(
      (other) => other.tagName === el.tagName && other.getAttribute("name") === name,
    );
    const index = sameName.indexOf(el);
    return { name, nameIndex: index >= 0 ? index : 0 };
  }
  return { css: cssPath(el) };
}

/** 特定子から要素を解決する。見つからなければ null（呼び出し側でスキップ） */
export function resolveLocator(locator: Locator, root: Document = document): FormElement | null {
  if (locator.id) {
    const el = root.getElementById(locator.id);
    return isFormElement(el) ? el : null;
  }
  if (locator.name) {
    const n = escapeAttrValue(locator.name);
    const tagCandidates = root.querySelectorAll<FormElement>(
      `input[name="${n}"], textarea[name="${n}"], select[name="${n}"]`,
    );
    const list = [...tagCandidates].filter((el) => !el.closest("[data-rakufill-ui]"));
    if (locator.radioValue !== undefined) {
      return (
        list.find(
          (el) =>
            el instanceof HTMLInputElement && el.type === "radio" && el.value === locator.radioValue,
        ) ?? null
      );
    }
    return list[locator.nameIndex ?? 0] ?? null;
  }
  if (locator.css) {
    let el: Element | null = null;
    try {
      el = root.querySelector(locator.css);
    } catch {
      return null;
    }
    return isFormElement(el) ? el : null;
  }
  return null;
}

/** 属性セレクタの引用符内で安全になるようエスケープする（CSS.escape 非依存） */
function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isFormElement(el: Element | null): el is FormElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

/** id も name もない要素のための構造的 CSS パス（nth-of-type チェーン） */
function cssPath(el: Element): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement) {
    const tag = cur.tagName.toLowerCase();
    let nth = 1;
    let sib = cur.previousElementSibling;
    while (sib) {
      if (sib.tagName === cur.tagName) nth++;
      sib = sib.previousElementSibling;
    }
    parts.unshift(`${tag}:nth-of-type(${nth})`);
    cur = cur.parentElement;
  }
  return parts.join(" > ");
}
