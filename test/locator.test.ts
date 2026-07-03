import { beforeEach, describe, expect, it } from "vitest";
import { buildLocator, collectFormElements, resolveLocator } from "../src/content/locator";

describe("locator", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("id があれば id で特定する", () => {
    document.body.innerHTML = `<input id="email" name="email" />`;
    const el = document.querySelector("input")!;
    const locator = buildLocator(el);
    expect(locator).toEqual({ id: "email" });
    expect(resolveLocator(locator)).toBe(el);
  });

  it("id がなければ name + 出現順で特定する", () => {
    document.body.innerHTML = `
      <input name="item" value="a" />
      <input name="item" value="b" />
    `;
    const [first, second] = [...document.querySelectorAll("input")];
    const loc2 = buildLocator(second);
    expect(loc2).toEqual({ name: "item", nameIndex: 1 });
    expect(resolveLocator(loc2)).toBe(second);
    expect(resolveLocator(buildLocator(first))).toBe(first);
  });

  it("radio は name + value で特定する", () => {
    document.body.innerHTML = `
      <input type="radio" name="color" value="red" />
      <input type="radio" name="color" value="blue" />
    `;
    const blue = document.querySelector<HTMLInputElement>('input[value="blue"]')!;
    const locator = buildLocator(blue);
    expect(locator).toEqual({ name: "color", radioValue: "blue" });
    expect(resolveLocator(locator)).toBe(blue);
  });

  it("id も name もない要素は CSS パスで特定する", () => {
    document.body.innerHTML = `
      <div><textarea></textarea></div>
      <div><textarea></textarea></div>
    `;
    const second = document.querySelectorAll("textarea")[1];
    const locator = buildLocator(second);
    expect(locator.css).toBeTruthy();
    expect(resolveLocator(locator)).toBe(second);
  });

  it("見つからない特定子は null（スキップ用）", () => {
    document.body.innerHTML = `<input id="a" />`;
    expect(resolveLocator({ id: "gone" })).toBeNull();
    expect(resolveLocator({ name: "gone", nameIndex: 0 })).toBeNull();
    expect(resolveLocator({ css: "form > input:nth-of-type(9)" })).toBeNull();
    expect(resolveLocator({ css: ":::bad-selector" })).toBeNull();
  });

  it("RakuFill 自身の UI 内の要素は収集しない", () => {
    document.body.innerHTML = `
      <input id="page-input" />
      <div data-rakufill-ui><input id="bar-input" /></div>
    `;
    const els = collectFormElements();
    expect(els.map((e) => e.id)).toEqual(["page-input"]);
  });
});
