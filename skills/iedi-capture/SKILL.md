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
iedi query --json --limit 3
```

`"status": "open"` のレコードがある場合:
> 現在 open のIEDIレコードがあります（{record_id} / {intent}）。
> このレコードを先に `/iedi-end` で閉じてから再実行してください。

と表示して停止する。

---

### Step 2: カテゴリの選択（/iedi-start フロー）

次のコマンドを実行する:
```bash
ls "${IEDI_WORKSPACE}/.iedi/digest/IEDI-"*.md 2>/dev/null
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

選択されたカテゴリの `${IEDI_WORKSPACE}/.iedi/digest/IEDI-[category].md` を Read tool で読み込む。
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

### Step 5: セッション情報のソース選択

ユーザーに確認する:
> 記録するセッション情報のソースを選んでください:
>
> **[1] 現在のセッション（コンテキストウィンドウ）**
>     `/resume` で開いたセッション全体をそのまま使用します。
>     Evidence・Delta・Insight を会話内容から直接生成します。
>
> **[2] 自由記述**
>     何をしたか、どんな決断があったかを思い出して入力してください。
>
> **[3] ファイルパス**
>     メモ・ログ・会話サマリーのファイルパスを入力してください。
>
> **[4] 貼り付け**
>     会話ログや作業メモをそのまま貼り付けてください。

ユーザーの選択を `SOURCE_MODE` として保存する:
- `[1]` → `SOURCE_MODE=context`
- `[2][3][4]` → `SOURCE_MODE=notes`

**`SOURCE_MODE=context` の場合:**
現在の会話全体（コンテキストウィンドウ）が情報源になる。
Step 7 以降で `/iedi-end` と同じ生成ロジックを使う。

**`SOURCE_MODE=notes` の場合:**
ユーザーの入力を `SESSION_NOTES` として取得する:
- `[2]` 自由記述: ユーザーが入力したテキストをそのまま保存
- `[3]` ファイルパス: Read tool でファイルを読み込む
- `[4]` 貼り付け: 貼り付けられたテキストをそのまま保存

---

### Step 6: iedi open の実行

次のコマンドを実行する:
```bash
iedi open \
  --intent "<INTENT>" \
  --work-domain <WORK_DOMAIN>
```

CLI が非ゼロで終了した場合はエラーを表示して停止する。

CLI の出力から `record_id` を取得する。

---

### Step 7: Evidence の生成と記録

**`SOURCE_MODE=context`（コンテキストウィンドウ）の場合:**
現在の会話全体を振り返り、作業単位ごとに **Evidence Item ブロック** を生成する。
自由文の要約ではなく、項目単位の自己完結ブロック（`### Evidence Item N`）として構造化する。

**`SOURCE_MODE=notes`（ノート）の場合:**
`SESSION_NOTES` を基に、作業単位ごとに Evidence Item ブロックを生成する。
ノートの情報量が少ない場合は「情報が限られているため要約の精度が低い可能性があります」と注記する。

各ブロックには以下の4フィールドを含める（観察と評価を分離し、観察のみをEvidenceに記録する）:

| フィールド | 必須 | 説明 |
|---|---|---|
| Did | ✅ | 実施した作業内容（具体的なツール・コマンド・アプローチ） |
| Result | ✅ | その結果（成功したこと・確認できた事実） |
| Files | ✅ | 変更したファイルと変更内容の要約 |
| Outcome | ✅ | 1行の検証可能な結果 |

出力形式:
```markdown
### Evidence Item 1
- **Did:** [実施した作業内容]
- **Result:** [その結果]
- **Files:** [変更ファイルと要約]
- **Outcome:** [1行の検証可能な結果]
```

ブロック数はセッション内の独立した作業単位の数に応じて変動する（通常 1〜5）。

**Rejected/Failed は Evidence に含めない。** それらは評価（evaluation）であり観察（observation）ではない。不採用案や失敗アプローチは Step 8 の Delta（Chosen/Rejected）に寄せる。

Evidence テキストを確定したら、まず保存先パスを確認する:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/evidence.md"
```

出力されたパスに Write tool で Evidence テキストを保存し、次のコマンドを実行する:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
iedi add evidence --last \
  --source "session_capture" \
  --text "$(cat "$IEDI_DIR/sessions/evidence.md")"
```

`session_capture` は遡及記録（capture）であることを示す固定リテラル（`SOURCE_MODE` によらず同一）。
CLI が非ゼロで終了した場合はエラーを表示して停止する。

---

### Step 8: Delta の生成と確定

**`SOURCE_MODE=context`（コンテキストウィンドウ）の場合:**
会話全体から、判断単位ごとに **Decision ブロック** を生成する。
箇条書きではなく、項目単位の自己完結ブロック（`### Decision N`）として構造化する。

**`SOURCE_MODE=notes`（ノート）の場合:**
`SESSION_NOTES` から Decision ブロックを生成する。
ノートに判断事項が明示されていない場合は「ノートから判断事項を特定できませんでした。直接入力してください」と伝える。

