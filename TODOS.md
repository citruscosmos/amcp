# TODOS

## T-1: DB マイグレーション戦略の定義

**What:** `~/.iedi/records.db` のスキーマ変更（v0.3 以降）に対するマイグレーション手順を定義する。

**Why:** v0.2-draft → v0.3 スキーマ変更時、グローバル DB の既存レコードが破損するリスクがある。一人の開発者が毎日蓄積する信用ログが消えると Approach A の価値が失われる。

**Pros:** 将来のスキーマ変更が安全に行える。Approach B（AMCPサーバー）移行時の信頼性が保たれる。

**Cons:** better-sqlite3 の `PRAGMA user_version` ベースの簡易マイグレーションでも実装コストがかかる。

**Context:** `~/.iedi/records.db` はユーザーグローバル。iedi-store.ts の初期化時に `PRAGMA user_version` を確認し、旧バージョンなら ALTER TABLE を実行する仕組みが最小実装。`schemaVersion` フィールドを `spec/iedi-record-v0.2.json` に記載済み。

**Depends on:** iedi-store.ts (Step 2) 完成後。Approach B 実装前に必須。

---

## T-2: `iedi doctor` コマンド（ハッシュチェーン全件再検証）

**What:** `iedi doctor` コマンド。全レコードの `record_hash` を `computeHash()` で再計算し、保存値と照合する。チェーンの連結（`requester_prev_record_hash`）も検証する。

**Why:** Approach B（双方向ハッシュ検証）に進む前に、自己チェーンの整合性を手元で確認する手段がない。バグや DB 破損の早期発見ができる。

**Pros:** 信用基盤の自己診断ツール。`iedi doctor --verbose` でどのレコードで破損しているか特定できる。

**Cons:** computeHash() と同一ロジックを CLI からも呼べる必要があり、リファクタリングが必要になる場合がある。

**Context:** computeHash() が `iedi-store.ts` の内部関数としてエクスポートされていれば実装は 30 行程度。`iedi query` の拡張として追加できる。

**Depends on:** iedi-store.ts (Step 2) + iedi.ts (Step 3) 完成後。

---

## T-3: npm publish / GitHub Release パイプライン

**What:** `npm publish` または GitHub Release + binaries による `iedi` CLI の配布自動化。

**Why:** 現状は `npx tsx src/cli/iedi.ts` または `tsc` ビルド後の `node dist/cli/iedi.js` でしか使えない。`npm install -g iedi` または `brew install` 相当のインストールパスがない。

**Pros:** 一般ユーザーが `npm install -g iedi` または single binary で使えるようになる。AMCP Approach B へのステップアップが容易になる。

**Cons:** npm registry への publish にはアカウント管理・semver 運用が必要。single binary（pkg / bun compile）は better-sqlite3 の native addon をバンドルする追加作業がある。

**Context:** `package.json` に `"bin": { "iedi": "dist/cli/iedi.js" }` は設定済み。GitHub Actions で `npm publish` するか、`bun build --compile` で single binary を Releases にアップロードする2択が有力。better-sqlite3 の native addon バンドルは bun compile では未検証。

**Depends on:** Approach A 安定稼働確認後。T-1 (DB マイグレーション) と同時に検討推奨。

---

## T-4: `iedi close` の `--insight-provider` / `--insight-requester` フラグの CLI 統合テスト

**What:** `src/cli/iedi.ts` の `iedi close --insight-provider "..." --insight-requester "..."` を実際の CLI 呼び出しレベルでテストする統合テストを追加する。

**Why:** 現状のテストはストアレイヤー（`IediStore.closeRecord()`）のユニットテストのみ。Commander.js の option parsing → store 呼び出しのパス（`opts.insightProvider` / `opts.insightRequester` の変換）はテストされていない。フラグ名変更やオプション定義ミスがサイレントに素通りするリスクがある。

**Pros:** CLI → store の結合経路全体をカバーできる。回帰防止として `--insight`（旧フラグ）が削除されていることも確認できる。

**Cons:** `iedi.ts` が `process.exit()` を呼ぶため、CLI を直接 `child_process.execSync` で呼ぶかプロセス分離テストが必要になる。セットアップが少し複雑。

**Context:** Vitest で `execa` や `child_process.execSync` を使い、テスト用の `:memory:` 相当の一時 DB パスを `IEDI_DB_PATH` 環境変数で注入するパターンが有力。

**Depends on:** T-4 は `--insight-provider` / `--insight-requester` 実装完了後（現在の実装タスク完了後に着手可能）。

---

## T-5: ROZA Graphs クロスセッショングラフ構築ツール（設計書 TODO-1）

**What:** 全 IEDI レコードを走査し、Provider Insight の verdict/confidence_delta から ROZA の directed labeled property graph を構築する `iedi export --format roza` コマンド。

