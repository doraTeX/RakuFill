# Publishing To The Chrome Web Store

Steps for publishing RakuFill to the Chrome Web Store.

Japanese version: [PUBLISHING.ja.md](PUBLISHING.ja.md)

## 1. Register As A Developer

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) and sign in with a Google account.
2. Pay the one-time developer registration fee.
3. Set the developer name shown on the public listing.

## 2. Prepare Store Assets

The built `dist/` package is not enough by itself. Prepare:

- **Icon**: the 128x128 store icon is available at [store-assets/icon-128.png](../store-assets/icon-128.png). Regenerate with `npm run icons` if needed.
- **Screenshots**: at least one 1280x800 or 640x400 screenshot. Capture the RakuFill bar and/or dashboard in actual use.
- **Promotional tile**: optional but recommended, 440x280.
- **Listing text**: English draft: [STORE_LISTING.md](STORE_LISTING.md). Japanese draft: [STORE_LISTING.ja.md](STORE_LISTING.ja.md).
- **Privacy policy URL**: Chrome Web Store requires a privacy policy because RakuFill uses `host_permissions: ["<all_urls>"]` and `storage`. English policy: [PRIVACY_POLICY.md](PRIVACY_POLICY.md). Japanese policy: [PRIVACY_POLICY.ja.md](PRIVACY_POLICY.ja.md).

## 3. Manifest Checklist

Check [src/manifest.ts](../src/manifest.ts):

- `version` is `1.0.0`.
- `<all_urls>` host permissions are required because users can save and restore forms on arbitrary websites. Explain this clearly in the single-purpose and permission-justification fields.
- `tabs` permission is not used. SPA URL changes are detected in the content script through `history.pushState` / `replaceState`, `popstate`, `hashchange`, and a low-frequency URL check fallback.
- Manifest V3 is used.

## 4. Build The Upload ZIP

```sh
npm run build
cd dist && zip -r ../rakufill.zip . && cd ..
```

Upload this ZIP. `node_modules` and source files are not included in `dist/`.

## 5. Create The Store Item

1. Choose "New item" and upload the ZIP.
2. Fill in the store listing: description, screenshots, category "Productivity", and locale text. Use [STORE_LISTING.md](STORE_LISTING.md) and [STORE_LISTING.ja.md](STORE_LISTING.ja.md).
3. Fill in privacy practices and the privacy policy URL. RakuFill does not send saved data to the developer's server, but it handles form input values and can save password fields if the user explicitly enables that setting.
4. Fill in the single-purpose statement and permission justifications for `storage`, `contextMenus`, and `host_permissions`.
5. Choose public, unlisted, or trusted-tester distribution.

## 6. Review And Release

- Review usually takes several hours to several business days. Broad host permissions can make review longer.
- If the item is rejected, address the review comments and resubmit.
- Once approved, the item is published automatically or waits for manual publishing, depending on the dashboard setting.

## Note: Private Use

For personal use, public listing is not necessary. You can load `dist/` in developer mode on each Chrome profile. Cloud sync works if the same Google account and Chrome extension sync are enabled. Unlisted distribution is also possible if you want a lower-profile store item.
