import type { Profile, SiteEntry } from "../shared/types";
import {
  deleteSite,
  exportBackup,
  getSettings,
  getSites,
  getSyncEnabled,
  getSyncError,
  importBackup,
  onStoreChanged,
  setSettings,
  setSite,
  setSyncEnabled,
} from "../shared/storage";
import { parseSiteEntry, SiteEntryShapeError } from "../shared/site-entry";
import { parseBackup } from "../shared/backup";
import { t } from "../shared/i18n";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const autoApplyCheckbox = $<HTMLInputElement>("auto-apply");
const savePasswordsCheckbox = $<HTMLInputElement>("save-passwords");
const syncEnabledCheckbox = $<HTMLInputElement>("sync-enabled");
const syncErrorText = $<HTMLParagraphElement>("sync-error");
const exportBtn = $<HTMLButtonElement>("export-btn");
const importBtn = $<HTMLButtonElement>("import-btn");
const importFileInput = $<HTMLInputElement>("import-file");
const siteFilter = $<HTMLInputElement>("site-filter");
const siteList = $<HTMLUListElement>("site-list");
const noSites = $<HTMLParagraphElement>("no-sites");
const noFilterMatch = $<HTMLParagraphElement>("no-filter-match");
const selectSitePrompt = $<HTMLParagraphElement>("select-site-prompt");
const siteDetail = $<HTMLDivElement>("site-detail");
const siteUrlHeading = $<HTMLHeadingElement>("site-url");
const siteAliasInput = $<HTMLInputElement>("site-alias");
const deleteSiteBtn = $<HTMLButtonElement>("delete-site");
const profileList = $<HTMLUListElement>("profile-list");
const jsonEditor = $<HTMLTextAreaElement>("json-editor");
const jsonError = $<HTMLParagraphElement>("json-error");

let selectedUrlKey: string | null = null;
let jsonDebounce: ReturnType<typeof setTimeout> | undefined;
let aliasDebounce: ReturnType<typeof setTimeout> | undefined;
/** 自画面からの書き込みで再描画してカーソルを飛ばさないためのフラグ */
let writingFromEditor = false;

function applyStaticTexts(): void {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.title = t("dashboardTitle");
  $("title-suffix").textContent = t("dashboard");
  $("auto-apply-label").textContent = t("settingAutoApply");
  $("save-passwords-label").textContent = t("settingSavePasswords");
  $("sync-enabled-label").textContent = t("settingSync");
  exportBtn.textContent = t("exportLabel");
  importBtn.textContent = t("importLabel");
  $("sites-heading").textContent = t("sitesHeading");
  siteFilter.placeholder = t("filterPlaceholder");
  noSites.textContent = t("noSites");
  noFilterMatch.textContent = t("noFilterMatch");
  selectSitePrompt.textContent = t("selectSitePrompt");
  $("alias-label").textContent = t("aliasLabel");
  siteAliasInput.placeholder = t("aliasPlaceholder");
  $("profiles-heading").textContent = t("profilesHeading");
  $("json-heading").textContent = t("jsonHeading");
  deleteSiteBtn.textContent = t("deleteSiteLabel");
}

function formatDate(ts: number): string {
  return Number.isFinite(ts) && ts > 0 ? new Date(ts).toLocaleString() : "";
}

/** フィルタ文字列に URL・表示名・入力状況名のいずれかが一致するか */
function matchesFilter(urlKey: string, entry: SiteEntry, filter: string): boolean {
  if (!filter) return true;
  const q = filter.toLowerCase();
  return (
    urlKey.toLowerCase().includes(q) ||
    (entry.alias ?? "").toLowerCase().includes(q) ||
    entry.profiles.some((p) => p.name.toLowerCase().includes(q))
  );
}

async function renderSiteList(): Promise<void> {
  const sites = await getSites();
  const allKeys = Object.keys(sites).sort();
  const filter = siteFilter.value.trim();
  const keys = allKeys.filter((key) => matchesFilter(key, sites[key], filter));

  siteList.replaceChildren();
  noSites.hidden = allKeys.length > 0;
  noFilterMatch.hidden = !(allKeys.length > 0 && keys.length === 0);

  if (selectedUrlKey && !sites[selectedUrlKey]) {
    selectedUrlKey = null;
  }

  for (const key of keys) {
    const entry = sites[key];
    const li = document.createElement("li");
    li.classList.toggle("selected", key === selectedUrlKey);

    const label = document.createElement("span");
    label.textContent = entry.alias || key;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = t("fieldsCount", String(entry.profiles.length));
    li.append(label, count);

    // 別名表示のときは元の URL を小さく添える
    if (entry.alias) {
      const sub = document.createElement("span");
      sub.className = "url-sub";
      sub.textContent = key;
      li.append(sub);
    }

    li.addEventListener("click", () => {
      selectedUrlKey = key;
      void render();
    });
    siteList.append(li);
  }
}

