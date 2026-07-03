import type { Profile } from "../shared/types";
import { t } from "../shared/i18n";

export interface BarCallbacks {
  onSaveRequested(name: string): void | Promise<void>;
  onProfileSelected(profileId: string): void | Promise<void>;
  onDashboardRequested(): void;
}

let host: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let callbacks: BarCallbacks | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const STYLE = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif; }
.bar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
  display: flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 12px;
  background: #312e81; color: #fff;
  font-size: 13px; line-height: 1;
  box-shadow: 0 2px 8px rgba(0,0,0,.25);
}
.brand { font-weight: 700; letter-spacing: .02em; white-space: nowrap; }
.brand .accent { color: #fbbf24; }
select {
  flex: 0 1 260px; min-width: 120px; height: 26px;
  border: none; border-radius: 4px; padding: 0 6px;
  background: #eef2ff; color: #1e1b4b; font-size: 13px;
}
button {
  height: 26px; padding: 0 12px; border: none; border-radius: 4px;
  background: #6366f1; color: #fff; font-size: 13px; cursor: pointer; white-space: nowrap;
}
button:hover { background: #818cf8; }
button.ghost { background: transparent; color: #c7d2fe; }
button.ghost:hover { background: rgba(255,255,255,.12); color: #fff; }
button.close { padding: 0 8px; font-size: 15px; }
.spacer { flex: 1; }
.save-panel {
  position: fixed; top: 44px; right: 12px; z-index: 2147483647;
  display: flex; align-items: center; gap: 6px;
  padding: 10px 12px; border-radius: 8px;
  background: #fff; color: #1e1b4b;
  box-shadow: 0 4px 16px rgba(0,0,0,.3); font-size: 13px;
}
.save-panel input {
  width: 220px; height: 28px; padding: 0 8px;
  border: 1px solid #a5b4fc; border-radius: 4px; font-size: 13px; color: #1e1b4b;
}
.save-panel button.cancel { background: #e5e7eb; color: #374151; }
.save-panel button.cancel:hover { background: #d1d5db; }
.toast {
  position: fixed; top: 48px; left: 50%; transform: translateX(-50%);
  z-index: 2147483647; padding: 8px 16px; border-radius: 6px;
  background: rgba(30, 27, 75, .95); color: #fff; font-size: 13px;
  opacity: 0; transition: opacity .2s;
}
.toast.show { opacity: 1; }
.hidden { display: none !important; }
`;

export function initBar(cb: BarCallbacks): void {
  callbacks = cb;
}

function ensureBar(): ShadowRoot {
  if (shadow) return shadow;
  host = document.createElement("div");
  host.setAttribute("data-rakufill-ui", "");
  shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLE;
  shadow.append(style);

  const bar = document.createElement("div");
  bar.className = "bar hidden";
  bar.part = "bar";

  const brand = document.createElement("span");
  brand.className = "brand";
  brand.innerHTML = `Raku<span class="accent">Fill</span>`;

  const select = document.createElement("select");
  select.id = "profiles";
  select.addEventListener("change", () => {
    if (select.value) void callbacks?.onProfileSelected(select.value);
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = t("barSave");
  saveBtn.addEventListener("click", () => openSavePanel());

  const dashBtn = document.createElement("button");
  dashBtn.className = "ghost";
  dashBtn.textContent = t("dashboard");
  dashBtn.addEventListener("click", () => callbacks?.onDashboardRequested());

  const spacer = document.createElement("div");
  spacer.className = "spacer";

  const closeBtn = document.createElement("button");
  closeBtn.className = "ghost close";
  closeBtn.title = t("barCloseTitle");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => hideBar());

  bar.append(brand, select, saveBtn, spacer, dashBtn, closeBtn);
  shadow.append(bar);
  document.documentElement.append(host);
  return shadow;
}

export function showBar(): void {
  ensureBar().querySelector(".bar")?.classList.remove("hidden");
}

export function hideBar(): void {
  shadow?.querySelector(".bar")?.classList.add("hidden");
  closeSavePanel();
}

export function isBarVisible(): boolean {
  return !!shadow && !shadow.querySelector(".bar")?.classList.contains("hidden");
}

export function toggleBar(): void {
  if (isBarVisible()) hideBar();
  else showBar();
}

/** プルダウンの中身を最新のプロファイル一覧で更新する */
export function setProfiles(profiles: Profile[], lastUsedProfileId: string | null): void {
  const select = ensureBar().querySelector<HTMLSelectElement>("#profiles");
  if (!select) return;
  select.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("barSelectPlaceholder");
  placeholder.disabled = true;
  select.append(placeholder);
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    select.append(option);
  }
  select.value = lastUsedProfileId ?? "";
  if (!select.value) placeholder.selected = true;
}

function defaultProfileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t("saveDefaultNamePrefix")} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function openSavePanel(): void {
  const root = ensureBar();
  closeSavePanel();

  const panel = document.createElement("div");
  panel.className = "save-panel";

  const label = document.createElement("label");
  label.textContent = t("savePromptLabel");

  const input = document.createElement("input");
  input.type = "text";
  input.value = defaultProfileName();

  const ok = document.createElement("button");
  ok.textContent = t("saveConfirm");
  const submit = () => {
    const name = input.value.trim() || defaultProfileName();
    closeSavePanel();
    void callbacks?.onSaveRequested(name);
  };
  ok.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") closeSavePanel();
  });

  const cancel = document.createElement("button");
  cancel.className = "cancel";
  cancel.textContent = t("saveCancel");
  cancel.addEventListener("click", () => closeSavePanel());

  panel.append(label, input, ok, cancel);
  root.append(panel);
  input.focus();
  input.select();
}

function closeSavePanel(): void {
  shadow?.querySelector(".save-panel")?.remove();
}

export function showToast(message: string): void {
  const root = ensureBar();
  let toast = root.querySelector<HTMLDivElement>(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    root.append(toast);
  }
  toast.textContent = message;
  // 再表示時にトランジションが確実に効くよう一拍置く
  requestAnimationFrame(() => toast!.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast!.classList.remove("show"), 2500);
}
