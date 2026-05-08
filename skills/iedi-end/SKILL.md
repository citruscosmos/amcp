---
name: iedi-end
description: "セッションを終了してIEDIレコードを閉じる。EvidenceとDeltaとInsightをコンテキストウィンドウから生成してiedi closeを実行する。"
---

# IEDI End

現在のセッションを振り返り、open IEDIレコードに Evidence・Delta・Provider/Requester Insight を記録して閉じる。

## Instructions

### Step 1: open レコードの確認

次のコマンドを実行する:
```bash
cd "C:/Users/citru/dev/amcp" && npx tsx src/cli/iedi.ts query --json --limit 5
```

`"status": "open"` のレコードを探し、`record_id` と `intent` を保存する。

open レコードが見つからない場合:
> open IEDIレコードがありません。`/iedi-start` または `iedi start --intent "..."` でセッションを開始してください。

と出力して停止する。

---

### Step 2: セッション結果の1行サマリーを取得

ユーザーに確認する:
> このセッションの結果を一言でまとめてください（例: "借上社宅の業務執行決定書を作成した"）

ユーザーの回答を `USER_SUMMARY` として保存する。

---

### Step 3: Evidence の生成と記録

現在の会話全体（セッション開始 or /iedi-start 以降）を振り返り、3〜6文の Evidence summary を生成する。含めるべき内容:
- 何が達成されたか（具体的なファイル名・コマンド・成果物）
- ユーザーの `USER_SUMMARY` を帰結点として

**注意:** コンテキスト圧縮が進んでいる場合は Evidence の精度が低下する可能性がある。その場合は「コンテキスト圧縮のため一部情報が欠落している可能性があります」と注記して続行する。

Evidence テキストを確定したら実行する:
```bash
cd "C:/Users/citru/dev/amcp" && npx tsx src/cli/iedi.ts evidence add --last \
  --source "session_end_summary" \
  --text "<EVIDENCE_TEXT>"
```

`<EVIDENCE_TEXT>` を生成した実際のテキストで置き換えること。
CLI が非ゼロで終了した場合はエラーを表示して停止する。

---

### Step 4: Delta 候補の提示と確定

セッション中のユーザーの判断・選択を振り返り、3〜5件のDelta候補を番号付きリストで提示する。

**Delta** = モデルが単独で判断できなかった差分（ユーザーが向きを決めた事項）。
  - モデルが複数案を提示してユーザーが選択した場面
  - ユーザーがモデルの方向性を修正した場面
  - ユーザーが文脈・制約・権限情報を提供した場面
  - ユーザーが最終承認を行った場面

提示形式:
```
Delta 候補:
1. [判断内容]
2. [判断内容]
3. [判断内容]

削除する番号、追加・修正があれば教えてください。問題なければ「OK」で確定します。
```

ユーザーの回答を待ち、最終的な Delta テキストを確定する（箇条書きまたは短文）。

---

### Step 5: Provider Insight の生成と確認

以下の4セクション構成で Provider Insight を生成する。
セッションの実際の介入箇所を根拠にして、具体的に記述すること。

```markdown
## 介入ポイント
1. [判断内容]: [モデルが単独判断できなかった理由]
2. [判断内容]: [理由]
（実際に介入があった箇所を全件列挙する）

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

生成後に内容を表示し、ユーザーに確認する:
> Provider Insight を表示しました。追加・修正があれば教えてください。問題なければ「OK」で続けます。

ユーザーの修正を反映した最終テキストを Write tool で保存する:
```
C:/Users/citru/.iedi/sessions/provider-insight.md
```

---

### Step 6: Requester Insight の入力

ユーザーに確認する:
> このセッションの総評・気づきを自由に記録してください（スキップする場合は「スキップ」と入力）

ユーザーの回答を `REQUESTER_INSIGHT` として保存する。スキップの場合は空文字列とする。

---

### Step 7: レコードのクローズ

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

`REQUESTER_INSIGHT` が空でない場合は末尾に `--insight-requester "<REQUESTER_INSIGHT>"` を追加する。

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
