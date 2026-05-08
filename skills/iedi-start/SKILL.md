---
name: iedi-start
description: "IEDIセッションを開始する。ワークスペースの.iedi/digest/からカテゴリを選択してintentを確定し、iedi startを実行する。"
---

# IEDI Start

IEDIレコードを開始する。過去のダイジェストからカテゴリを選択し、intent を確定して `iedi start` を実行する。

## IEDI パス設定

各ステップで bash コマンドを実行する前に、以下の関数で `IEDI_DIR` を取得する。
`.git` と同様にカレントディレクトリから上方向に `.iedi/` を探索する。

```bash
find_iedi_dir() { local d=$PWD; while [ "$d" != "/" ]; do [ -d "$d/.iedi" ] && echo "$d/.iedi" && return; d=$(dirname "$d"); done; echo "$PWD/.iedi"; }
IEDI_DIR=$(find_iedi_dir)
```

## Instructions

### Step 1: digest ファイルの確認

次のコマンドを実行する:
```bash
find_iedi_dir() { local d=$PWD; while [ "$d" != "/" ]; do [ -d "$d/.iedi" ] && echo "$d/.iedi" && return; d=$(dirname "$d"); done; echo "$PWD/.iedi"; }
IEDI_DIR=$(find_iedi_dir)
ls "$IEDI_DIR/digest/IEDI-"*.md 2>/dev/null
```

**ファイルが0件の場合（初回 or `/iedi-digest` 未実行）:**
> `$IEDI_DIR/digest/` にカテゴリファイルがありません。
> `/iedi-digest` を実行するとカテゴリが使えるようになります。
> 今回は intent を直接入力してください: どんな作業をしますか？

ユーザーの回答を intent として確定し、Step 5 へジャンプする。

---

### Step 2: カテゴリ一覧の構築と表示

各 `IEDI-*.md` ファイルの最初の行（`# IEDI ドメイン知識: ...`）を Read tool で読み込んで説明として使う。

ファイル名規則:
- `IEDI-[level1]-[level2].md` → level2 あり（例: `IEDI-legal-decision.md`）
- `IEDI-[level1].md` → level1 のみ（例: `IEDI-legal.md`）

level1 でグルーピングして階層表示する。表示例:
```
利用可能なカテゴリ:
[1] legal
    [1-1] legal-decision   (業務執行決定書)
    [1-2] legal-contract   (契約・覚書)
[2] coding
    [2-1] coding-iedi      (IEDI 実装)
    [2-2] coding-amcp      (AMCP プロトコル)
[3] backoffice
    [3-1] backoffice-admin (管理業務)
[0] 新規カテゴリ
```

---

### Step 3: カテゴリの選択

ユーザーに確認する:
> カテゴリ番号を選んでください（例: `1-1`）。新規の場合は `0` を選択してください。

ユーザーの回答を待つ。

- **既存カテゴリ選択（例: `1-1`）** → 対応する `IEDI-[category].md` を特定する（例: `IEDI-legal-decision.md`）
- **`0`（新規）** → ユーザーに `[level1]-[level2]` 形式のカテゴリ名を入力してもらう（例: `legal-contract`）。
  新規カテゴリの場合は Step 4 をスキップして Step 5 へ進む。

---

### Step 4: Intent パターン例の提示

Step 1 で取得した `IEDI_DIR` を使い、`$IEDI_DIR/digest/IEDI-[category].md` を Read tool で読み込む。

`## Intent パターン例` セクションを抽出し、過去のintent例を提示する:
```
Intent パターン例（{category}）:
- "..."
- "..."
- "..."

この中から近いものを選ぶ、または自由に記述してください。
```

---

### Step 5: Intent の確定

ユーザーの回答を intent 文字列として確定する。

---

### Step 6: work_domain の自動判断

カテゴリと intent から work_domain を判断する（ユーザーへの確認は原則不要）:
- `legal-*`, `backoffice-*`, `external-*` → `external_transaction`
- `coding-*`, `design-*` → `internal_task`
- 意思決定が主目的 → `decision`
- 振り返り → `retrospective`
- 判断できない場合はデフォルト `internal_task` を使う

---

### Step 7: iedi start の実行

次のコマンドを実行する:
```bash
cd "C:/Users/citru/dev/amcp" && npx tsx src/cli/iedi.ts start \
  --intent "<INTENT>" \
  --work-domain <WORK_DOMAIN>
```

`<INTENT>` と `<WORK_DOMAIN>` を実際の値で置き換えること。
CLI が非ゼロで終了した場合（すでに open レコードが存在する等）はエラーをそのまま表示して停止する。

---

### Step 8: 記録と報告

CLI の出力から `record_id` を取得する。

補助ファイルに記録する（デバッグ目的）:
```bash
find_iedi_dir() { local d=$PWD; while [ "$d" != "/" ]; do [ -d "$d/.iedi" ] && echo "$d/.iedi" && return; d=$(dirname "$d"); done; echo "$PWD/.iedi"; }
IEDI_DIR=$(find_iedi_dir)
mkdir -p "$IEDI_DIR/sessions"
echo "<record_id>" > "$IEDI_DIR/sessions/current-start.txt"
```

次の形式で報告する:
```
IEDIセッション開始
  record_id: {record_id}
  intent:    {intent}
  category:  {category}
  domain:    {work_domain}
  iedi_dir:  {IEDI_DIR}

セッション終了時は /iedi-end を実行してください。
```

---

## Notes

- このスキルは intent 宣言のみを行う。Evidence・Delta・Insight の生成は `/iedi-end` が担当する。
- open レコードがすでに存在する場合、`iedi start` はエラーで失敗する（仕様通り）。
  その場合は `iedi query` で open レコードを確認し、`/iedi-end` で閉じてから再実行すること。
- `/iedi-digest` が未実行でもフリーテキスト intent で開始できる。カテゴリなしでも問題ない。
- work_domain は後から変更できない。迷った場合は `internal_task` で開始してよい。
- `iedi` CLI 自体も walk-up 探索でワークスペースの `.iedi/` を見つける。
  スキルと CLI が同じ DB を参照するため、どのサブディレクトリで実行しても一致する。
