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
- /office-hours は Builder mode で実行すること
- 各種インタラクションは日本語で行うこと
