---
name: iedi-setup
description: "IEDI_WORKSPACEをワークスペースのトップディレクトリに設定する。.claude/settings.local.jsonのenv.IEDI_WORKSPACEを書き込む。初回セットアップ時またはワークスペース変更時に実行する。"
---

# IEDI Setup

`IEDI_WORKSPACE` 環境変数をワークスペースのトップディレクトリに設定する。
`.claude/settings.local.json` の `env.IEDI_WORKSPACE` を追加・更新する。

IEDI スキル（`/iedi-start`・`/iedi-end`・`/iedi-capture`・`/log-iedi-session`）は
この env var を使用して `.iedi/` ディレクトリの場所を決定する。

---

## Instructions

### Step 1: ワークスペースパスの検出と確認

現在のワークスペースパスを取得する:
```bash
pwd
```

取得したパスをユーザーに確認する:
> ワークスペースパスを **{path}** に設定します。よろしいですか？
> 問題なければ「OK」、変更する場合はパスを入力してください。

ユーザーの回答から最終パス（`WORKSPACE_PATH`）を確定する。

---

### Step 2: .claude/settings.local.json の更新

`.claude/settings.local.json` を Read tool で読み込む。
ファイルが存在しない場合は `{}` として扱う。

既存の JSON の `env` キーに `IEDI_WORKSPACE` を追加・更新して Write tool で保存する。
`env` キーが存在しない場合は新規作成する。他のキーは変更しないこと。

---

### Step 3: 完了報告

次の形式で報告する:
```
IEDI_WORKSPACE を設定しました
  path: {WORKSPACE_PATH}
  file: .claude/settings.local.json

Claude Code を再起動するか、新しいセッションを開始すると有効になります。
```
