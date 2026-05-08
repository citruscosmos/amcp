---
name: iedi-capture
description: "過去に完了したセッションをIEDIレコードとして事後記録（バックフィル）する。/iedi-startと/iedi-endを1回で実行する。"
---

# IEDI Capture

現在のコンテキストウィンドウに存在しない、過去に完了したセッションを
IEDI レコードとして遡及記録する。

`/iedi-start` + `/iedi-end` の統合フロー。ユーザーが提供するセッションノートから
Evidence・Delta・Provider/Requester Insight を生成する。

---

## Instructions

### Step 1: open レコードの確認

次のコマンドを実行する:
```bash
cd "C:/Users/citru/dev/amcp" && npx tsx src/cli/iedi.ts query --json --limit 3
```

`"status": "open"` のレコードがある場合:
> 現在 open のIEDIレコードがあります（{record_id} / {intent}）。
> このレコードを先に `/iedi-end` で閉じてから再実行してください。

と表示して停止する。

---

### Step 2: カテゴリの選択（/iedi-start フロー）

次のコマンドを実行する:
```bash
ls ~/.iedi/digest/IEDI-*.md 2>/dev/null
```

**ファイルが0件の場合:** intent を直接入力してもらい Step 4 へスキップする。

ファイルがある場合: 各ファイルの最初の見出し行を読み込み、level1 でグルーピングして階層表示する。

表示例:
```
利用可能なカテゴリ:
[1] legal
    [1-1] legal-decision   (業務執行決定書)
    [1-2] legal-contract   (契約・覚書)
[2] coding
    [2-1] coding-iedi      (IEDI 実装)
[0] 新規カテゴリ
```

ユーザーに確認する:
> カテゴリ番号を選んでください。新規の場合は `0` を選択してください。

---

### Step 3: Intent パターン例の提示（既存カテゴリの場合）

選択されたカテゴリの `~/.iedi/digest/IEDI-[category].md` を Read tool で読み込む。
`## Intent パターン例` セクションを抽出して提示する。

> この中から近いものを選ぶ、または自由に記述してください。

---

### Step 4: Intent と work_domain の確定

ユーザーの回答から intent 文字列を確定する。

work_domain はカテゴリと intent から自動判断する:
- `legal-*`, `external-*`, `backoffice-*` → `external_transaction`
- `coding-*`, `design-*` → `internal_task`
- 意思決定が主目的 → `decision`
- 判断できない場合 → `internal_task`

---

### Step 5: セッションノートの取得

ユーザーに確認する:
> 過去のセッションのノートを提供してください。
> 以下のいずれかの形式で入力できます:
>
> - **自由記述**: 何をしたか、どんな決断があったかを思い出して入力
> - **ファイルパス**: メモ・ログ・会話サマリーのファイルパスを入力
> - **貼り付け**: 会話ログや作業メモをそのまま貼り付け
>
> ノートを入力してください:

ユーザーの入力を受け取る:
- ファイルパスの場合: Read tool で読み込む
- テキストの場合: そのまま `SESSION_NOTES` として保存する

---

### Step 6: iedi start の実行

次のコマンドを実行する:
```bash
cd "C:/Users/citru/dev/amcp" && npx tsx src/cli/iedi.ts start \
  --intent "<INTENT>" \
  --work-domain <WORK_DOMAIN>
```

CLI が非ゼロで終了した場合はエラーを表示して停止する。

CLI の出力から `record_id` を取得する。

---

### Step 7: Evidence の生成と記録

`SESSION_NOTES` を基に 3〜6 文の Evidence summary を生成する:
- 何が達成されたか（ノートの中の具体的な成果物・コマンド・ファイル）
- 作業の背景と帰結

実行:
```bash
cd "C:/Users/citru/dev/amcp" && npx tsx src/cli/iedi.ts evidence add --last \
  --source "session_capture" \
  --text "<EVIDENCE_TEXT>"
```

`session_capture` は遡及記録（capture）であることを示す固定リテラル。
CLI が非ゼロで終了した場合はエラーを表示して停止する。