**Why:** 単一セッション内の evidence verdict/confidence までは現テンプレートでキャプチャ可能だが、クロスセッションの `E_decided` エッジ構築と correct-outcome filtering は未実装。複数セッションにまたがる判断の因果連鎖が見えないと ROZA Graphs の価値が半減する。

**Pros:** Provider Insight の Intervention ブロックをグラフのエッジに変換し、セッション間の判断連鎖を可視化・分析できる。

**Cons:** スキーマ拡張（`builds_on_record_ids[]`）と correct-outcome filtering の実装が必要。DB マイグレーションが伴う。

**Context:** 各 `### Intervention N` が ROZA の `E_evaluated` エッジ1本に対応。`Verdict` → `verdict`、`Confidence` → `confidence_delta`、`Reason` → `reason`、`Description` → `action_ref`。クロスセッションエッジは record_id を跨いだ参照が必要。

**Depends on:** 構造化テンプレート運用開始後、50+ レコード蓄積時点で着手検討。T-1（DB マイグレーション戦略）が先行必須。

---

## T-6: PA-RAG DPO 訓練パイプライン RR/CQ perspective（設計書 TODO-2）

**What:** キャプチャした Chosen/Rejected Delta から RR（Response Robustness）と CQ（Citation Quality）の DPO データを生成する訓練前処理スクリプト。

**Why:** 現テンプレートは RI（Response Informativeness）perspective のみ対応。RR（ノイズ文書への堅牢性）と CQ（引用の正確性）の評価には別途ノイズ文書合成と NLI モデルによる引用検証が必要。

**Pros:** Delta ブロックの Chosen/Rejected 構造を DPO の全3 perspective に対応させられる。

**Cons:** ノイズ文書の合成ロジック、NLI モデルの選定・統合が必要。RI perspective より実装コストが高い。

**Context:** PA-RAG DPO の3 perspective: RI（Response Informativeness）= chosen/rejected の内容比較、RR（Response Robustness）= ノイズ文書混入時の回答安定性、CQ（Citation Quality）= 引用の正確性。現状の `### Decision N` ブロックは RI のみ対応。

**Depends on:** 構造化 Delta の蓄積（30+ レコード）。TODO-3（RAFT 訓練パイプライン）よりも優先度低。

---

## T-7: RAFT 訓練パイプライン（設計書 TODO-3）

**What:** 構造化 Evidence + Intent + Digest 文書から RAFT 形式（question, context, answer）の訓練データを生成するエクスポートツール。

**Why:** 構造化 Evidence の蓄積が進めば、それを RAFT の基盤訓練データに変換できる。`### Evidence Item N` ブロックがそのまま RAFT の `answer` 候補になる。

**Pros:** IEDI レコードがそのまま LLM ファインチューニングの訓練データになる。データ設計を消費側（訓練パイプライン）から逆算したアーキテクチャの成果が出る。

**Cons:** 文書チャンキング（chunk_size=512）、oracle/distractor mixing（--p フラグ）、HuggingFace Dataset 出力の実装が必要。RAFT の基盤訓練には数百〜数千サンプルが必要で、個人利用で必要量に達するには時間がかかる。

**Context:** エクスポートツールが `work_domain` と `intent` から最も関連する digest 文書を検索して context を組み立てる。Evidence Item ブロック単位で分割し、各ブロックを独立した訓練サンプルとして出力する。

**Depends on:** 構造化 Evidence の蓄積（50+ レコード）。合成データ生成やセッション間データ共有でサンプル数不足を補う戦略も並行検討。

---

## T-8: Evidence の verdict/confidence 構造化フィールド化（設計書 TODO-4）

**What:** Evidence 配列の各項目に `verdict` と `confidence_delta` フィールドを追加する DB スキーマ変更。

**Why:** 現在は Provider Insight のテキスト内に verdict を埋め込んでいるが、Evidence 項目自体に verdict/confidence が付与されていない。Evidence と Insight の紐付けがテキストの参照整合性だけに依存している。

**Pros:** Evidence 項目単位で verdict をクエリできるようになり、ROZA Graphs のエッジ構築が正確になる。

**Cons:** DB スキーマ変更（`evidence` JSON の要素に `verdict`, `confidence_delta` を追加）、`schema_version` → `0.3-draft`、マイグレーションスクリプトが必要。T-1（DB マイグレーション戦略）が先行必須。

**Context:** テンプレート運用で限界（Evidence-Insight 間の不整合が頻発する等）が見えたら着手。現状はテキスト規約で十分な可能性が高い。

**Depends on:** T-1（DB マイグレーション戦略）完成後。構造化テンプレート運用で 20+ レコード蓄積し、不整合の頻度を評価してから判断。
