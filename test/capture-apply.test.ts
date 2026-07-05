import { beforeEach, describe, expect, it } from "vitest";
import { captureFields } from "../src/content/capture";
import { applyFields } from "../src/content/apply";

const FORM_HTML = `
  <form>
    <input id="name" type="text" />
    <input id="password" type="password" />
    <input id="agree" type="checkbox" />
    <input type="radio" name="color" value="red" />
    <input type="radio" name="color" value="blue" />
    <textarea id="memo"></textarea>
    <select id="pref">
      <option value="">--</option>
      <option value="tokyo">東京</option>
      <option value="osaka">大阪</option>
    </select>
    <select id="tags" multiple>
      <option value="a">A</option>
      <option value="b">B</option>
      <option value="c">C</option>
    </select>
    <input type="hidden" name="csrf" value="secret-token" />
    <input type="file" name="upload" />
  </form>
`;

function fillForm(): void {
  document.querySelector<HTMLInputElement>("#name")!.value = "山田太郎";
  document.querySelector<HTMLInputElement>("#password")!.value = "secret";
  document.querySelector<HTMLInputElement>("#agree")!.checked = true;
  document.querySelector<HTMLInputElement>('input[value="blue"]')!.checked = true;
  document.querySelector<HTMLTextAreaElement>("#memo")!.value = "メモ\n2行目";
  document.querySelector<HTMLSelectElement>("#pref")!.value = "osaka";
  const tags = document.querySelector<HTMLSelectElement>("#tags")!;
  tags.options[0].selected = true;
  tags.options[2].selected = true;
}

describe("capture → apply ラウンドトリップ", () => {
  beforeEach(() => {
    document.body.innerHTML = FORM_HTML;
  });

  it("全種類のフォーム要素の状態を保存・復元できる", () => {
    fillForm();
    const fields = captureFields();

    // フォームをリセットした状態に対して適用
    document.body.innerHTML = FORM_HTML;
    const remaining = applyFields(fields);
    expect(remaining).toEqual([]);

    expect(document.querySelector<HTMLInputElement>("#name")!.value).toBe("山田太郎");
    expect(document.querySelector<HTMLInputElement>("#agree")!.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>('input[value="blue"]')!.checked).toBe(true);
    expect(document.querySelector<HTMLInputElement>('input[value="red"]')!.checked).toBe(false);
    expect(document.querySelector<HTMLTextAreaElement>("#memo")!.value).toBe("メモ\n2行目");
    expect(document.querySelector<HTMLSelectElement>("#pref")!.value).toBe("osaka");
    const tags = document.querySelector<HTMLSelectElement>("#tags")!;
    expect([...tags.selectedOptions].map((o) => o.value)).toEqual(["a", "c"]);
  });

  it("hidden と file は保存対象に含めない", () => {
    fillForm();
    const fields = captureFields();
    const kinds = fields.map((f) => f.locator);
    expect(kinds.some((l) => l.name === "csrf")).toBe(false);
    expect(kinds.some((l) => l.name === "upload")).toBe(false);
  });

  it("password はデフォルトでは保存対象に含めず、明示許可時だけ含める", () => {
    fillForm();
    const defaultFields = captureFields();
    expect(defaultFields.some((f) => f.locator.id === "password")).toBe(false);

    const passwordFields = captureFields({ includePasswords: true });
    expect(passwordFields).toContainEqual({
      locator: { id: "password" },
      kind: "text",
      value: "secret",
    });
  });

  it("チェックを外した状態も復元できる（true → false）", () => {
    fillForm();
    document.querySelector<HTMLInputElement>("#agree")!.checked = false;
    const fields = captureFields();

    document.body.innerHTML = FORM_HTML;
    document.querySelector<HTMLInputElement>("#agree")!.checked = true;
    applyFields(fields);
    expect(document.querySelector<HTMLInputElement>("#agree")!.checked).toBe(false);
  });

  it("input/change イベントが発火する（React 等の制御コンポーネント対応）", () => {
    fillForm();
    const fields = captureFields();
    document.body.innerHTML = FORM_HTML;

    const events: string[] = [];
    const name = document.querySelector<HTMLInputElement>("#name")!;
    name.addEventListener("input", () => events.push("input"));
    name.addEventListener("change", () => events.push("change"));

    applyFields(fields);
    expect(events).toContain("input");
    expect(events).toContain("change");
  });
});

describe("フォーム構成変化への耐性", () => {
  beforeEach(() => {
    document.body.innerHTML = FORM_HTML;
  });

  it("なくなった入力欄はエラーにせずスキップし、残りは適用する", () => {
    fillForm();
    const fields = captureFields();

    // #name と radio を撤去した新構成
    document.body.innerHTML = FORM_HTML;
    document.querySelector("#name")!.remove();
    document.querySelectorAll('input[name="color"]').forEach((el) => el.remove());

    const remaining = applyFields(fields);
    // 消えたフィールドだけが未適用として返る
    expect(remaining.length).toBe(3);
    // 残っている要素にはちゃんと適用されている
    expect(document.querySelector<HTMLTextAreaElement>("#memo")!.value).toBe("メモ\n2行目");
    expect(document.querySelector<HTMLSelectElement>("#pref")!.value).toBe("osaka");
  });

  it("保存後に新設された入力欄はデフォルトのまま触らない", () => {
    fillForm();
    const fields = captureFields();

    document.body.innerHTML = FORM_HTML;
    const extra = document.createElement("input");
    extra.id = "new-field";
    extra.value = "デフォルト値";
    document.querySelector("form")!.append(extra);

    applyFields(fields);
    expect(document.querySelector<HTMLInputElement>("#new-field")!.value).toBe("デフォルト値");
  });

  it("保存時の選択肢が消えた select は現状維持", () => {
    fillForm();
    const fields = captureFields();

    document.body.innerHTML = FORM_HTML;
    const pref = document.querySelector<HTMLSelectElement>("#pref")!;
    pref.querySelector('option[value="osaka"]')!.remove();
    pref.value = "tokyo";

    applyFields(fields);
    expect(pref.value).toBe("tokyo");
  });
});