function startRename(row: HTMLLIElement, profile: Profile): void {
  const nameSpan = row.querySelector<HTMLSpanElement>(".name");
  if (!nameSpan) return;
  const input = document.createElement("input");
  input.className = "name-edit";
  input.type = "text";
  input.value = profile.name;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const commit = async () => {
    if (done) return;
    done = true;
    const newName = input.value.trim();
    if (!selectedUrlKey || !newName || newName === profile.name) {
      await render();
      return;
    }
    const sites = await getSites();
    const entry = sites[selectedUrlKey];
    const target = entry?.profiles.find((p) => p.id === profile.id);
    if (!entry || !target) return;
    target.name = newName;
    await setSite(selectedUrlKey, entry);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") void commit();
    if (e.key === "Escape") {
      done = true;
      void render();
    }
  });
  input.addEventListener("blur", () => void commit());
}

function renderProfileRow(entry: SiteEntry, profile: Profile, index: number): HTMLLIElement {
  const li = document.createElement("li");

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = profile.name;

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `${formatDate(profile.savedAt)} ・ ${t("fieldsCount", String(profile.fields.length))}`;

  li.append(name, meta);

  if (profile.id === entry.lastUsedProfileId) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = t("lastUsedBadge");
    li.append(badge);
  }

  const rename = document.createElement("button");
  rename.className = "subtle icon";
  rename.title = t("renameTitle");
  rename.textContent = "✎";
  rename.addEventListener("click", () => startRename(li, profile));

  const up = document.createElement("button");
  up.className = "subtle";
  up.textContent = `↑ ${t("moveUp")}`;
  up.disabled = index === 0;
  up.addEventListener("click", () => void moveProfile(index, -1));

  const down = document.createElement("button");
  down.className = "subtle";
  down.textContent = `↓ ${t("moveDown")}`;
  down.disabled = index === entry.profiles.length - 1;
  down.addEventListener("click", () => void moveProfile(index, 1));

  const duplicate = document.createElement("button");
  duplicate.textContent = t("duplicateLabel");
  duplicate.addEventListener("click", () => void duplicateProfile(profile.id));

  const del = document.createElement("button");
  del.className = "danger";
  del.textContent = t("deleteLabel");
  del.addEventListener("click", () => void removeProfile(profile));

  li.append(rename, up, down, duplicate, del);
  return li;
}

async function renderDetail(): Promise<void> {
  if (!selectedUrlKey) {
    siteDetail.hidden = true;
    selectSitePrompt.hidden = false;
    return;
  }
  const sites = await getSites();
  const entry = sites[selectedUrlKey];
  if (!entry) {
    siteDetail.hidden = true;
    selectSitePrompt.hidden = false;
    return;
  }
  siteDetail.hidden = false;
  selectSitePrompt.hidden = true;
  siteUrlHeading.textContent = selectedUrlKey;

  // 入力中のフィールドは上書きしない（カーソル・IME を保護）
  if (document.activeElement !== siteAliasInput) {
    siteAliasInput.value = entry.alias ?? "";
  }

  profileList.replaceChildren(
    ...entry.profiles.map((profile, i) => renderProfileRow(entry, profile, i)),
  );

  if (document.activeElement !== jsonEditor) {
    jsonEditor.value = JSON.stringify(entry, null, 2);
    jsonEditor.classList.remove("invalid");
    jsonError.hidden = true;
  }
}

async function renderSyncStatus(): Promise<void> {
  const error = await getSyncError();
  syncErrorText.hidden = error === null;
  if (error !== null) {
    syncErrorText.textContent = t("syncError", error);
  }
}

async function render(): Promise<void> {
  await renderSiteList();
  await renderDetail();
  await renderSyncStatus();
}

async function moveProfile(index: number, delta: number): Promise<void> {
  if (!selectedUrlKey) return;
  const sites = await getSites();
  const entry = sites[selectedUrlKey];
  if (!entry) return;
  const target = index + delta;
  if (target < 0 || target >= entry.profiles.length) return;
  [entry.profiles[index], entry.profiles[target]] = [entry.profiles[target], entry.profiles[index]];
  await setSite(selectedUrlKey, entry);
}

async function duplicateProfile(profileId: string): Promise<void> {
  if (!selectedUrlKey) return;
  const sites = await getSites();
  const entry = sites[selectedUrlKey];
  if (!entry) return;
  const index = entry.profiles.findIndex((p) => p.id === profileId);
  if (index === -1) return;
  const source = entry.profiles[index];
  const copy: Profile = {
    id: crypto.randomUUID(),
    name: t("copyName", source.name),
    savedAt: Date.now(),
    fields: structuredClone(source.fields),
  };
  entry.profiles.splice(index + 1, 0, copy);
  await setSite(selectedUrlKey, entry);
}

