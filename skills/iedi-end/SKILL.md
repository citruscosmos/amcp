---
name: iedi-end
description: "セッションを終了してIEDIレコードを閉じる。EvidenceとDeltaとInsightをコンテキストウィンドウから生成してiedi closeを実行する。"
---

# IEDI End

現在のセッションを振り返り、open IEDIレコードに Evidence・Delta・Provider/Requester Insight を記録して閉じる。

## IEDI パス設定

各ステップで bash コマンドを実行する前に、環境変数 `IEDI_WORKSPACE` から `IEDI_DIR` を設定する（`/iedi-setup` で設定済みであること）。

```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
```

## Instructions

### Step 1: open レコードの確認

次のコマンドを実行する:
```bash
iedi query --json --limit 5
```

`"status": "open"` のレコードを探し、`record_id` と `intent` を保存する。

open レコードが見つからない場合:
> open IEDIレコードがありません。`/iedi-start` または `iedi open --intent "..."` でセッションを開始してください。

と出力して停止する。

---

### Step 2: セッション結果の1行サマリーを取得

ユーザーに確認する:
> このセッションの結果を一言でまとめてください（例: "借上社宅の業務執行決定書を作成した"）

ユーザーの回答を `USER_SUMMARY` として保存する。

---

### Step 3: Evidence の生成と記録

現在の会話全体（セッション開始 or /iedi-start 以降）を振り返り、作業単位ごとに **Evidence Item ブロック** を生成する。
自由文の要約ではなく、項目単位の自己完結ブロック（`### Evidence Item N`）として構造化する。

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

### Evidence Item 2
- **Did:** ...
- **Result:** ...
- **Files:** ...
- **Outcome:** ...
```

ブロック数はセッション内の独立した作業単位の数に応じて変動する（通常 1〜5）。
各ブロックが1つの RAFT 訓練サンプルの `answer` 候補になる。

**Rejected/Failed は Evidence に含めない。** それらは評価（evaluation）であり観察（observation）ではない。不採用案や失敗アプローチは Step 4 の Delta（Chosen/Rejected）に寄せる。

**注意:** コンテキスト圧縮が進んでいる場合は Evidence の精度が低下する可能性がある。その場合は「コンテキスト圧縮のため一部情報が欠落している可能性があります」と注記して続行する。

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
  --source "session_end_summary" \
  --text "$(cat "$IEDI_DIR/sessions/evidence.md")"
```

CLI が非ゼロで終了した場合はエラーを表示して停止する。

---

### Step 4: Delta の生成と確定

セッション中のユーザーの判断・選択を振り返り、判断単位ごとに **Decision ブロック** を生成する。
箇条書きではなく、項目単位の自己完結ブロック（`### Decision N`）として構造化する。

**Delta** = モデルが単独で判断できなかった差分（ユーザーが向きを決めた事項）。
  - モデルが複数案を提示してユーザーが選択した場面
  - ユーザーがモデルの方向性を修正した場面
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
セッションによっては「却下した代替案」が存在しない判断がある（例: 「deprecated エイリアスを残す」は当然の判断で代替案の検討がなかった）。
その判断は Delta に含めず、Step 5 の Provider Insight の介入ポイントにのみ記録する。
この運用ルールにより、DPO に適さない空の Rejected フィールドを減らす。

判断候補を番号付きリストで提示する:
```
Delta 候補:
1. [Chosen] / [Rejected] / [Reason]
2. [Chosen] / [Rejected] / [Reason]
3. [Chosen] / [Rejected] / [Reason]

削除する番号、追加・修正があれば教えてください。問題なければ「OK」で確定します。
```

ユーザーの回答を待ち、最終的な Delta テキストを確定する。

---

### Step 5: Provider Insight の生成と確認

以下の4セクション構成で Provider Insight を生成する。
セッションの実際の介入箇所を根拠にして、具体的に記述すること。