**Delta** = モデルが単独で判断できなかった差分（ユーザーが向きを決めた事項）:
- 複数案からユーザーが選択した場面
- ユーザーがモデルの方向を修正した場面
- ユーザーが文脈・制約・権限情報を提供した場面
- ユーザーが最終承認を行った場面

各ブロックには以下の3フィールドを含める:

| フィールド | 必須 | 説明 |
|---|---|---|
| Chosen | ✅ | 採用した判断 |
| Rejected | ✅ | 却下した代替案（該当なければ「（なし — 代替案の検討なし）」） |
| Reason | ✅ | 採用理由（なぜ Chosen が Rejected より優れているか） |

出力形式:
```markdown
### Decision 1
- **Chosen:** [採用した判断]
- **Rejected:** [却下した代替案]
- **Reason:** [採用理由]

### Decision 2
- **Chosen:** [採用した判断]
- **Rejected:** [却下した代替案]
- **Reason:** [採用理由]
```

各 `### Decision N` ブロックが1つの DPO preference pair（RI perspective）になる。
Rejected が「（なし — 代替案の検討なし）」のブロックは DPO に適さないが、記録としてブロック自体は生成する。

**却下した代替案が存在しない判断について:**
その判断は Delta に含めず、Step 9 の Provider Insight の介入ポイントにのみ記録する。

判断候補を番号付きリストで提示する:
```
Delta 候補:
1. [Chosen] / [Rejected] / [Reason]
2. [Chosen] / [Rejected] / [Reason]
3. [Chosen] / [Rejected] / [Reason]

削除する番号、追加・修正があれば教えてください。問題なければ「OK」で確定します。
```

---

### Step 9: Provider Insight の生成と確認

**`SOURCE_MODE=context`（コンテキストウィンドウ）の場合:**
会話全体を基に、実際の介入箇所を根拠として具体的に記述する。

**`SOURCE_MODE=notes`（ノート）の場合:**
`SESSION_NOTES` を基に生成する。ノートから読み取れる範囲で記述し、推測が入る場合は「ノートから推測」と明記する。

いずれの場合も以下の4セクション構成で生成する。介入ポイントは箇条書きではなく、項目単位の自己完結ブロック（`### Intervention N`）として構造化する。

各ブロックには以下の4フィールドを含める:

| フィールド | 必須 | 説明 |
|---|---|---|
| Description | ✅ | 介入が発生した判断内容 |
| Verdict | ✅ | `used`（ユーザー判断を採用）または `rejected`（モデル提案を優先） |
| Confidence | ✅ | ±0.1/0.3/0.5 の数値（ルーブリック準拠） |
| Reason | ✅ | モデルが単独判断できなかった理由 |

confidence_delta の目安（スタータールーブリック）:
| 値 | 意味 | 例 |
|---|---|---|
| +0.1 | 微修正で済んだ | 表現の調整、ファイル名の修正 |
| +0.3 | モデルの方向性を修正した | アプローチの選択、設計判断 |
| +0.5 | モデルが確実に誤っていた | 誤った前提の訂正、根本的な方向転換 |
| -0.1 | ユーザー判断がモデル提案より劣る可能性 | モデル案を却下したが後で必要になった |

出力形式:
```markdown
## 介入ポイント

### Intervention 1
- **Description:** [介入が発生した判断内容]
- **Verdict:** [used または rejected]
- **Confidence:** [+0.1 / +0.3 / +0.5 / -0.1]
- **Reason:** [モデルが単独判断できなかった理由]

### Intervention 2
- **Description:** [介入が発生した判断内容]
- **Verdict:** [used または rejected]
- **Confidence:** [数値]
- **Reason:** [理由]

## 自律実行に必要だったもの
- **ドメイン知識:** [判断に必要だった専門知識・規程・慣例]
- **権限・ポリシー:** [誰がどの範囲で決定できるかのルール]
- **外部データ・コンテキスト:** [参照が必要だったリソース・情報]
（該当しないセクションは省略可）

## 次回の自動化可能性
- [学習・ルール化すれば次回以降に不要になる介入]
- [テンプレート化・事前定義で対応できる判断]

## 本質的な人間判断（自動化不可）
- [最終意思決定・倫理的判断・ステークホルダー調整など]
```

各 `### Intervention N` ブロックが1つの ROZA evidence edge に対応する。
4セクション構造は `/iedi-digest` の後方互換性のため維持する。

数値は主観値。50レコード蓄積時点で分布を確認し、キャリブレーションを行うこと。

生成後に表示し、ユーザーに確認する:
> Provider Insight を表示しました。追加・修正があれば教えてください。問題なければ「OK」で続けます。

