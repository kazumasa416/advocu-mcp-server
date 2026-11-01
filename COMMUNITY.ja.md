# Advocu MCP Server コミュニティ版（GDE 向け）導入ガイド

このフォーク（`kazumasa416/advocu-mcp-server`）は、日本の GDE が Claude Desktop から Advocu に活動を登録・確認するためのコミュニティ版です。

> **公式版ではありません。** Google・Advocu・上流リポジトリ（[carlosazaustre/advocu-mcp-server](https://github.com/carlosazaustre/advocu-mcp-server)）の公式な配布物ではありません。
> ここに含まれる改善は、上流に PR として順に提案しています。取り込まれた変更は、上流の版でも使えるようになります。

## 対応している機能

| 機能 | ツール名 | 状態 |
|---|---|---|
| 活動の下書き登録（7 種類） | `submit_gde_content_creation`、`submit_gde_public_speaking`、`submit_gde_workshop`、`submit_gde_mentoring`、`submit_gde_product_feedback`、`submit_gde_googler_interaction`、`submit_gde_story` | 公式の Personal API 資料（2026-11-01 確認）に合わせた入力項目。すべて任意で、足りない項目はポータルで補ってから提出する |
| 登録済み活動の一覧取得 | `list_gde_activities` | 1 回の呼び出しで 1 ページを取得。提出日（`from`／`to`）と更新日（`updatedAfter`）で絞り込める |
| 説明書の参照 | `list_documentation`、`get_documentation` | `DOCS_DIR` の設定が必要 |

- API がエラーを返したときは、ツールの呼び出しが失敗として返ります。
- 登録した活動は **下書き** として保存されます。内容はポータルで確認してから提出してください。
- Microsoft MVP 向けのツールは上流と同じで、このコミュニティ版では変更・確認をしていません。

## 未対応・未確認の事項

- **未対応：** 登録済み活動の更新、一覧の全件自動取得、npm パッケージでの配布。
- **未確認：**
  - タグのうち `Cloud - BigQuery ` と `Cloud - Conversational Data Analytics ` は、公式資料では末尾に空白が付いています。空白なしでも受け付けられるかは確認していません。
  - `country` に入れる値の形式（例：`Japan`）。公式資料には文字数の制限しか書かれていません。
  - この版の下書き登録ツールは、実際の Advocu API ではなく模擬 API で確認しています（エラー時の扱い、引数を省略したときの送信内容、送り先）。
  - 一覧取得は、配布者のアカウントで実際の API から読み取れることを、Claude Desktop 上でも確認しています。

## 動作確認した環境

| 項目 | 確認済み | 未確認 |
|---|---|---|
| OS | macOS 15.8.1（Apple Silicon） | Windows、Linux、Intel Mac |
| Node.js | v24.22.1（全手順）、v20.20.2（`npm run build:clean` と `npm run verify:build` のみ） | v18、v22、v20 での `npm ci` |
| npm | 11.19.1（`npm ci`、ビルド、起動確認）、10.9.9（`npm ci --dry-run` のみ） | 上記以外 |
| MCP クライアント | この版は MCP の stdio 接続で起動・ツール一覧・一覧取得を確認。Claude Desktop（macOS）でも、この版の一覧取得を確認。下書き登録は以前の版での利用実績のみ | この版の Claude Desktop 上での下書き登録、Claude Code CLI ほかのクライアント |

## 導入手順

### 1. 取得とビルド

Git、Node.js、npm が必要です。確認済みのタグ（ここでは `gde-community-v1`）を指定して取得します。

```bash
git clone --branch gde-community-v1 https://github.com/kazumasa416/advocu-mcp-server.git advocu-mcp-server-gde
cd advocu-mcp-server-gde
npm ci
npm run build:clean
npm run verify:build
```

- `npm run build:clean` は、`dist/` と差分ビルドの記録（`tsconfig.tsbuildinfo`）を消してからビルドし直します。
- `npm run verify:build` は、ビルドしたサーバーをダミーのトークンで起動し、ツール一覧と説明書の読み込みを確認します。Advocu の API には接続しません。最後に `✅ verification passed` と表示されれば成功です。
- `npm ci` やビルドの途中で警告が表示されることがあります（確認時にも表示されました）。エラーで終了した場合や、`✅ verification passed` が表示されない場合は、先へ進まず内容を確認してください。

### 2. Advocu のトークンを用意する

1. [Advocu](https://app.advocu.com/) にログインし、Google Developer Experts のワークスペースに入ります。
2. Settings → Integrations → API（Advocu Personal API）を開き、API トークンを発行します。

トークンは自分専用です。他の人に渡したり、リポジトリや画面共有に含めたりしないでください。

### 3. Claude Desktop に登録する

**先に Claude Desktop を完全に終了します**（macOS は Cmd+Q）。起動したまま編集すると、変更が元に戻ることがあります。終了したら、設定ファイルをテキストエディターで開きます。

- macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows：`%APPDATA%\Claude\claude_desktop_config.json`（未確認）

`mcpServers` に次を追加します。`<...>` の部分は自分の環境に置き換えてください。

```json
{
  "mcpServers": {
    "advocu": {
      "command": "<node の絶対パス>",
      "args": ["<取得したフォルダ>/dist/index.js"],
      "env": {
        "ADVOCU_ACCESS_TOKEN": "<2 で発行したトークン>",
        "DOCS_DIR": "<取得したフォルダ>/docs"
      }
    }
  }
}
```

- `command` には `which node`（macOS）で表示される絶対パスを指定すると確実です。
- パスはすべて絶対パスで書いてください（`~` は使えません）。
- `DOCS_DIR` を省略すると、説明書を読むツールが使えません。
- 設定ファイルにはトークンが入るので、共有しないでください。

### 4. 再起動して確認する

設定ファイルを保存してから Claude Desktop を起動します。新しい会話で「`list_gde_activities` で Advocu の登録済み活動を 1 ページ見せて」などと頼み、ツールが使えれば導入完了です。

ツールが見つからない場合は、Claude Desktop を完全に終了し、設定ファイルに `advocu` の項目と正しいパスが残っているかを確認してください。

## 更新・切り戻し

新しい確認済みタグ（例：`gde-community-v2`）が出たら、取得したフォルダで次を実行し、Claude Desktop を再起動します。

```bash
git fetch --tags
git checkout gde-community-v2
npm ci
npm run build:clean
npm run verify:build
```

前の版に戻すときは、`git checkout` に前のタグを指定して同じ手順を実行します。

`dist/` だけを手で消して `npm run build` すると、差分ビルドの記録が残るため、変更したファイルしか出力されず起動できなくなることがあります。更新のときは `npm run build:clean` を使ってください。

## アンインストール

Claude Desktop を完全に終了してから設定ファイルの `advocu` の項目を削除し、Claude Desktop を起動し直します。そのあと、取得したフォルダを削除します。

## ライセンス

上流と同じ MIT License です。著作権表示は [LICENSE](LICENSE) のとおりです。
