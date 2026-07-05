# Chrome Web Store Listing Draft

Draft text for the Chrome Web Store Developer Dashboard.

## Short Description

> Save named snapshots of form inputs per URL and restore them with one click. Optional cloud sync and password-field saving are user-controlled.

## Detailed Description

```text
RakuFill saves named snapshots of web form inputs per URL and restores them with one click.

If you often fill out similar forms, test forms, application forms, or contact forms, RakuFill lets you save each input pattern with a name and restore it later from a small top bar.

Main features:

- Save form snapshots: click the toolbar icon, open the RakuFill bar, and save the current form state with a name.
- Restore with one click: choose a saved snapshot from the dropdown to apply it immediately.
- Auto-show and auto-apply: when a page has saved snapshots, RakuFill can show the bar automatically and apply the last-used snapshot. Auto-apply can be disabled in the dashboard.
- Dashboard: rename, duplicate, delete, and reorder snapshots. You can also assign display names to URLs and search by URL, display name, or snapshot name.
- Import/export: export all saved data and settings as one JSON backup file, or import a backup to replace the current data.
- Cloud sync: sync saved data and settings through Chrome sync when enabled. Cloud sync is off by default and can be enabled or disabled in the dashboard.
- Password-field setting: password fields are not saved by default. They can be included only when the user explicitly enables "Allow saving password fields" in the dashboard.
- Localization: Japanese UI is shown in Japanese Chrome environments; other locales use English UI.

Privacy:

RakuFill does not send saved form data to the developer's server or to any third-party server. Data is stored in Chrome extension storage, and in Chrome sync only when the user enables Cloud sync. Password fields are excluded by default and are saved only if the user explicitly enables that setting. RakuFill does not include ads, analytics, or tracking.

See the privacy policy for details.
```

## Category

- Productivity

## Languages

- Default locale: English
- Japanese locale included

## Screenshot Ideas

1. A filled form with the RakuFill top bar visible.
2. The save panel for naming a snapshot.
3. The dashboard with saved URLs, snapshots, settings, and the JSON editor.
4. The dashboard filter and duplicate action.

Recommended sizes: 1280x800 or 640x400.

## Permission Justifications

| Permission | Draft justification |
| --- | --- |
| `storage` | Used to save and load user-created form snapshots and extension settings. |
| `contextMenus` | Used to add a Dashboard item to the toolbar icon context menu. |
| `host_permissions` (`<all_urls>`) | RakuFill's core purpose is to read and restore form inputs on arbitrary pages chosen by the user. The target websites cannot be known in advance, so broad host access is required. Password fields are excluded by default and are saved only if the user explicitly enables that setting. Saved data is not sent to the developer or to third-party servers. |

## Single Purpose Statement

> RakuFill's single purpose is to let users save named snapshots of web form inputs and restore them later on the same page. Password fields are excluded by default and can be included only when the user explicitly enables that setting.
