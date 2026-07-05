# RakuFill プライバシーポリシー

最終更新日: 2026-07-03

RakuFill（以下「本拡張機能」）は、Google Chrome 用の拡張機能であり、フォームの入力状況を保存・復元する機能を提供します。本ポリシーは、本拡張機能が扱うデータの内容と取り扱いについて説明します。

## 収集する情報

本拡張機能は、**開発者や第三者のサーバーへ一切のデータを送信しません。** 外部への通信は行いません。

本拡張機能が扱うデータは以下のみです。

- ユーザーが「保存」操作を行ったページの URL（オリジン＋パス）
- そのページ内のフォーム要素（テキスト入力・テキストエリア・チェックボックス・ラジオボタン・プルダウン）の入力値
- ユーザーがダッシュボードで「パスワード欄の保存を許可する」を有効にした場合のみ、パスワード欄（`type="password"`）の入力値
- ユーザーが付けた入力状況の名前、URL に付けた表示名（愛称）
- 「保存済みページを自動適用する」等の拡張機能自体の設定値

`type="file"`（ファイル選択）および `type="hidden"`（隠しフィールド、CSRF トークン等）の入力欄は保存対象外です。`type="password"`（パスワード欄）はデフォルトでは保存対象外であり、ユーザーが明示的に設定を有効にした場合のみ保存対象になります。

## データの保存場所

すべてのデータは Chrome の拡張機能ストレージ API（`chrome.storage.local` および `chrome.storage.sync`）を通じて保存されます。

- `chrome.storage.local`: この端末上にのみ保存されます。
- `chrome.storage.sync`: ユーザーが「クラウド同期」設定を有効にした場合のみ使用されます。クラウド同期はデフォルトでは無効です。有効にした場合、このデータは Chrome にログインしている Google アカウントに紐づき、Google が提供する Chrome 同期の仕組みを通じて、同じアカウントでログインした他の端末の Chrome に同期されます。これは Chrome 標準の機能であり、本拡張機能や開発者が独自にサーバーを運用してデータを収集・保管するものではありません。

「クラウド同期」はダッシュボード画面からいつでも無効にできます。

また、ダッシュボード画面の「エクスポート」機能を使うと、上記のデータをまとめた JSON ファイルをユーザー自身の端末にダウンロードできます。「インポート」機能でそのファイルを読み込み、データを復元・移行することもできます。これらはユーザーの端末内で完結するローカルなファイル操作であり、開発者や第三者のサーバーへの送信は一切行いません。

## データの第三者提供

行いません。本拡張機能は広告表示、アクセス解析、トラッキングの機能を一切持たず、収集したデータを外部に提供・販売することもありません。

## データの削除

ダッシュボード画面から、保存済みの入力状況またはページ単位でいつでもデータを削除できます。また、Chrome の拡張機能管理画面から本拡張機能をアンインストールすると、`chrome.storage.local` に保存されたデータは端末から削除されます（`chrome.storage.sync` 上のデータは Chrome の同期設定に従います）。

## 権限について

本拡張機能は以下の権限を使用します。

| 権限 | 用途 |
| --- | --- |
| `storage` | 保存した入力状況や設定を `chrome.storage` に読み書きするため |
| `tabs` | ツールバーアイコンのクリックやページ遷移を検知し、対象タブへメッセージを送るため |
| `contextMenus` | アイコン右クリックメニューに「ダッシュボード」を表示するため |
| `host_permissions`（`<all_urls>`） | ユーザーが指定した任意のページでフォームの読み取り・書き込みを行うため（本拡張機能の中核機能に必須） |

## English Summary

RakuFill does not send saved form data to the developer's server or to any third-party server. Data is stored in Chrome extension storage: `chrome.storage.local`, and `chrome.storage.sync` only when the user enables Cloud sync. Cloud sync is off by default.

Password fields are not saved by default. They are included only when the user explicitly enables "Allow saving password fields" in the dashboard. If enabled, password field values can be saved in plain text like other form values.

## 本ポリシーの変更

本拡張機能の機能追加・変更に伴い、本ポリシーを更新する場合があります。重要な変更がある場合は、本ドキュメントの「最終更新日」を更新します。

## お問い合わせ

本拡張機能に関するご質問は、以下までご連絡ください。

- taylorkgb@gmail.com
