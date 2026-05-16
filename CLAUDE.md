# AMCP Project

## プロジェクト概要
AI Mediated Component Protocol (AMCP) —  
MCP に準拠したプロファイル。  
モデル - AMCPサーバー - 人や組織 をつなぐインターフェース。

## 参照ドキュメント
- 仕様ホワイトペーパー: docs/whitepaper.md
- （追加されたら）spec/, src/, tests/ 参照

## Skill routing
- Product ideas/brainstorming → /office-hours
- Strategy/scope            → /plan-ceo-review  
- Architecture              → /plan-eng-review
- Code review/diff          → /review
- Ship/deploy/PR            → /ship
- IEDIワークスペース設定    → /iedi-setup
- IEDIセッション開始        → /iedi-start
- IEDIセッション終了        → /iedi-end
- IEDI過去セッション記録    → /iedi-capture
- IEDI知識ドキュメント生成  → /iedi-digest

## git commit

When creating commits, the `Co-Authored-By:` line must reflect the model actually in use, not a hardcoded default.

### Detecting the active model

1. Check the `ANTHROPIC_MODEL` env var:
   ```bash
   echo "${ANTHROPIC_MODEL:-<not set>}"
   ```
2. If set (e.g. `deepseek-v4-pro`), derive the Co-Authored-By from it:
   - `deepseek-v4-pro` → `Co-Authored-By: DeepSeek V4 Pro <noreply@deepseek.com>`
   - `deepseek-v4-flash` → `Co-Authored-By: DeepSeek V4 Flash <noreply@deepseek.com>`
3. If `ANTHROPIC_MODEL` is not set, the default Anthropic model is in use. Check the system prompt or model metadata for the exact model name (Opus 4.7, Sonnet 4.6, Haiku 4.5, etc.) and use:
   - `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`
   - `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
   - `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`

Never assume "Claude Opus 4.7" — always check which model is actually running.

## Web検索のフォールバック

WebSearch がモデル互換性の問題で失敗した場合（400エラー等）、以下のフォールバックを使用する。

1. DuckDuckGo のHTML検索を WebFetch で取得:
   ```
   https://html.duckduckgo.com/html/?q=<URLエンコード済みキーワード>
   ```
2. 検索結果ページから関連URLを抽出し、必要なページを WebFetch で詳細取得する。

## 注意
- /plan-design-review は本プロジェクトでは使用しない
  （プロトコル仕様・サーバー実装のため）
- 各種インタラクションは日本語で行うこと

