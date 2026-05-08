# IEDI Skills

Claude Code スキル（`~/.claude/skills/` に配置する SKILL.md ファイル群）。

## スキル一覧

| スキル | 用途 |
|---|---|
| `/iedi-start` | IEDIセッション開始。カテゴリ選択 → intent確定 → `iedi start` |
| `/iedi-end` | IEDIセッション終了。Evidence/Delta/Insight生成 → `iedi close` |
| `/iedi-capture` | 過去セッションの遡及記録。ノートから一括でレコード作成 |

## インストール

```bash
# ~/.claude/skills/ が存在しない場合は作成
mkdir -p ~/.claude/skills

# 各スキルをコピー
cp -r skills/iedi-start ~/.claude/skills/
cp -r skills/iedi-end   ~/.claude/skills/
cp -r skills/iedi-capture ~/.claude/skills/
```

## 依存関係

- `iedi` CLI（`C:/Users/citru/dev/amcp` でビルド済み、または `npm install -g .`）
- `jq`（`/iedi-digest` で使用。`winget install jqlang.jq` でインストール）

## 関連コマンド

```bash
# open レコードの確認
iedi query

# 手動でセッション開始
iedi start --intent "作業内容を記述"

# 手動でセッション終了
iedi close --last --delta "判断事項" --insight-provider "モデル視点" --insight-requester "ユーザー視点"
```