介入ポイントは箇条書きではなく、項目単位の自己完結ブロック（`### Intervention N`）として構造化する。
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

生成後に内容を表示し、ユーザーに確認する:
> Provider Insight を表示しました。追加・修正があれば教えてください。問題なければ「OK」で続けます。

ユーザーの修正を反映した最終テキストを保存する。まず保存先パスを確認:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/provider-insight.md"
```

出力されたパスに Write tool で保存する。

---

### Step 5.5: テンプレート検証

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

### Step 6: Requester Insight の入力

ユーザーに確認する:
> このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」と入力）

ユーザーの回答を `REQUESTER_INSIGHT` として保存する。スキップの場合は空文字列とする。

---

### Step 7: レコードのクローズ

確定した Delta テキストを保存する。まず保存先パスを確認:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
mkdir -p "$IEDI_DIR/sessions"
echo "$IEDI_DIR/sessions/delta.txt"
```

出力されたパスに Write tool で Delta テキストを保存する。

次のコマンドを実行する（Evidence は Step 3 で、Provider Insight は Step 5 で、Delta は上記でファイル保存済み）:
```bash
IEDI_DIR="${IEDI_WORKSPACE}/.iedi"
DELTA=$(cat "$IEDI_DIR/sessions/delta.txt")
PROVIDER=$(cat "$IEDI_DIR/sessions/provider-insight.md")
iedi close --last \
  --delta "$DELTA" \
  --insight-provider "$PROVIDER"
```

`REQUESTER_INSIGHT` が空でない場合は末尾に `--insight-requester "$(cat "$IEDI_DIR/sessions/requester-insight.txt")"` を追加する（事前に Write tool で同ファイルに保存しておく）。

**CLI 引数長の注意:** Windows のコマンドライン長制限（cmd.exe: ~8191 chars）により、`--delta` または `--insight-provider` の値が長大な場合に `$(cat ...)` による展開が失敗する可能性がある。その場合は以下を試す:
1. 最初に `--delta` のみで `iedi close --last --delta "$(cat "$IEDI_DIR/sessions/delta.txt")"` を実行し、Provider Insight を後から `iedi update` で追加する（`iedi update` コマンドが存在する場合）
2. または、Delta のブロック数を減らして再生成する（Step 4 に戻る）

CLI が非ゼロで終了した場合はエラーを表示して停止する（レコードは open のまま残る — 再実行で再試行可能）。

---

### Step 8: 完了報告

CLI の出力から `record_id` と `hash` を取得し、次の形式で報告する:

```
IEDIレコード閉鎖完了
  record_id: {record_id}
  intent:    {intent}
  hash:      {hash}

/iedi-digest を実行するとレコードが知識ドキュメントに集約されます。
```

---

## Notes

- いずれかのステップで失敗してもレコードは open のまま残る。スキルを再実行することで再試行できる。
- Provider Insight は4セクション構造で保存すること。`/iedi-digest` がこの構造を前提にパターン抽出を行う。
- Delta は「モデルが単独判断できなかった差分」に絞ること。ただの作業ログではない。
- Evidence は `### Evidence Item N`、Delta は `### Decision N`、Provider Insight の介入ポイントは `### Intervention N` の自己完結ブロックで構造化する。各ブロックが RAFT/DPO/ROZA の訓練データ単位になる。
- Step 5.5 の grep 検証は、LLM 生成テキストのテンプレート逸脱を検出するための軽量チェックである。検証失敗時は最大2回まで再生成を試みる。
- 長大テキストは CLI 引数として直接渡さず、`$IEDI_DIR/sessions/` に一時ファイルとして保存し `$(cat <file>)` で渡す。Windows のコマンドライン長制限（~8191 chars）に注意。
- `iedi` CLI は `IEDI_WORKSPACE` 環境変数で `.iedi/` の場所を決定する。
  スキルと CLI が同じ DB・同じ sessions/ を参照するため整合性が保たれる。
