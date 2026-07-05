import { describe, expect, it } from "vitest";
import { isSubmitEnter } from "../src/shared/keyboard";

function enterEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key: "Enter", ...overrides });
}

describe("isSubmitEnter", () => {
  it("通常の Enter は確定とみなす", () => {
    expect(isSubmitEnter(enterEvent())).toBe(true);
  });

  it("IME 変換確定中の Enter（isComposing）は確定とみなさない", () => {
    const e = enterEvent({ isComposing: true });
    expect(isSubmitEnter(e)).toBe(false);
  });

  it("IME 処理中を示す keyCode 229 の Enter は確定とみなさない", () => {
    const e = new KeyboardEvent("keydown", { key: "Enter", keyCode: 229 } as KeyboardEventInit);
    expect(isSubmitEnter(e)).toBe(false);
  });

  it("Enter 以外のキーは確定とみなさない", () => {
    expect(isSubmitEnter(new KeyboardEvent("keydown", { key: "a" }))).toBe(false);
  });
});
