# Chrome ウェブストアへの公開手順

RakuFill を Chrome ウェブストアで公開するまでの手順。

## 1. デベロッパー登録（初回のみ）

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセスし、Google アカウントでログイン
2. **$5 の登録料**を一度だけ支払う（クレジットカード）
3. デベロッパー名（公開ページに表示される発行者名）を設定

## 2. ストア掲載用の素材を準備

現状の `dist/` はそのままでは足りないので、以下を用意する。

- **アイコン**: ストア掲載用の 128×128 高解像度アイコンは [store-assets/icon-128.png](../store-assets/icon-128.png) として用意済み（`npm run icons` で再生成可能）
- **スクリーンショット**: 1280×800 または 640×400 を**最低 1 枚**（実際にバーやダッシュボードが動いている画面を撮ると良い、構図案は [docs/STORE_LISTING.ja.md](STORE_LISTING.ja.md) 参照）※要撮影、未作成
- **プロモタイル**（任意だが推奨）: 440×280 の小タイル ※未作成
- **説明文**: 英語ドラフトは [docs/STORE_LISTING.md](STORE_LISTING.md)、日本語ドラフトは [docs/STORE_LISTING.ja.md](STORE_LISTING.ja.md) に用意済み
- **プライバシーポリシーの URL**: `host_permissions: ["<all_urls>"]` や `storage` 権限を使っているため、Chrome Web Store は**プライバシーポリシーの提出を要求**する。英語文面は [docs/PRIVACY_POLICY.md](PRIVACY_POLICY.md)、日本語文面は [docs/PRIVACY_POLICY.ja.md](PRIVACY_POLICY.ja.md) を GitHub Pages 等でホストして URL を用意する

## 3. マニフェストの公開用調整

[src/manifest.ts](../src/manifest.ts) で確認・調整する。

- `version` は `1.0.0`
- `<all_urls>` の `host_permissions` は審査で**理由の説明を求められやすい**項目。審査時の「単一目的の説明」欄に「ユーザー自身が任意のページでフォーム入力を保存・復元するため、全サイトへのアクセスが必要」と明記する
- `tabs` 権限は使用しない。SPA の URL 変化は content script 側で `history.pushState` / `replaceState` / `popstate` / `hashchange` と低頻度の URL 確認フォールバックで監視する
- `manifest_version: 3` は既に対応済み（MV2 は新規審査が通らないため必須）

## 4. パッケージ作成

```sh
npm run build
cd dist && zip -r ../rakufill.zip . && cd ..
```

この ZIP をそのままアップロードする（`node_modules` 等は `dist/` に含まれないので問題なし）。

## 5. Developer Dashboard でアイテム作成

1. 「新しいアイテム」→ ZIP をアップロード
2. ストア掲載情報（説明・スクリーンショット・カテゴリ「生産性」など）を入力。英語文面は [docs/STORE_LISTING.md](STORE_LISTING.md)、日本語文面は [docs/STORE_LISTING.ja.md](STORE_LISTING.ja.md) のドラフトを利用可能
3. プライバシー慣行タブで、収集データの有無とプライバシーポリシー URL を入力。保存データは開発者サーバーへ送らないが、フォーム入力値を扱い、設定次第でパスワード欄も保存され得る点を説明とポリシー URL で明示する
4. 単一目的の説明、権限の正当化理由（`storage`/`contextMenus`/`host_permissions`）を記入。文面ドラフトは [docs/STORE_LISTING.md](STORE_LISTING.md) / [docs/STORE_LISTING.ja.md](STORE_LISTING.ja.md) の該当節を参照
5. 公開範囲（全ユーザー公開 / 限定公開 / 自分のみのテスト）を選択

## 6. 審査・公開

- 提出後、審査には**数時間〜数営業日**（`<all_urls>` のような広い権限があると長引きやすい）
- 差し戻された場合は指摘内容に従って修正・再提出
- 承認されると自動で公開される（または「公開」ボタンを手動で押す設定も可）

## 補足: 個人利用だけなら公開不要

「デベロッパーモードで `dist/` を読み込む」現状のままでも、別端末で同じ Google アカウントの Chrome に同じ手順でインストールすれば動作する（クラウド同期も含めて機能する）。ストア公開が必要なのは「他人に配りたい」「デベロッパーモード無効の環境で使いたい」場合。個人限定なら Developer Dashboard の「**限定公開（Unlisted）**」にして自分の Google アカウントのみに配布する方法もあり、審査は必要だが心理的ハードルは下がる。
