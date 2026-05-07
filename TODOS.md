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
