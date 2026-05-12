---
name: iedi-setup
description: "Configure IEDI_WORKSPACE to the workspace top directory. Writes env.IEDI_WORKSPACE to .claude/settings.local.json. Run on first setup or when changing workspaces."
---

# IEDI Setup

`IEDI_WORKSPACE` 環境変数をワークスペースのトップディレクトリに設定する。
`{IEDI_WORKSPACE}/.claude/settings.local.json` の `env.IEDI_WORKSPACE` を追加・更新する。

IEDI スキル（`/iedi-start`・`/iedi-end`・`/iedi-capture`・`/log-iedi-session`）は
この env var を使用して `.iedi/` ディレクトリの場所を決定する。

## Shell Constraint

All file operations must use Bash. Never use PowerShell for file reads/writes — its default UTF-16 LE encoding garbles Japanese text.

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

ユーザーの回答から最終パス（`IEDI_WORKSPACE`）を確定する。

---

### Step 2: {path}/.claude/settings.local.json の更新

`{path}/.claude/settings.local.json` を Read tool で読み込む。
ファイルが存在しない場合は `{}` として扱う。

既存の JSON の `env` キーに `IEDI_WORKSPACE` を追加・更新して Write tool で保存する。
`env` キーが存在しない場合は新規作成する。他のキーは変更しないこと。

---

### Step 2.5: iedi CLI の確認

AMCP スキルディレクトリで `iedi` CLI が使用可能か確認する:

```bash
AMCP_HOME="${AMCP_HOME:-$HOME/.claude/skills/amcp}"
IEDi_BIN="$AMCP_HOME/node_modules/.bin/iedi"

if [ ! -x "$IEDi_BIN" ]; then
  echo "CLI not found — running npm install in $AMCP_HOME..."
  if ! (cd "$AMCP_HOME" && npm install); then
    echo "ERROR: npm install failed" >&2
    echo "Check: build tools (python3, gcc, make), network, Node.js 20+" >&2
    exit 1
  fi
fi

echo "CLI: $IEDi_BIN"
```

`npm install` が失敗する場合は、ビルドツール（`python3`, `gcc`, `make`）と Node.js のバージョンを確認するよう案内する。

---

### Step 3: 完了報告

次の形式で報告する:
```
IEDI_WORKSPACE を設定しました
  path: {IEDI_WORKSPACE}
  file: {IEDI_WORKSPACE}/.claude/settings.local.json

Claude Code を再起動するか、新しいセッションを開始すると有効になります。
```
