/** 要素をページ内で特定するための情報。優先順: id → name(+index) → css パス */
export interface Locator {
  id?: string;
  name?: string;
  /** 同じ name を持つ要素が複数あるときの出現順。radio では value で特定するため不使用 */
  nameIndex?: number;
  /** radio の特定用。name + value の組で一意になる */
  radioValue?: string;
  css?: string;
}

export type FieldKind =
  | "text"
  | "checkbox"
  | "radio"
  | "select"
  | "select-multiple"
  | "textarea";

export interface FieldRecord {
  locator: Locator;
  kind: FieldKind;
  /** text 系・select の値 */
  value?: string;
  /** checkbox / radio の選択状態 */
  checked?: boolean;
  /** select-multiple で選択されている option の value 一覧 */
  values?: string[];
}

export interface Profile {
  id: string;
  name: string;
  savedAt: number;
  fields: FieldRecord[];
}

export interface SiteEntry {
  /** 配列順がダッシュボードでの表示順 */
  profiles: Profile[];
  lastUsedProfileId: string | null;
  /** ダッシュボードでの表示名（愛称）。未設定なら URL そのものを表示する */
  alias?: string;
}

export interface Settings {
  autoApplyEnabled: boolean;
  savePasswordsEnabled: boolean;
}

export interface StoreData {
  settings: Settings;
  sites: Record<string, SiteEntry>;
}

export const DEFAULT_SETTINGS: Settings = {
  autoApplyEnabled: true,
  savePasswordsEnabled: false,
};

/** background ↔ content script 間のメッセージ */
export type Message =
  | { type: "TOGGLE_BAR" }
  | { type: "OPEN_DASHBOARD" };
