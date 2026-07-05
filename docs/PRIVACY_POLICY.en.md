# RakuFill Privacy Policy

Last updated: 2026-07-05

RakuFill is a Google Chrome extension for saving and restoring form input snapshots. This policy explains what data the extension handles and where it is stored.

## Information Handled

RakuFill does **not** send saved form data to the developer's server or to any third-party server. It does not perform external network communication for saved data.

RakuFill handles only the following data:

- The URL of pages where the user saves a snapshot (origin + path)
- Values of form elements on those pages, such as text inputs, textareas, checkboxes, radio buttons, and select boxes
- Password field values (`type="password"`) only when the user explicitly enables "Allow saving password fields" in the dashboard
- Snapshot names and optional display names assigned to URLs by the user
- Extension settings, such as auto-apply, password-field saving, and cloud sync

`type="file"` and `type="hidden"` fields are never saved. Password fields are excluded by default and are saved only when explicitly enabled by the user.

## Storage Location

All data is stored through Chrome extension storage APIs:

- `chrome.storage.local`: stored locally on the user's device.
- `chrome.storage.sync`: used only when the user enables Cloud sync. Cloud sync is off by default. When enabled, data is associated with the user's signed-in Google account and synchronized by Chrome's built-in sync mechanism.

The developer does not operate an independent server to collect or store this data.

The dashboard also provides export/import features for JSON backup files. These are local file operations initiated by the user.

## Sharing With Third Parties

RakuFill does not share, sell, or provide saved data to third parties. It does not include advertising, analytics, or tracking features.

## Data Deletion

Users can delete saved snapshots or all data for a URL from the dashboard. Uninstalling the extension removes data stored in `chrome.storage.local`; data in `chrome.storage.sync` follows Chrome's sync behavior.

## Permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Save and load snapshots and extension settings. |
| `contextMenus` | Add a Dashboard item to the toolbar icon context menu. |
| `host_permissions` (`<all_urls>`) | Read and write form fields on pages selected by the user. This broad access is required because users can save and restore forms on arbitrary websites. |

## Contact

For questions about RakuFill, contact:

- taylorkgb@gmail.com