---

### Step 8: Delta 候補の提示と確定

`SESSION_NOTES` から Delta 候補（3〜5件）を抽出して番号付きリストで提示する。

**Delta** = モデルが単独で判断できなかった差分（ユーザーが向きを決めた事項）:
- 複数案からユーザーが選択した場面
- ユーザーがモデルの方向を修正した場面
- ユーザーが文脈・制約・権限情報を提供した場面
- ユーザーが最終承認を行った場面

ノートに判断事項が明示されていない場合は「ノートから判断事項を特定できませんでした。直接入力してください」と伝える。

```
Delta 候補:
1. [判断内容]
2. [判断内容]
3. [判断内容]

削除する番号、追加・修正があれば教えてください。問題なければ「OK」で確定します。
```

---

### Step 9: Provider Insight の生成と確認

`SESSION_NOTES` を基に 4 セクション構成の Provider Insight を生成する:

```markdown
## 介入ポイント
1. [判断内容]: [モデルが単独判断できなかった理由]
2. [判断内容]: [理由]
（ノートから読み取れる介入箇所を全件列挙する）

## 自律実行に必要だったもの
- ドメイン知識: [判断に必要だった専門知識・規程・慣例]
- 権限・ポリシー: [誰がどの範囲で決定できるかのルール]
- 外部データ・コンテキスト: [参照が必要だったリソース・情報]
（該当しないセクションは省略可）

## 次回の自動化可能性
- [学習・ルール化すれば次回以降に不要になる介入]
- [テンプレート化・事前定義で対応できる判断]

## 本質的な人間判断（自動化不可）
- [最終意思決定・倫理的判断・ステークホルダー調整など]
```

**注意:** ノートの情報量が少ない場合、一部セクションが推測になる。
その場合は「ノートから推測」と明記すること。

生成後に表示し、ユーザーに確認する:
> Provider Insight を表示しました。追加・修正があれば教えてください。問題なければ「OK」で続けます。

最終テキストを Write tool で保存する:
```
C:/Users/citru/.iedi/sessions/provider-insight.md
```

---

### Step 10: Requester Insight の入力

ユーザーに確認する:
> このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」）

`REQUESTER_INSIGHT` として保存する。スキップの場合は空文字列とする。

---

### Step 11: レコードのクローズ

確定した Delta テキストを Write tool で保存する:
```
C:/Users/citru/.iedi/sessions/delta.txt
```

次のコマンドを実行する:
```bash
DELTA=$(cat C:/Users/citru/.iedi/sessions/delta.txt)
PROVIDER=$(cat C:/Users/citru/.iedi/sessions/provider-insight.md)
cd "C:/Users/citru/dev/amcp" && npx tsx src/cli/iedi.ts close --last \
  --delta "$DELTA" \
  --insight-provider "$PROVIDER"
```

`REQUESTER_INSIGHT` が空でない場合は `--insight-requester "<REQUESTER_INSIGHT>"` を追加する。

CLI が非ゼロで終了した場合はエラーを表示して停止する（レコードは open のまま残る）。

---

### Step 12: 完了報告

補助ファイルの更新:
```bash
mkdir -p C:/Users/citru/.iedi/sessions
echo "<record_id>" > C:/Users/citru/.iedi/sessions/current-start.txt
```

次の形式で報告する:
```
IEDIレコード（バックフィル）完了
  record_id: {record_id}
  intent:    {intent}
  category:  {category}
  source:    session_capture（遡及記録）
  hash:      {hash}

注意: created_at は実行時刻です（過去のセッション実施日時ではありません）。
```

---

## Notes

- このスキルはコンテキストウィンドウの情報を使わない。すべて `SESSION_NOTES` から生成する。
- Evidence source は `session_capture`（`/iedi-end` は `session_end_summary`）。
  `/iedi-digest` でこの差分を使って記録品質を区別できる。
- ノートが詳細な場合は Insight の精度が上がる。可能な限り会話ログや作業メモを提供すること。
- `/iedi-digest` はレコードが 3 件以上蓄積してから実行する。
