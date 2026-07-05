# RakuFill

RakuFill is a Chrome extension that saves named snapshots of form inputs per URL and restores them with one click. When you open a page with saved data, RakuFill can show a small top bar and optionally apply the last-used snapshot automatically.

Japanese README: [README.md](README.md)

## Features

- **Save snapshots**: click the toolbar icon, open the top bar, and save the current form state with a name.
- **Restore snapshots**: choose a saved snapshot from the bar to apply it immediately.
- **Auto-apply**: when a saved page is opened, RakuFill can automatically apply the last-used snapshot. This can be turned off in the dashboard.
- **Dashboard**: manage saved URLs and snapshots, rename, duplicate, delete, reorder, edit JSON directly, assign display names to URLs, and filter by URL, display name, or snapshot name.
- **Password fields**: password fields are not saved by default. They are included only when the dashboard setting "Allow saving password fields" is explicitly enabled.
- **Cloud sync**: sync saved data and settings through Chrome's `chrome.storage.sync` when enabled. Cloud sync is off by default.
- **Import/export**: export all settings and saved snapshots as a JSON backup, or import a backup to replace the current data.
- **Localization**: Japanese UI is shown in Japanese Chrome environments; other locales fall back to English.

## Development

```sh
npm install
npm run build
npm test
npm run icons
```

## Privacy And Data Handling

RakuFill stores data only in Chrome extension storage: `chrome.storage.local`, and `chrome.storage.sync` when cloud sync is enabled. It does not send saved form data to the developer's server or to any third-party server.

Password fields are excluded by default. If you enable "Allow saving password fields", password field values can be saved in plain text like other form values. Be careful on shared computers and when cloud sync is enabled.

Saved fields include ordinary `input` fields, `textarea`, and `select` elements. `type=file` and `type=hidden` are always excluded. `type=password` is excluded unless explicitly enabled.

## Scope Outside v1

- iframe forms
- `contenteditable`
- page-side Shadow DOM forms

## License

MIT License