async function removeProfile(profile: Profile): Promise<void> {
  if (!selectedUrlKey) return;
  if (!confirm(t("confirmDeleteProfile", profile.name))) return;
  const sites = await getSites();
  const entry = sites[selectedUrlKey];
  if (!entry) return;
  entry.profiles = entry.profiles.filter((p) => p.id !== profile.id);
  if (entry.lastUsedProfileId === profile.id) {
    entry.lastUsedProfileId = entry.profiles[0]?.id ?? null;
  }
  await setSite(selectedUrlKey, entry);
}

siteFilter.addEventListener("input", () => {
  void renderSiteList();
});

siteAliasInput.addEventListener("input", () => {
  clearTimeout(aliasDebounce);
  aliasDebounce = setTimeout(async () => {
    const key = selectedUrlKey;
    if (!key) return;
    const sites = await getSites();
    const entry = sites[key];
    if (!entry) return;
    const alias = siteAliasInput.value.trim();
    if (alias) entry.alias = alias;
    else delete entry.alias;
    await setSite(key, entry);
  }, 400);
});

jsonEditor.addEventListener("input", () => {
  clearTimeout(jsonDebounce);
  jsonDebounce = setTimeout(async () => {
    const key = selectedUrlKey;
    if (!key) return;
    let entry: SiteEntry;
    try {
      entry = parseSiteEntry(jsonEditor.value);
    } catch (e) {
      jsonEditor.classList.add("invalid");
      jsonError.textContent =
        e instanceof SiteEntryShapeError
          ? t("jsonShapeError")
          : t("jsonParseError", e instanceof Error ? e.message : String(e));
      jsonError.hidden = false;
      return;
    }
    jsonEditor.classList.remove("invalid");
    jsonError.hidden = true;
    writingFromEditor = true;
    try {
      await setSite(key, entry);
    } finally {
      writingFromEditor = false;
    }
    // プロファイル一覧など、エディタ以外の表示は更新する
    await renderSiteList();
    const sites = await getSites();
    const updated = sites[key];
    if (updated) {
      if (document.activeElement !== siteAliasInput) {
        siteAliasInput.value = updated.alias ?? "";
      }
      profileList.replaceChildren(
        ...updated.profiles.map((p, i) => renderProfileRow(updated, p, i)),
      );
    }
  }, 500);
});

deleteSiteBtn.addEventListener("click", async () => {
  if (!selectedUrlKey) return;
  if (!confirm(t("confirmDeleteSite"))) return;
  await deleteSite(selectedUrlKey);
  selectedUrlKey = null;
});

autoApplyCheckbox.addEventListener("change", () => {
  void setSettings({
    autoApplyEnabled: autoApplyCheckbox.checked,
    savePasswordsEnabled: savePasswordsCheckbox.checked,
  });
});

savePasswordsCheckbox.addEventListener("change", () => {
  void setSettings({
    autoApplyEnabled: autoApplyCheckbox.checked,
    savePasswordsEnabled: savePasswordsCheckbox.checked,
  });
});

syncEnabledCheckbox.addEventListener("change", () => {
  // 書き込むと background がそれを検知して即座に同期（push/pull）を行う
  void setSyncEnabled(syncEnabledCheckbox.checked);
});

function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", async () => {
  const json = await exportBackup();
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  downloadJson(`rakufill-backup-${stamp}.json`, json);
});

importBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  importFileInput.value = ""; // 同じファイルを連続選択しても change が発火するようにする
  if (!file) return;

  const text = await file.text();
  let payload: ReturnType<typeof parseBackup>;
  try {
    payload = parseBackup(text);
  } catch (e) {
    alert(
      e instanceof SiteEntryShapeError
        ? t("importShapeError")
        : t("importParseError", e instanceof Error ? e.message : String(e)),
    );
    return;
  }

  if (!confirm(t("confirmImport"))) return;

  await importBackup(payload);
  selectedUrlKey = null;
  autoApplyCheckbox.checked = payload.settings.autoApplyEnabled;
  savePasswordsCheckbox.checked = payload.settings.savePasswordsEnabled;
  syncEnabledCheckbox.checked = payload.syncEnabled;
  await render();
  alert(t("importSuccess"));
});

onStoreChanged(() => {
  if (writingFromEditor) return;
  void render();
});

async function init(): Promise<void> {
  applyStaticTexts();
  const settings = await getSettings();
  autoApplyCheckbox.checked = settings.autoApplyEnabled;
  savePasswordsCheckbox.checked = settings.savePasswordsEnabled;
  syncEnabledCheckbox.checked = await getSyncEnabled();
  await render();
}

void init();