最終テキストを保存する。まず保存先パスを確認:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/provider-insight.md"
```

出力されたパスに Write tool で保存する。

---

### Step 9.5: テンプレート検証

LLM 生成テキストはテンプレートから逸脱する可能性があるため、生成後に軽量な構造検証を行う。

Evidence・Delta・Provider Insight をファイルに保存した後、以下の grep チェックを実行する:

```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
EVIDENCE_FILE="$IEDI_DIR/sessions/evidence.md"
DELTA_FILE="$IEDI_DIR/sessions/delta.txt"
PROVIDER_FILE="$IEDI_DIR/sessions/provider-insight.md"

# Evidence: ブロックの存在確認
grep -q '^### Evidence Item [0-9]\+$' "$EVIDENCE_FILE" || echo "MISSING: Evidence Item blocks"

# Delta: ブロックの存在確認 + 必須フィールド
grep -q '^### Decision [0-9]\+$' "$DELTA_FILE" || echo "MISSING: Decision blocks"
grep -q '^- \*\*Chosen:\*\*' "$DELTA_FILE" || echo "MISSING: Chosen field"
grep -q '^- \*\*Rejected:\*\*' "$DELTA_FILE" || echo "MISSING: Rejected field"
grep -q '^- \*\*Reason:\*\*' "$DELTA_FILE" || echo "MISSING: Reason field"

# Provider Insight: セクション構造 + ブロック内フィールド
grep -q '^### Intervention [0-9]\+$' "$PROVIDER_FILE" || echo "MISSING: Intervention blocks"
grep -q '^- \*\*Verdict:\*\*' "$PROVIDER_FILE" || echo "MISSING: Verdict field"
grep -q '^- \*\*Confidence:\*\*' "$PROVIDER_FILE" || echo "MISSING: Confidence field"
```

検証に失敗した場合（`MISSING:` が出力された場合）:
1. 欠落しているフィールド/ブロックを具体的に指摘する
2. 該当ステップに戻り、欠落セクションを明示的に指示して再生成する
3. 最大2回まで再試行する

2回失敗した場合は:
> テンプレート検証に失敗しました。手動で修正してください。

と表示し、生成テキストをそのまま提示して続行する。

---

### Step 10: Requester Insight の入力

ユーザーに確認する:
> このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」）

`REQUESTER_INSIGHT` として保存する。スキップの場合は空文字列とする。

---

### Step 11: レコードのクローズ

確定した Delta テキストを保存する。まず保存先パスを確認:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/delta.txt"
```

出力されたパスに Write tool で Delta テキストを保存する。

次のコマンドを実行する（Evidence は Step 7 で、Provider Insight は Step 9 で、Delta は上記でファイル保存済み）:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
DELTA=$(cat "$IEDI_DIR/sessions/delta.txt")
PROVIDER=$(cat "$IEDI_DIR/sessions/provider-insight.md")
iedi close --last \
  --delta "$DELTA" \
  --insight-provider "$PROVIDER"
```

`REQUESTER_INSIGHT` が空でない場合は末尾に `--insight-requester "$(cat "$IEDI_DIR/sessions/requester-insight.txt")"` を追加する（事前に Write tool で同ファイルに保存しておく）。

**CLI 引数長の注意:** Windows のコマンドライン長制限（cmd.exe: ~8191 chars）により、`--delta` または `--insight-provider` の値が長大な場合に `$(cat ...)` による展開が失敗する可能性がある。その場合は Delta のブロック数を減らして再生成する（Step 8 に戻る）。

CLI が非ゼロで終了した場合はエラーを表示して停止する（レコードは open のまま残る）。

---

### Step 12: 完了報告

補助ファイルの更新:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "<record_id>" > "$IEDI_DIR/sessions/current-start.txt"
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

- **`SOURCE_MODE=context`（推奨）**: `/resume` で過去セッションを開いてから本スキルを実行すると、
  会話全体をコンテキストとして使えるため Evidence・Delta・Insight の精度が最も高くなる。
  典型的なフロー: `Ctrl+R` でセッション検索 → セッションを開く → `/iedi-capture` → `[1]` を選択
- **`SOURCE_MODE=notes`**: コンテキストが入手できない場合の代替手段。
  ノートが詳細なほど Insight の精度が上がる。会話ログ・作業メモの貼り付けが最善。
- Evidence source は常に `session_capture`（`/iedi-end` は `session_end_summary`）。
  `/iedi-digest` でこの差分を使って記録品質を区別できる。
- Evidence は `### Evidence Item N`、Delta は `### Decision N`、Provider Insight の介入ポイントは `### Intervention N` の自己完結ブロックで構造化する。各ブロックが RAFT/DPO/ROZA の訓練データ単位になる。
- Step 9.5 の grep 検証は、LLM 生成テキストのテンプレート逸脱を検出するための軽量チェックである。検証失敗時は最大2回まで再生成を試みる。
- 長大テキストは CLI 引数として直接渡さず、`$IEDI_DIR/sessions/` に一時ファイルとして保存し `$(cat <file>)` で渡す。Windows のコマンドライン長制限（~8191 chars）に注意。
- `/iedi-digest` はレコードが 3 件以上蓄積してから実行する。
