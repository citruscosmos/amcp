# AMCPホワイトペーパー

## AI-Mediated Component Protocol（AMCP）と AI-Mediated Corporation（AMC）の提案

著者：Akihiko Shimizu  
所属：シトラスコスモス合同会社  
連絡先：akihiko.shimizu@citruscosmos.jp, citruscosmos@gmail.com  
公開日：2026年5月6日  
バージョン：0.1

**公開URL：** https://github.com/citruscosmos/amcp/blob/main/docs/amcp-whitepaper.md  
**文書SHA-256：** 615625BB383F1F6B5AD8E6FA98F971A747BA4EFC8E4383E60256E7B5D85D7177 （本行を除いたファイルのSHA-256ハッシュ値）

---

> AIという外骨格を纏う個人（AMC）が、プロトコル（AMCP）を通じて、誠実さを資産に変えながら自由に連帯する。

---

## 要旨

本稿は、**AMCP（AI-Mediated Component Protocol）** および **AMC（AI-Mediated Corporation）** を提案し、その設計原理・技術仕様・社会的含意を論じる。

AMCPは、Anthropic社の **MCP（Model Context Protocol）** を基盤とするProfile仕様である。HTTPに対するRESTのように、MCPの3要素（Resources / Tools / Prompts）に「取引記録と信頼検証」というプロセスを付与する。AMCPに準拠したエージェント間では、 **IEDI（Intent / Evidence / Delta / Insight）** フレームワークに基づく改ざん困難な取引記録が自動生成され、この記録の蓄積が「信用の客観的証明」となる。

本稿が主張する技術革新は2点である。第一に、**MCP Tasks primitive**を活用した同期・非同期の透過的な統合によって、道具との接続を超え、アクター（人や組織）との接続を可能にする設計。第二に、やり取りを**IEDIレコード**（Intent / Evidence / Delta / Insight）として自動記録することで多元的な信用情報を生み出す仕組みであり、信用評価にとどまらず、コラボレーション方法の最適化や自動化を通じたさらなる生産性向上にも活用できる。

AMCは、AMCPを通信規格とし、AIを外骨格とした会社を指すが、本稿最後では、 **1個人1法人** を提案し、資本主義の構造的歪み（課税非対称性・情報非対称性）を、法人格の民主化とIEDI信用基盤によって解消する経路を示す。

## 第1章　はじめに

### 1-1. AIエージェント時代における個人と組織の変化

2025年以降、AIエージェントは単なるテキスト生成システムを超え、外部ツールを自律的に呼び出しながら複合的なタスクを遂行できる存在となった。メールの返信から、法律文書の検索・解釈、コードのデプロイ、さらには別のAIエージェントへの業務委託まで、AIが「代理人」として機能する範囲は急速に広がっている。

もともと組織というシステムは、プロセスや個人の振る舞いを標準化・均質化する方向に働く性質を持っている。AIが普及する以前から、組織は良くも悪くも、枠から飛び抜けた個人の活動を制限することで安定性を保ってきた。

しかし、AIの活用が広がるにつれ、個人の処理能力や創造性が拡張され、組織の枠から飛び抜ける個人はますます増えていく。その結果、組織の均質化圧力がかえって個人の創造性や生産性を制限してしまうという負の側面が、より強く表面化するようになるだろう。

この構造的な課題が問いかけるのは、個人と組織の関係の再設計である。「なぜ、AIを活かす個人は組織に所属しなければ社会と接続できないのか」。大企業は、個人が単独では持てない「信用」「処理能力」「対外的な存在感」を提供することで存在価値を持ってきた。しかし、AIが個人の処理能力を指数関数的に拡張し、かつ後述するIEDIフレームワークが個人の信用を客観的に証明できるとすれば、大組織はその根拠の一部を失う。高い生産性を持つ個人が既存組織と連携する際にも、従来の雇用・委託関係ではなく、実績と信用に基づく新しい接続のあり方が求められている。

### 1-2. MCPが切り開いた新しい空間

Anthropic社が2024年に公開した**MCP（Model Context Protocol）**は、AIモデルと外部ツール・データソースとの接続を標準化した。MCP以前は、AIシステムが外部ツールを呼び出すたびに個別の統合実装が必要だった。MCPは共通言語を定義し、「一度MCPサーバーを実装すれば、あらゆるMCPクライアントから呼び出せる」という相互運用性をもたらした。

MCPが急速に普及したのは、この相互運用性が既存システムをAI対応にする最短経路だったからである。データベース、ブラウザ、メール、カレンダー、会計システム——これらは最小限の実装でMCPサーバーとなり、AIモデルの「道具」になった。AIの能力は接続先の増加とともに指数関数的に広がり、今やほぼあらゆるデジタルサービスがMCPを通じてAIから呼び出せる世界が現実になりつつある。

### 1-3. 本稿の目的

MCPは人間とAIが道具をやりとりするプロトコルとして機能してきた。本稿が提案するAMCPは、その対象を「道具」から「取引の相手方（Actor）」に拡張する。AIエージェントどうし、またはAIエージェントとその背後にいる人間が、互いの実績を記録・検証しながら取引を行う——そのための標準プロトコルがAMCPである。

AMCPはMCPを置き換えるものではない。AMCPは**MCPのProfile仕様**であり、MCPの上位互換として機能する。AMCPに準拠したサーバーはMCPクライアントからも呼び出せるが、AMCPクライアントは取引記録・信頼検証という追加の価値を得る。

### 1-4. 本稿の構成

第2章でMCPの本質と可能性、その先に現れる非同期処理の必要性を論じる。第3〜6章でAMCPの技術仕様を詳述する。第7章がプロトコル仕様から法人概念への転換点であり、AMCがもたらす価値と社会への提言を論じる。技術仕様の形式的定義は付録A〜Fに収録する。

---

## 第2章　MCP（Model Context Protocol）の可能性と、その先へ

### 2-1. MCPとは何か：実例から理解する

MCPの本質を、広く普及している実装例を通じて説明する。

**実例①：MCP for SQLite**

AIモデルが「先月の売上上位10件を集計せよ」という指示を受けたとする。SQLite MCPサーバーが利用可能な場合、モデルはSQLクエリを生成し、MCPを通じてデータベースに直接発行する。クエリ結果はMCPレスポンスとして返り、モデルはそれを解釈して自然言語の回答を生成する。モデルはSQL実行環境を内部に持たないが、MCPを通じてデータベースを「道具」として扱える。

**実例②：MCP for Playwright**

AIモデルが「このWebフォームに入力して送信せよ」という指示を受けたとする。Playwright MCPサーバーがブラウザを操作し、結果のスクリーンショットをMCPレスポンスとして返す。モデルはブラウザを直接制御できないが、MCPを通じてWebを「道具」として扱える。

**MCPの3要素**

MCPが規定する3種の標準要素は以下の通りである。

| 要素 | 役割 | 上記実例との対応 |
|---|---|---|
| **Resources** | 読み取り可能なデータソース | SQLiteのスキーマ情報、ページのHTML |
| **Tools** | 実行可能な操作 | `execute_query`、`click_element` |
| **Prompts** | 対話を導くテンプレート | クエリ生成のシステムプロンプト |

MCPの価値は、この3要素を「すべてのMCPクライアントが理解できる共通形式」で定義したことにある。一度MCPサーバーを実装すれば、Claude Desktop、Cursor、その他あらゆるMCPクライアントから即座に呼び出せる相互運用性が生まれた。

### 2-2. モデルが出来ることを広げていく先に見えてくること

MCPはあらゆるサービス・システムをモデルの「道具」にできる。その可能性は際限がない。データベース・ブラウザ・メール・カレンダー・会計システム・決済API……接続先が増えるほど、モデルの自律度は上がる。

しかし、サービスによって応答速度は大きく異なる。

| サービス種別 | 応答速度 | 特性 |
|---|---|---|
| SQLiteのクエリ | ミリ秒単位 | 即時・決定論的 |
| 外部APIの呼び出し | 数秒 | 短時間・ネットワーク依存 |
| 人間の承認・意思決定 | 数分〜数時間 | 長時間・文脈依存 |

応答速度の幅が広がるほど、「即時応答を前提とした同期処理だけ」では対応できないシナリオが増える。AIが人間の承認を待つ間、呼び出し元はタイムアウトするか、無限に待ち続けるしかないのでは、実用的なシステムは組めない。

### 2-3. MCP Tasks primitive：MCPがすでに持つ解答

この課題に対し、MCP 2025年11月25日付け仕様は **Tasks primitive** を実験的機能として導入した。Tasks primitiveは「今呼び出す、結果は後で取得する（call-now, fetch-later）」パターンをMCP上で標準化したものである。

**Tasks primitiveのライフサイクル：**

1. クライアントが通常のリクエストに `task` フィールドを付与して送信する
2. サーバーは即座に `taskId` と状態 `working` を含む `CreateTaskResult` を返す
3. クライアントは `tasks/get` でステータスをポーリング、またはサーバーからの `notifications/tasks/status` を受信する
4. 処理が完了したら `tasks/result` で実際の結果を取得する

タスクの状態遷移：`working`（処理中）→ `input_required`（追加入力待ち）| `completed` | `failed` | `cancelled`

Tasks primitiveが提供するのは、「即時に taskId を返し、処理の完了を後から取得する」という非同期パターンの標準化である。クライアントはブロックされることなく、完了後に非同期で結果を受け取れる。

### 2-4. 道具の接続から、人・組織との接続へ：AMCPの提案

MCPは「AIと道具をつなぐ」ことを標準化し、その接続範囲を急速に広げてきた。データベース・ブラウザ・外部API・カレンダー・決済システム——これらはすべてMCPサーバーとして実装され、あらゆるAIクライアントから呼び出せる「道具」になった。

しかし、現実の仕事における最も重要な相手は、道具ではなく**人と組織**である。AIが人や組織と接続しようとするとき、道具との接続とは根本的に異なる問いが立ち現れる。「この相手は信頼できるか」「過去にどんな取引をしてきたか」「今回の依頼をこちらで判断すべきか、相手の確認を得るべきか」——道具への接続にはこうした問いは存在しない。

**AMCP（AI-Mediated Component Protocol）** は、MCPをさらに一歩進め、AIと人・組織との接続を標準化する試みである。その核心は、やり取りを**IEDIレコード**（Intent / Evidence / Delta / Insight）という形式で自動記録することにある。この記録が蓄積されることで、各アクター（個人・法人）の信用が客観的に可視化され、AIがコンテキストとして参照できる多元的な信用情報が生まれる。

さらに、IEDIレコードは信用評価にとどまらない。コラボレーションのパターンを学習して次の取引での最適な協働方法を提案し、繰り返し業務を段階的に自動化していく。MCPが「どんな道具とでもつながれる」世界を実現したように、AMCPは「どんな人・組織とでも、誠実に、効率的につながれる」世界を目指す。

第3章では、AMCPの技術仕様と設計原理を詳述する。

---

## 第3章　AMCP：MCP Profileとしての仕様

AMCPはMCPの拡張仕様であり、**MCP Profile**として定義される。HTTPに対するRESTのように、MCPの3要素（Resources / Tools / Prompts）に「取引記録と信頼検証」というプロセスを付与し、Tasks primitiveによる非同期サポートと組み合わせることで、AIと人間の間の取引を誠実に記録・検証する仕組みを提供する。

### 3-1. AMCPの位置付け：MCP Profileとは

RESTはHTTPの上に「ステートレス・URIリソース・統一インターフェース」というプロセスを定めた。同様に、AMCPはMCPの上に「取引記録・信頼検証・モード適応」というプロセスを定める。AMCPはMCPを拡張するものであり、AMCPに準拠したサーバーはMCPクライアントからも通常通り呼び出せる。

AMCPに準拠するサーバーは、以下に定めるPrimitivesセットを実装することでAMCP対応を宣言する。AMCPクライアント（オーケストレーター）は、AMCPサーバーをIEDI記録・信頼検証付きの「取引相手」として扱うことができる。

類似した関係性の例：

| 基盤 | Profile | 付加されるプロセス |
|---|---|---|
| HTTP | REST | ステートレス・URIリソース |
| HTTP | FHIR | 医療データの標準形式 |
| MCP | **AMCP** | **取引記録・信頼検証・モード適応** |

**AMCPのバージョン互換性ポリシー：**

`actor_info` Resourceの `amcp_version` フィールドにAMCP仕様バージョンを宣言する。バージョン互換性の原則は以下の通りである。

- **下位互換性の保証：** v1.xのすべてのRequesterはv1.yのProviderに接続できる（y > x であっても）。v1.y固有の新機能はv1.x RequesterからはRECOMMENDED扱いとして利用不可となるが、接続と基本取引自体は維持される。
- **メジャーバージョン変更時：** v2.0のProviderに接続しようとするv1.0 RequesterはCapabilities Resourceを参照し、v1.0互換モードでの動作可否を確認する。互換モードが提供されない場合、Requesterは接続を拒否する。
- **バージョンネゴシエーション：** MCPの機能ネゴシエーション仕様（`initialize` / `capabilities` ハンドシェイク）に準拠して実装する。

#### AMCPと既存プロトコルの関係

AMCP は MCP の上位互換 Profile であり、既存の AI エージェントエコシステムに新しいプロトコルを「置き換える」ものではない。2025〜2026年に普及した関連プロトコルとの関係を整理する。

| プロトコル | 解決する問題 | AMCPとの関係 |
|---|---|---|
| **MCP**（Anthropic, 2024） | AIモデルとツール・データソースの標準接続 | AMCPの基盤。すべてのAMCPサーバーはMCPサーバーとして呼び出せる |
| **A2A**（Google, 2025） | エージェント間のタスク委任・ルーティングの標準化 | 相補的。A2Aはルーティング・委任のインフラ。AMCPは取引の誠実さを記録・検証するインフラ（詳細後述） |
| **ERC-8004**（Ethereum, 2026） | AIエージェントのオンチェーン識別子とスコアベースレピュテーション | 設計思想が異なる。ERC-8004はスカラースコアでレピュテーションを圧縮する。AMCPのIEDI Deltaは取引種別固有の多次元差分を記録する（§4-6、詳細後述） |
| **Experian Agent Trust**（2026） | AIトランザクションの不正リスクスコアリング | 問題領域が異なる。Experian は詐欺防止。AMCPは意図と実績の一致度を蓄積して協働最適化を目指す |
| **MCP Server Cards**（2026予定） | MCPサーバーの自動ディスカバリー | AMCPのフェーズ①（発見）と重複する部分があるが、AMCPのcapabilities ResourceはIEDI実績・価格・実行モード等の追加情報を含む |

**A2Aとの差異：** Google A2Aは「エージェントがどこに何を依頼するか」（ルーティングと委任）を標準化する。AMCPは「取引の誠実さをどう記録・検証するか」（信頼蓄積と協働最適化）を標準化する。A2AはMCPと「MCP＝ツールアクセス、A2A＝エージェント間協調」として共存するが、AMCPはこれらとは直交する問題を解決する。A2AインフラストラクチャーとAMCPを組み合わせることは自然であり、矛盾しない。

**IEDIの独自性：** AMCPの中核的な新規性は、A2AにもERC-8004にも実装されていない **Intent-gap 測定（Delta）** にある。既存システムが取引評価をスカラースコアに圧縮するのに対し、IEDIのDeltaは取引種別ごとに異なる構造化された差分（例：`{delivery_time_hours: 23, additional_roundtrips: 1}`）として記録される。これにより：

1. 「どの側面で誠実か」という文脈依存の信頼情報が保持される
2. 過去のDeltaパターンへのセマンティック類似度検索によって実行モード（autonomous / cooperative）を動的に選択できる（付録E）
3. 双方向ハッシュ検証により、信頼された第三者機関なしに改ざんが検知できる

**既存設計要素との関係：** ハッシュチェーンはブロックチェーンと同一原理であり（§4-4）、ベクトル類似度検索はRAGの応用である。AMCPのprior artクレームはこれら個別技術ではなく、**「意図宣言→証跡記録→Delta測定→双方向ハッシュ検証→モード動的選択」という一連の組み合わせ設計** にある（付録A〜Eを参照）。

### 3-2. AMCP 5フェーズ構造

AMCP取引は5つのフェーズで構成される。各フェーズは対応するPrimitivesによって実現される。

| フェーズ | 名称 | 目的 | 主なPrimitives |
|---|---|---|---|
| ① | **発見** | 相手の機能・価格・可用性を確認する | Resources（actor_info / availability / capabilities） |
| ② | **信頼確認** | 過去のIEDI実績を検証する | `record_verify` / `trust_claims` |
| ③ | **合意形成** | IEDIレコードを作成し実行前見積もりを確定する | `record_start` |
| ④ | **協調実行** | 合意されたTaskを実行する（MCP Tasks primitive利用） | Actor固有Tool（`record_id`付き） |
| ⑤ | **記録・評価** | 結果を記録し、双方のIEDIレコードをクローズする | `record_feedback` / `record_close` |

### 3-3. Actor間の役割

AMCPでは取引に参加する当事者を **Actor** と呼ぶ。

| Actor | 役割 | 立場 |
|---|---|---|
| **Requester** | サービスを依頼する側 | 呼び出しを行うAMCサーバー |
| **Provider** | サービスを提供する側 | 呼び出されるAMCサーバー |

両者はそれぞれのAMCサーバー（MCPサーバー）を通じてやり取りし、IEDIレコードの**ミラーコピーを独立して保持する**。どちらの記録が正当かを双方向のハッシュ照合によって検証できる（record_close参照）。

### 3-4. AMCPのPrimitivesセット

AMCPが規定するTools・Resources・Promptsの標準実装を以下に示す。形式的なスキーマ定義は付録A〜Dに収録する。

#### AMCP標準 Resources（発見フェーズ①）

| Resource | 内容 |
|---|---|
| `actor_info` | Actor識別情報・DID・公開鍵・AMCP対応バージョン |
| `availability` | 稼働時間・応答SLA・現在の受注可否 |
| `capabilities` | 提供ツール一覧・実行モード・料金・タグ |

#### AMCP標準 Tools（フェーズ②〜⑤）

| ツール名 | フェーズ | 役割 |
|---|---|---|
| `record_start` | ③ 合意形成 | IEDIレコードを作成し、実行前の見積もり（コスト・SLA・モード）をRequesterに返す |
| `record_feedback` | ⑤ 記録・評価 | status / delta / insight_requester を提出する（1〜多回呼び出し可。最終呼び出しでIEDIレコードが確定） |
| `record_close` | ⑤ 記録・評価 | RequesterとProviderが独立計算したrecord_hashを照合し、レコードをクローズする |
| `record_verify` | ② 信頼確認 | 指定レコードのrecord_hashを照合し、ProviderのIEDIレコードが改ざんされていないか検証する |
| `trust_claims` | ② 信頼確認 | 過去のIEDI実績の定性評価（カテゴリ別の信頼度・特記事項）を返す |

#### AMCP標準 Prompts（フェーズ③・④）

| Prompt | 内容 |
|---|---|
| `intent_statement_[tool_name]` | Actor固有Toolを呼び出す際の意図記述テンプレート。intentモード用の意図宣言形式 |

#### AMCP最小準拠要件

AMCP準拠サーバーは以下の必須実装を備える必要がある。RECOMMENDEDとOPTIONALは未実装でも接続と基本取引を維持できるが、省略した場合は対応する機能が利用不可となる。

| 区分 | Primitive | 備考 |
|---|---|---|
| **REQUIRED** | `record_start` Tool | IEDIレコード作成・見積もり。これがなければAMCP取引を開始できない |
| **REQUIRED** | `record_feedback` Tool | 取引結果の記録。これがなければIEDIレコードを確定できない |
| **REQUIRED** | `record_close` Tool | 双方向ハッシュ照合。これがなければ改ざん検知が機能しない |
| **REQUIRED** | `actor_info` Resource | Actor識別・DID・AMCPバージョン宣言 |
| **REQUIRED** | `capabilities` Resource | 提供ツール一覧。RequesterがどのToolを呼べるかを宣言 |
| **REQUIRED** | Actor固有Tool（1つ以上） | `record_id` のみを引数とするAMCP準拠のTool |
| **RECOMMENDED** | `availability` Resource | 稼働時間・SLA情報。省略可だが発見フェーズ①の品質が低下する |
| **RECOMMENDED** | `record_verify` Tool | 改ざん事前検証。省略可だが信頼確認フェーズ②が省略される |
| **RECOMMENDED** | `trust_claims` Tool | 定性的信頼情報。省略可だが信頼確認フェーズ②が省略される |
| **OPTIONAL** | `intent_statement_[tool_name]` Prompt | intentモード使用時のみ必要。structured モードのみのサーバーは省略可 |

### 3-5. Actor固有ToolへのRecord_id渡し規約

`record_start` でIEDIレコードが作成された後、ProviderのActor固有Tool（例：`draft_contract`）は以下の規約で呼び出される。

**呼び出し引数は `{ "record_id": "..." }` のみ。**

`record_start` の呼び出しモードに関わらず、Actor固有Toolへの呼び出し形式は統一される。

| 呼び出しモード | record_start時の引数 | Actor Tool呼び出し時の引数 | 実行情報の保持先 |
|---|---|---|---|
| `structured` | `args` オブジェクト（明示的引数） | `{ "record_id": "..." }` のみ | Provider内部（record_start時に保存） |
| `intent` | `intent` 文字列（意図宣言のみ） | `{ "record_id": "..." }` のみ | intent文字列（AIが解釈） |

**Provider側の検証順序（4ステップ）：**

1. `record_not_found`：指定された record_id が存在しない
2. `record_unauthorized`：呼び出し元が当該レコードのRequesterでない
3. `record_expired`：`expires_at` を超過している
4. `record_already_executing`：すでに実行中のレコード（重複呼び出し）

### 3-6. IEDIレコードのライフサイクル

IEDIレコードの状態遷移は3状態を取る。

```
──(record_start呼び出し)──► estimating ──(Actor Tool呼び出し)──► executing ──(record_feedback呼び出し・record_close呼び出し)──► closed
```

| 状態 | 意味 | 有効操作 |
|---|---|---|
| `estimating` | record_start処理中（見積もり算出中） | — |
| `executing` | Actor固有Tool実行中（expires_at が有効期限） | record_feedback / record_close |
| `closed` | record_close完了（record_hashが双方で確定） | record_verify のみ |

`expires_at` 超過後：Actor固有Toolは `record_expired` を返す。record_feedback / record_close は引き続き受け付ける（事後評価のため）。

### 3-7. 実例でみるAMCPの動作

> **シナリオ：山田AMC（Requester）が鈴木AMC（Provider）に契約書ドラフトを依頼する**
>
> **①発見：** 山田のAIが鈴木のAMCPサーバーの `capabilities` Resourceを読み取る。`draft_contract` ツールが `cooperative` モード・24時間SLA・5,000円と確認。
>
> **②信頼確認：** `trust_claims` で鈴木の過去実績を照会。法務カテゴリのDelta平均が0.12（低い＝誠実）、完了率98%と確認。`record_verify` で直近3件のIEDIレコードハッシュを照合し、改ざんなしを確認。
>
> **③合意形成：** `record_start({ tool_name: "draft_contract", call_mode: "structured", args: { ... }, intent: "A社との業務委託契約書（3ヶ月・月50万円）を24時間以内に作成する" })` を呼び出す。IEDIレコード作成・見積もり（cooperative・24時間以内・5,000円・expires_at: 翌日）が返る。
>
> **④協調実行：** `draft_contract({ "record_id": "01HXYZ..." })` を呼び出す。Tasks primitiveで taskId が即時返却。鈴木のAIがドラフトを作成し、鈴木本人が確認・送付。`notifications/tasks/status` で `completed` を受信。
>
> **⑤記録・評価：** 山田のAIが `record_feedback({ record_id, status: "completed", delta: { delivery_time_hours: 23, additional_roundtrips: 1 }, insight_requester: "料金条項の確認を事前に行うと追加往復が減る" })` を呼び出す。続いて双方が `record_close` で独立計算したrecord_hashを照合し、`hash_match: true` を確認してクローズ。

---

## 第4章　IEDIフレームワーク

### 4-1. IEDIとは何か

**IEDI（Intent / Evidence / Delta / Insight）** は、活動を記録・解釈するためのコアデータ構造である。すべての取引・業務遂行・意思決定は、このフレームワークに従って一単位（IEDIレコード）として記録される。

| フィールド | 意味 | 記録タイミング | 記録主体 |
|---|---|---|---|
| **Intent（意図）** | 事前に表明した目標・計画・条件 | record_start時 | Requester（人間承認またはAI） |
| **Evidence（証跡）** | 実際に起きたこと（MCPイベントログ） | 実行中、随時 | AIが自動記録 |
| **Delta（乖離）** | IntentとEvidenceの差分。不確定要素・学習量の指標 | record_feedback時 | Requesterが算出・提出 |
| **Insight（洞察）** | Deltaから導かれた更新済み知見・次回への引き継ぎ | record_feedback時 | RequesterとProvider双方 |

IEDIがただの「ログ」と異なる点は、IntentとEvidenceの**乖離（Delta）を明示的に測定する**設計にある。Deltaが小さいということは「言ったことをやった」ことの客観的指標であり、その蓄積が信用の証明になる。

### 4-2. IEDIレコードの完全構造

IEDIレコードは以下の詳細構造を持つ。形式的なJSONスキーマは付録Aに収録する。

**レコード識別・メタデータ（record_start時に確定）：**

| フィールド | 型 | 説明 |
|---|---|---|
| `record_id` | ULID | グローバルユニークID（生成順ソート可能） |
| `requester_actor_id` | DID文字列 | RequesterのDecentralized Identifier |
| `provider_actor_id` | DID文字列 | ProviderのDecentralized Identifier |
| `requester_prev_record_hash` | SHA256文字列 \| null | Requesterのハッシュチェーン前リンク |
| `provider_prev_record_hash` | SHA256文字列 \| null | Providerのハッシュチェーン前リンク |
| `tool_called` | 文字列 | 呼び出したActor固有ToolのMCP tool_name |
| `mode_used` | autonomous \| cooperative \| delegated | 確定した実行モード |
| `intent` | 文字列 | intent_statement Promptに基づくRequesterの意図宣言 |

**Evidence（実行中に蓄積）：**

| フィールド | 型 | 説明 |
|---|---|---|
| `evidence.estimation[]` | MCPEventの配列 | 見積もりフェーズのMCPイベントログ（record_startの入出力を含む） |
| `evidence.execution[]` | MCPEventの配列 | 実行フェーズのMCPイベントログ（**非最終** record_feedbackの結果のみ。最終record_feedback・record_closeは含まない） |

> **設計上の注意：** 最終 record_feedback の結果を evidence.execution[] に含めると、その後に計算する record_hash がレコード自身の情報に依存してしまい、循環依存が生じる。このため、最終評価フィールド（status / delta / insight / completed_at）はトップレベルフィールドとして定義し、evidence.execution[] には含めない。

**最終評価（最終record_feedback完了時に確定）：**

| フィールド | 型 | 説明 |
|---|---|---|
| `status` | 列挙型（5値） | completed / no_execution / cancelled / provider_cancelled / disputed |
| `delta` | オブジェクト | IntentとEvidenceの定量的差分（構造は tool_called に依存） |
| `insight.requester` | 文字列 | RequesterのInsight（次回への引き継ぎ） |
| `insight.provider` | 文字列 | ProviderのInsight（record_feedback応答に含まれる） |
| `completed_at` | ISO 8601日時 | 最終record_feedback完了時刻 |

**クローズ（record_close完了時に確定）：**

| フィールド | 型 | 説明 |
|---|---|---|
| `record_hash` | SHA256文字列 | 全フィールド（record_hash自身を除く）の正規化JSONのSHA256。RequesterとProviderが独立計算し、hash_match: trueで確定 |

### 4-3. record_feedbackのステータス6値

record_feedback の `status` フィールドには以下の6値が定義される。

| status値 | 最終か | 意味 | 典型的な発生状況 |
|---|---|---|---|
| `rejected` | **非最終** | Providerが実行を差し戻し（再試行可能） | Provider側の事情により一時拒否、自律的に再試行 |
| `completed` | 最終 | 正常完了 | ツールが意図通りに実行・完了 |
| `no_execution` | 最終 | 実行未着手で終了 | expires_at超過など、実行前にキャンセル |
| `cancelled` | 最終 | Requesterが中止 | Requester側の事情によるキャンセル |
| `provider_cancelled` | 最終 | Providerが中止 | Provider側の事情によるキャンセル |
| `disputed` | 最終 | 双方の主張が一致しない | 紛争状態（将来仕様で解決手順を定義） |

`rejected` は非最終であり、record_feedbackの呼び出し結果がevidence.execution[]に記録される。その後Providerが自律的に再試行し、最終的に別のstatusで締められる。

> **注：** `rejected` はrecord_feedback呼び出し時の一時的なステータスであり、IEDIレコードの `status` フィールド（付録A定義の5値）には含まれない。`rejected` の結果はevidence.execution[]にMCPEventとして記録されるが、最終ステータスとして永続化されることはない。

### 4-4. ハッシュチェーンによる改ざん検知

各IEDIレコードは前レコードのrecord_hashを参照する。ブロックチェーンのハッシュリンクと同一の原理である。

```
[レコードN-1]          [レコードN]
  record_hash: H1  ←── requester_prev_record_hash: H1
                   ←── provider_prev_record_hash:  H2 ──(← Providerチェーン)
```

- `requester_prev_record_hash`：Requesterのチェーン上の直前レコードのrecord_hash
- `provider_prev_record_hash`：Providerのチェーン上の直前レコードのrecord_hash
- チェーンが繋がっていることで、過去のIEDI履歴の遡及的改ざんが記録に残る
- 初回レコードは両フィールドが null

**双方向検証の意義：** 一方向検証（Provider側のみがハッシュを保持する場合）では、Providerが第三者に提示するレコードを改ざんしても検知できない。双方向検証では、RequesterとProviderが独立計算したrecord_hashをrecord_closeで照合するため、信頼された第三者機関を必要とせずに改ざんを検知できる。

**2つの独立したハッシュチェーンの構造：**

```
【Requesterチェーン（山田AMCが関与した取引の時系列）】
[TX-A]         [TX-B]         [TX-C = 現在のレコード]
hash: RA ───► prev_req: RA  ───► prev_req: RB
              hash: RB              ...

【Providerチェーン（鈴木AMCが関与した取引の時系列・複数Requesterを含む）】
[TX-X]         [TX-Y]         [TX-C = 現在のレコード]
hash: PA ───► prev_prov: PA ───► prev_prov: PB
              hash: PB              ...

同一のIEDIレコード TX-C に両チェーンが結合する：
┌──────────────────────────────────────────────────────┐
│ IEDIレコード TX-C                                     │
│   requester_prev_record_hash: RB（山田チェーン）      │
│   provider_prev_record_hash:  PB（鈴木チェーン）      │
│   record_hash: RC（双方独立計算・record_close確定）   │
└──────────────────────────────────────────────────────┘
```

一方のチェーンを遡及的に改ざんしようとすると、そのActor側のチェーンの継続するハッシュ値がすべて変化するため、改ざんを記録から隠蔽できない。

### 4-5. 実例でみるIEDIレコード

> **山田さん（Requester）と鈴木さん（Provider）のA社契約書案件**
>
> - **Intent：**「A社との業務委託契約書（3ヶ月・月50万円）を24時間以内に作成する」
> - **Evidence：**
>   - estimation[]：record_start呼び出しログ（料金見積5,000円・cooperative・24h SLA）
>   - execution[]：draft_contract呼び出しログ、進捗通知2件、最終ドラフト送付ログ
> - **Delta：**「納期遵守：達成（23時間）、追加往復回数：1回（料金体系確認）、追加時間：+2時間」
> - **Insight（Requester）：**「鈴木さんは料金条項の確認を事前に行うと追加往復が減る。次回は意図宣言に料金体系を含める」
> - **Insight（Provider）：**「業務委託案件では料金体系を依頼者が意図宣言に含めるよう促す」

### 4-6. IEDIの累積が「信用情報」に変換されるメカニズム

複数のIEDIレコードが蓄積されることで、統計的なDeltaパターンが浮かび上がる。

- **Delta最小化の継続**が「言ったことをやるActor」の客観的証明になる
- **record_verify Tool** により、取引相手はProviderのIEDIレコードが改ざんされていないことを事前検証できる
- **trust_claims Tool** により、カテゴリ別の信頼度・特記事項を定性的に照会できる

重要なのは、IEDIが一次元のスコアではなく**多次元の文脈情報**である点である。「料金条項の確認が甘い」という特徴は、スコアとしては若干のマイナスかもしれないが、「要件定義に強い発注者が率先して料金体系を明示する」という文脈では、優良な取引相手のシグナルになりうる。この文脈依存性は、第3章で定義するtrust_claimsツール（フェーズ②）を通じて実現される。trust_claimsは過去のIEDIレコードをカテゴリ・取引相手でフィルタし、AIが文脈に応じた定性評価を生成する設計になっている。

**DeltaはScoreではない：** 既存の信用評価システム（ERC-8004のレピュテーションスコア、クラウドソーシングのレーティング等）が取引評価をスカラー値に圧縮するのに対し、IEDIのDeltaは取引種別固有の多次元差分として記録される。「納期遵守時間」「追加往復回数」「見積もりとの費用差異」はそれぞれ独立したフィールドとして保持され、trust_claimsはこれらを取引の文脈に応じて解釈する。スコアでは「どの側面で誠実か」という情報が失われるが、Delta設計ではその情報が保持される（第3章 trust_claims参照）。

### 4-7. 人間フィードバックとIEDIの精緻化

AIが自動生成したInsightに人間が確認・修正を加えることで、信用の精度が継続的に向上する。「客観ログ（Evidence）」と「主観評価（人間のフィードバック）」の組み合わせが、Actorのアイデンティティ——何が得意で、どういう状況で力を発揮し、どういう相手と相性がいいか——を形成する。

---

## 第5章　実行モードとモード判定アルゴリズム

### 5-1. 3つの実行モード

AMCPは3つの実行モードを定義する。各モードは応答形態・人間の関与度・適合する取引種別が異なる。

| モード | 名称 | 意味 | 典型的なレスポンス形態 |
|---|---|---|---|
| **autonomous** | AI単独自律実行 | 過去IEDIのDelta小・成功率高。AIが即座に実行・完了 | 同期応答（ほぼ即時） |
| **cooperative** | 人間協調実行 | 未経験領域・高額・リスクあり。Providerの人間（Actorオーナー）が関与して完了 | 非同期（Tasks primitive利用） |
| **delegated** | Requester委譲実行 | 戦略的判断・価値観判断が必要。Requester側の人間に主導権を委譲 | 非同期・Elicitation |

### 5-2. モードの宣言と実行時選択

モードは2段階で確定する。

**① 静的宣言（発見フェーズ）：** `capabilities` ResourceのToolごとに `modes` フィールドで対応モードを宣言する。これは「このToolが対応するモードの候補一覧」である。

**② 実行時確定（合意形成フェーズ）：** `record_start` の処理中に、ProviderはIEDI履歴を参照してモードを動的に判定し、`mode_used` として返却する。静的宣言が `autonomous` 固定のToolは常に `autonomous` を返す。`cooperative` と `autonomous` の双方に対応するToolは、過去実績に基づいて動的に選択する。

確定した `mode_used` はIEDIレコードに記録され、信用評価に活用される。

### 5-3. 実例でみるモード遷移

> **山田さん（Actor）のAMCPサーバーにおける同一タスクのモード変化**
>
> - 初回「週次レポートの自動生成」リクエスト → **cooperative**（未経験のため、山田本人が確認・調整）
> - 2〜4回目：Delta≒0.05前後で推移。completedが続く → cooperative を継続
> - 5回目以降：Delta平均 < 0.03、成功率100%が蓄積 → **autonomous** に自動昇格（完全自動・即時応答）
> - 「競合他社への転職者を採用すべきか」リクエスト → 価値観・戦略が関わるため **delegated** に固定。AIは資料整理のみ行い、最終判断を山田本人に委譲

### 5-4. モード判定アルゴリズム

ProviderのAMCPサーバーは、record_start呼び出し時に以下の手順でモードを判定する。疑似コードは付録Eに収録する。

1. **タスクの埋め込みベクトルを生成：** `intent` 文字列および `tool_called` からベクトルを生成
2. **類似IEDIレコードを検索：** 過去のIEDIログからベクトル近傍検索（top-K）
3. **Delta統計を算出：** 類似レコードのDeltaスコアの平均・分散・成功率を計算
4. **多元的な閾値判定：**
   - Delta平均 < `α` かつ 成功率 > `β`：`autonomous`
   - tool_configで `delegated_required: true`：`delegated`（固定）
   - それ以外：`cooperative`
5. **補正要素の適用：** 取引金額・取引先の信用度・法的リスクスコアによる downgrade（例：高額案件はDelta統計に関わらず `cooperative` に固定）

### 5-5. エンドポイント設計の意義

同一のAMCPエンドポイントで挙動が分岐することで、呼び出し元（Requester）は「どのモードか」を事前に意識する必要がない。Providerのレスポンスが同期で返ればautonomous、Tasks primitiveのtaskIdが返ればcooperativeまたはdelegatedであることが自動的にわかる。

取引相手からの体験として言い表せば：「この法人は、よく知っているタスクには即答してくれる。重要な依頼には確認チケットをくれる。予測可能で使いやすい」——これがAMCPのユーザー体験である。

---

## 第6章　AMCPサーバーのアーキテクチャ

### 6-1. サーバーのコンポーネント構成

AMCPサーバーは、コアエージェントがIEDIレコードの記録・解釈を行う構成となっている。

| コンポーネント | 役割 | 詳細 |
|---|---|---|
| **コアエージェント（Core）** | IEDIレコードの記録・解釈 | AMCの「意識」。IEDI記録管理・モード判定・信用評価を担う |
| **スペシャリスト・ハーネス（Harness）** | ドメイン特化エージェント群 | 実業務を実行するAIエージェント（法務・経理・技術等） |

### 6-2. 疎結合設計の意義

ガバナンス層（Core）とドメイン知識層（Harness）を分離することで、専門スキルの追加・削除がIEDI記録形式に影響しない。

> **実例：山田さんにマーケティングハーネスを追加した場合**
>
> Coreエージェントは記録方法を変えることなく、新ハーネスの活動を同じIEDI形式で蓄積し始める。「技術スキル」と「マーケティングスキル」のIEDIが同一フォーマットで比較・統合される。取引相手から見ると、山田さんの「信頼できる業務範囲」がそのまま拡張される。

### 6-3. リクエスト処理フロー（5フェーズ対応版）

```
外部からのMCP呼び出し
        │
        ▼
① 発見フェーズ：Resources（Read） ──────────────────── actor_info / availability / capabilities を提供
        │
        ▼
② 信頼確認フェーズ：record_verify / trust_claims ────── 過去IEDI実績を照会
        │
        ▼
③ 合意形成フェーズ：record_start ──────────────────── IEDIレコード作成・見積もり返却
        │
        ▼
④ 協調実行フェーズ：Actor固有Tool（record_id付き） ───── Coreがモードに応じてHarnessを呼び出し
        │                                              cooperative: Tasks primitive + オーナー承認
        │                                              autonomous: 即時実行
        │                                              delegated: Elicitationでオーナー判断取得
        ▼
⑤ 記録・評価フェーズ：record_feedback → record_close ── 双方向ハッシュ照合でIEDIをクローズ
```

### 6-4. MCP標準仕様へのマッピング

AMCPサーバーは標準MCP仕様を以下のように実装する。

| MCP要素 | AMCPでの実装 |
|---|---|
| **Resources** | IEDIデータベース（actor_info / availability / capabilities）、財務データ、プロジェクトステータス |
| **Tools** | AMCP標準Tools（record_* 5種） + Harnessが公開するActor固有Tool |
| **Prompts** | intent_statement_[tool_name]（意図宣言テンプレート）、その他Coreが提供するシステムプロンプト |
| **Tasks** | cooperativeモード・delegatedモードの非同期実行基盤 |

---

## 第7章　AMC（AI-Mediated Corporation）：プロトコルから法人概念へ、そして提言へ

### 7-1. プロトコルと法人形態は同一概念の異なる抽象層

本章まで、AMCPを「プロトコル仕様」として論じてきた。しかし、AMCPが完成させようとしている世界——AIを外骨格に、IEDIで誠実さを記録し、モード適応で処理時間を超越する——は、技術的なプロトコルであるのと同時に、**新しい経済単位の設計**でもある。

- **AMCP**：外界と「誠実かつ効率的に」やり取りするための言語（プロトコル層）
- **AMC**：その言語を話す、AIを外骨格とした新しい経済単位（法人層）

プロトコルと法人は同一概念の異なる抽象層である。

### 7-2. 命名の完結

AMCPの正式名称は **AI-Mediated Component Protocol** である。AIがコンポーネント（構成要素）間の取引を仲介するプロトコル、という意味を持つ。

```
AI-Mediated Component Protocol
（AIがComponentを仲介するプロトコル）
                  ↕（コンポーネントから法人へ）
AI-Mediated Corporation Protocol
（AMCのプロトコル）
```

「コンポーネント（構成要素）間の仲介」が「法人（社会の構成要素）の仲介」へ昇華する。AMCPはAMCのプロトコルであり、AMCはAMCPを話す法人である——この循環は矛盾ではなく、同一設計の同時発現である。

設計から生まれる特性として、AMCPは**適応的（Adaptive）かつ非同期（Asynchronous）**でもある——IEDIに基づくモード自動選択が「適応性」を実現し、MCP Tasks primitiveが「非同期性」を実現する。しかし、これらはAMCPの名称ではなく、「AIが仲介する」という設計思想から自然に導かれる特性である。

### 7-3. AMCの定義

**AMC（AI-Mediated Corporation）** とは、「1個人が法人格を持ち、AMCPを通信規格としてAIをコアに据え、自律的に経済活動を行う最小単位」である。

> **山田氏のAMCPサーバー = 山田氏のAMC**
>
> 山田氏は単なるフリーランサーではなく、外界からは「AIを内蔵した法人」として機能する。問い合わせに即答し（autonomousモード）、重要な判断は人間として下し（cooperativeモード）、戦略的決定は自ら主導する（delegatedモード）。すべての活動をIEDIとしてログに刻む——これがAI-Mediated Corporationの実体である。

### 7-4. AMCが「便利ツール」を超える理由

ツールは人間が使うものである。AMCは人間がAIと一体となって「法人として振る舞う」ものである。ツールは主体の外にあり、AMCは主体の延長である。

### 7-5. AMCが生み出す価値：1 AMCで中堅企業の出力

1個人が運営するAMCは、AMCPで接続されたAIが——バックオフィス処理・戦略コパイロット・外部コミュニケーション——を担うことで、中堅企業に匹敵するアウトプットを生み出せる。これは誇張ではなく、AMCの設計から導かれる論理的帰結である。

**出力拡張の3軸：**

| 軸 | 従来の個人 | AMC（AIを外骨格） |
|---|---|---|
| **処理速度** | 1人のボトルネック | autonomousモードで24時間即時応答 |
| **専門領域** | 自身の専門のみ | 外部専門AMCをAMCPで接続・調達 |
| **信用証明** | 実績が非公開・口頭のみ | IEDIログが第三者検証可能な客観的証拠 |

既存企業——リソース不足・特定技術の欠如を抱えた中堅・大企業——は、AMCPを通じてAMCに接続し、必要な能力をオンデマンドで調達できる。採用・外注という重量級の契約形態に代わり、AMCPの5フェーズが軽量かつ透明な取引基盤を提供する。「人材不足の大企業」と「単独AMC」が対等に接続する世界が、AMCPの実現する市場構造である。

### 7-6. 提言：AMCPが変える調達構造——クラウドソーシング・多重請負の先へ

AMCPはMCPのProfileである——これは技術的な定義であると同時に、重要な含意を持つ。MCPがAIモデルとツールを繋いだように、AMCPはAIモデルとActorを繋ぐ。このシフトが、既存の人員・技術調達構造に対して根本的なオルタナティブを提示する。

**既存の調達構造が抱える問題：**

企業が外部の人員・技術を調達しようとすると、現在は3種類の仲介形態のいずれかに依存することになる。

| 調達形態 | 仲介が担う機能 | 構造的コスト |
|---|---|---|
| **クラウドソーシング** | プラットフォームがマッチングと信用保証を担う | 手数料（10〜30%）・プラットフォーム依存の信用履歴・文脈の喪失 |
| **SIer多重請負** | 各受託層が調整・責任分担・マージン確保を担う | 情報の減衰（伝言ゲーム）・各層の利益抜き・実装者の不可視化 |
| **エージェント・人材派遣** | 人間エージェントがスキル判定とマッチングを担う | 選定の遅さと不透明性・実績の非可搬性・属人的判断のばらつき |

3形態に共通する構造的問題は「仲介者が信用を所有する」点にある。プラットフォームが実績データを囲い込み、SIerが下請けとの関係を保有し、エージェントが候補者の評判を独占する。発注者と受注者は仲介者を通じてのみ繋がれ、仲介者への依存は不可避となる。

**AMCPが変える仲介の構造：**

AMCPは「仲介者が信用を所有する」モデルを「プロトコルが信用を流通させる」モデルに転換する。

- **ディスカバリー** (`actor_info` / `capabilities` Resource)：AIオーケストレーターが `capabilities` を読み取り、必要なスキル・料金・応答モードを持つActorをプロトコル上で直接探索する。人間エージェントもプラットフォーム検索も不要。

- **信用検証** (`iedi_records` / `trust_claims`)：過去の取引はIEDIレコードとしてActor自身が保有し、発注者のAIモデルは `trust_claims` を照会することで「この業務領域での完了率」「Deltaの分布」「協業パターン」を動的に取得できる。信用は特定プラットフォームに閉じていない。

- **調整** (AMCPの5フェーズ)：`record_start` での意図宣言から `record_close` でのハッシュ照合まで、SIerの中間管理レイヤーが担っていた調整機能をプロトコルが代替する。発注AIと受注AMCが直接インテントを共有し、実行を記録し、フィードバックを交換する。

**調達構造の変化：**

```
【従来のSIer多重請負】
発注企業 → 元請SIer → 一次下請 → 二次下請 → 実装者
           （各層でマージン抜き・情報減衰・責任拡散）

【AMCPネットワーク】
発注AIオーケストレーター ──capabilities検索──→ 実装者AMCへ直接接続
                              ↕ AMCP 5フェーズ（意図宣言・信用確認・実行・記録）
```

仲介コストは各層のマージンから「プロトコル実行コスト」へ置き換わる。プロトコルはオープン仕様であり、特定プラットフォームへの依存はない。

**前提と展望：**

この調達構造が機能するには2つの条件が必要である。受注側がAMCPサーバーを持つActor（AMC）として振る舞えること、そして発注側のAIオーケストレーターがMCPクライアントとしてAMCPのResourcesを読み取れること。前者はAMCPサーバーの実装問題であり、後者はすでに普及しているMCPインフラの活用問題である。AMCPをMCPのProfileとして設計した理由は、まさにこの「既存インフラの上に乗る」接続性にある。

クラウドソーシング・SIer多重請負・エージェント仲介は、信用が検証できなかった時代の産物である。IEDIによって取引の誠実さが記録・検証可能になり、AIモデルがMCPを通じて直接Actorと対話できるようになった今、これらの仲介形態は構造的な代替対象になりうる。**AMCPはその代替のためのプロトコル仕様である。**

---

## 付録A（Prior Art）　IEDIレコード完全スキーマ

> **Prior Art Disclosure：** 本付録に定義するスキーマは、2026年5月6日の本稿公開をもって先行技術として確立される。

### A-1. JSONスキーマ定義

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://amcp.spec/schemas/iedi-record/v1",
  "title": "IEDIRecord",
  "description": "AMCP取引の一単位を記録するIEDIレコード。RequesterとProviderが独立してミラーコピーを保持する。",
  "type": "object",
  "required": [
    "record_id",
    "requester_actor_id",
    "provider_actor_id",
    "requester_prev_record_hash",
    "provider_prev_record_hash",
    "tool_called",
    "mode_used",
    "intent",
    "evidence"
  ],
  "properties": {
    "record_id": {
      "type": "string",
      "pattern": "^[0-9A-Z]{26}$",
      "description": "ULID形式のグローバルユニークID。Providerが生成する。"
    },
    "requester_actor_id": {
      "type": "string",
      "description": "RequesterのDID（例：did:web:yamada.amc）"
    },
    "provider_actor_id": {
      "type": "string",
      "description": "ProviderのDID（例：did:web:suzuki.amc）"
    },
    "requester_prev_record_hash": {
      "type": ["string", "null"],
      "description": "RequesterのIEDIチェーン上の直前レコードのrecord_hash（16進数小文字64文字）。初回レコードはnull。",
      "pattern": "^[0-9a-f]{64}$"
    },
    "provider_prev_record_hash": {
      "type": ["string", "null"],
      "description": "ProviderのIEDIチェーン上の直前レコードのrecord_hash（16進数小文字64文字）。初回レコードはnull。",
      "pattern": "^[0-9a-f]{64}$"
    },
    "tool_called": {
      "type": "string",
      "description": "呼び出したActor固有ToolのMCP tool_name（例：draft_contract）"
    },
    "mode_used": {
      "type": "string",
      "enum": ["autonomous", "cooperative", "delegated"],
      "description": "record_startで確定した実行モード。"
    },
    "intent": {
      "type": "string",
      "minLength": 1,
      "description": "Requesterの意図宣言文字列。intent_statement Promptテンプレートに基づく。"
    },
    "evidence": {
      "type": "object",
      "required": ["estimation", "execution"],
      "properties": {
        "estimation": {
          "type": "array",
          "description": "見積もりフェーズのMCPイベントログ。record_startの入出力イベントを含む。",
          "items": { "$ref": "#/$defs/MCPEvent" }
        },
        "execution": {
          "type": "array",
          "description": "実行フェーズのMCPイベントログ。非最終record_feedbackの結果のみ記録。最終record_feedbackおよびrecord_closeは含まない（循環ハッシュ依存を防ぐための設計）。",
          "items": { "$ref": "#/$defs/MCPEvent" }
        }
      },
      "additionalProperties": false
    },
    "status": {
      "type": "string",
      "enum": ["completed", "no_execution", "cancelled", "provider_cancelled", "disputed"],
      "description": "最終ステータス。最終record_feedback呼び出し時に確定する。（record_close完了後のみ保証）"
    },
    "delta": {
      "type": "object",
      "description": "IntentとEvidenceの定量的差分。構造はtool_calledに依存するため非厳密定義。最終record_feedback時に確定。"
    },
    "insight": {
      "type": "object",
      "properties": {
        "requester": {
          "type": "string",
          "description": "RequesterのInsight（record_feedbackで提出）"
        },
        "provider": {
          "type": "string",
          "description": "ProviderのInsight（record_feedback応答に含まれる）"
        }
      },
      "additionalProperties": false,
      "description": "最終record_feedback時に確定。"
    },
    "completed_at": {
      "type": "string",
      "format": "date-time",
      "description": "最終record_feedback完了時刻（ISO 8601、UTC）"
    },
    "record_hash": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$",
      "description": "全フィールド（record_hash自身を除く）を正規化JSONにシリアライズしたSHA-256ハッシュ（16進数小文字64文字）。record_close完了時に確定する。"
    }
  },
  "additionalProperties": false,
  "$defs": {
    "MCPEvent": {
      "type": "object",
      "required": ["timestamp", "direction", "method", "body"],
      "properties": {
        "timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "イベント発生時刻（ISO 8601、UTC）"
        },
        "direction": {
          "type": "string",
          "enum": ["request", "response"],
          "description": "request：クライアント→サーバー、response：サーバー→クライアント"
        },
        "method": {
          "type": "string",
          "description": "MCP method名（例：tools/call、tasks/get）"
        },
        "body": {
          "type": "object",
          "description": "MCPメッセージ本体（型は method により異なる）"
        }
      },
      "additionalProperties": false
    }
  }
}
```

### A-2. record_hash 正規化規則

record_hash の計算は以下の手順で行う。

**ステップ1：正規化JSONの生成**

JSON Canonicalization Scheme（JCS、RFC 8785）に従う。

- キーはUnicodeコードポイント順でソート（再帰的・すべてのネストレベルで適用）
- 文字列：UTF-8エンコード、必要なUnicodeエスケープシーケンスのみ使用
- 数値：IEEE 754倍精度浮動小数点の10進表記、不要な末尾ゼロなし
- null / boolean / 配列 / オブジェクト：RFC 8785に準拠
- ホワイトスペース：なし（改行・スペース・タブ不可）

**ステップ2：フィールドの除外**

`record_hash` フィールド自身はハッシュ計算対象から除外する。計算時点で `record_hash` が存在しない状態のオブジェクトに対して正規化JSONを生成する。

**ステップ3：SHA-256の計算**

正規化JSONをUTF-8バイト列にエンコードし、SHA-256を計算する。出力は16進数小文字64文字の文字列。

**計算例（概念的）：**

```
input_object = {all IEDI fields except record_hash}
canonical_json = JCS_serialize(input_object)  # RFC 8785準拠
record_hash = SHA256(UTF8_encode(canonical_json)).hex()
```

### A-3. 主要クレーム一覧

| クレーム | 説明 |
|---|---|
| **estimation[] / execution[]分離** | 最終評価フィールドをevidence.execution[]に含めないことで循環ハッシュ依存を防ぐ設計 |
| **ハッシュチェーン** | prev_record_hashにより過去のIEDI履歴の遡及的改ざんを検知する仕組み |
| **双方向record_hash検証** | RequesterとProviderが独立計算したrecord_hashをrecord_closeで照合する双方向クローズ設計 |
| **JCS正規化** | RFC 8785に基づくJSON正規化によりハッシュ計算の決定論的再現性を保証 |

---

## 付録B（Prior Art）　AMCP標準ツール完全スキーマ

> **Prior Art Disclosure：** 本付録に定義するツールスキーマは、2026年5月6日の本稿公開をもって先行技術として確立される。

AMCP準拠サーバーは以下の5種のMCP Toolを実装する。各ToolはMCP標準の `tools/call` プロトコルで呼び出される。

---

### B-1. `record_start`

**役割：** IEDIレコードを作成し、実行前の見積もり（コスト・SLA・モード・有効期限）をRequesterに返す。

**フェーズ：** ③ 合意形成

**Input Schema：**

```json
{
  "type": "object",
  "required": ["tool_name", "call_mode", "intent", "requester_prev_record_hash"],
  "properties": {
    "tool_name": {
      "type": "string",
      "description": "呼び出すActor固有ToolのMCP tool_name"
    },
    "call_mode": {
      "type": "string",
      "enum": ["structured", "intent"],
      "description": "structured：structuredなargs引数で実行内容を指定。intent：intent文字列のみで実行内容を表現。"
    },
    "args": {
      "type": "object",
      "description": "structuredモード時のみ必須。tool_nameのMCPスキーマに準拠した引数。Providerが内部で保持する（Actor固有Tool呼び出し時に再送不要）。"
    },
    "intent": {
      "type": "string",
      "minLength": 1,
      "description": "必須。IEDIのIntentフィールドとなる意図宣言文字列。intent_statement Promptテンプレートに基づく。intentモードでは全実行情報をこの文字列に含める。"
    },
    "requester_prev_record_hash": {
      "type": ["string", "null"],
      "pattern": "^[0-9a-f]{64}$",
      "description": "RequesterのIEDIチェーン上の直前record_hash。初回はnull。"
    },
    "public": {
      "type": "boolean",
      "default": false,
      "description": "このIEDIレコードをRequester側が公開対象とするか。ProviderのpublicフラグとのAND条件で最終的な公開可否が決まる。falseの場合、双方が当事者でなければiedi_records Resourceで参照不可。"
    }
  },
  "additionalProperties": false
}
```

**Output Schema（正常時）：**

```json
{
  "type": "object",
  "required": ["record_id", "estimated_cost", "estimated_sla", "mode_used", "expires_at"],
  "properties": {
    "record_id": {
      "type": "string",
      "pattern": "^[0-9A-Z]{26}$",
      "description": "生成されたIEDIレコードのULID"
    },
    "estimated_cost": {
      "type": "object",
      "required": ["amount", "currency"],
      "properties": {
        "amount": { "type": "number" },
        "currency": { "type": "string", "description": "ISO 4217通貨コード（例：JPY）" }
      }
    },
    "estimated_sla": {
      "type": "string",
      "description": "予想完了時間（ISO 8601 Duration形式、例：PT24H）"
    },
    "mode_used": {
      "type": "string",
      "enum": ["autonomous", "cooperative", "delegated"],
      "description": "確定した実行モード"
    },
    "expires_at": {
      "type": "string",
      "format": "date-time",
      "description": "IEDIレコードの有効期限（この時刻を過ぎるとActor固有Toolはrecord_expiredを返す）"
    },
    "provider_prev_record_hash": {
      "type": ["string", "null"],
      "pattern": "^[0-9a-f]{64}$",
      "description": "ProviderのIEDIチェーン上の直前record_hash。Requesterがrecord_hashを計算するために必要。"
    }
  },
  "additionalProperties": false
}
```

---

### B-2. `record_feedback`

**役割：** IEDIレコードのstatus / delta / insight_requesterを提出する。非最終（rejected）は複数回呼び出し可。最終呼び出しでIEDIレコードが確定し、insight_providerとcompleted_atが返される。

**フェーズ：** ⑤ 記録・評価

**Input Schema：**

```json
{
  "type": "object",
  "required": ["record_id", "status"],
  "properties": {
    "record_id": {
      "type": "string",
      "pattern": "^[0-9A-Z]{26}$"
    },
    "status": {
      "type": "string",
      "enum": ["rejected", "completed", "no_execution", "cancelled", "provider_cancelled", "disputed"],
      "description": "rejected：非最終（差し戻し）。他の5値：最終ステータス。"
    },
    "delta": {
      "type": "object",
      "description": "最終呼び出し時は必須。IntentとEvidenceの定量的差分。rejected時は省略可。"
    },
    "insight_requester": {
      "type": "string",
      "description": "最終呼び出し時は必須。RequesterのInsight。rejected時は省略可。"
    }
  },
  "additionalProperties": false
}
```

**Output Schema（非最終・rejected時）：**

```json
{
  "type": "object",
  "required": ["record_id", "is_final"],
  "properties": {
    "record_id": { "type": "string" },
    "is_final": { "type": "boolean", "const": false }
  }
}
```

**Output Schema（最終呼び出し時）：**

```json
{
  "type": "object",
  "required": ["record_id", "is_final", "insight_provider", "completed_at"],
  "properties": {
    "record_id": { "type": "string" },
    "is_final": { "type": "boolean", "const": true },
    "insight_provider": {
      "type": "string",
      "description": "ProviderのInsight"
    },
    "completed_at": {
      "type": "string",
      "format": "date-time",
      "description": "最終record_feedback完了時刻（ISO 8601、UTC）"
    }
  }
}
```

---

### B-3. `record_close`

**役割：** RequesterとProviderが独立計算したrecord_hashを照合し、IEDIレコードをclosed状態にする。

**フェーズ：** ⑤ 記録・評価（record_feedbackの直後）

**Input Schema：**

```json
{
  "type": "object",
  "required": ["record_id", "status", "record_hash"],
  "properties": {
    "record_id": {
      "type": "string",
      "pattern": "^[0-9A-Z]{26}$"
    },
    "status": {
      "type": "string",
      "enum": ["completed", "no_execution", "cancelled", "provider_cancelled", "disputed"],
      "description": "Requesterが確認した最終ステータス。Providerの保持する値と一致する必要がある。"
    },
    "record_hash": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$",
      "description": "RequesterがIEDIレコードの全フィールドから独立計算したSHA-256（付録A-2の正規化規則に従う）。"
    }
  },
  "additionalProperties": false
}
```

**Output Schema：**

```json
{
  "type": "object",
  "required": ["record_id", "hash_match", "provider_record_hash"],
  "properties": {
    "record_id": { "type": "string" },
    "hash_match": {
      "type": "boolean",
      "description": "RequesterとProviderの独立計算したrecord_hashが一致したか。trueの場合のみIEDIレコードはclosedに遷移する。"
    },
    "provider_record_hash": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$",
      "description": "Providerが独立計算したrecord_hash。hash_match: falseの場合でも返却する（デバッグ・紛争解決のため）。"
    }
  }
}
```

**hash_match: falseの場合の処置：**

`hash_match: false` が返された場合、IEDIレコードは `executing` 状態のまま維持され、自動的に `disputed` へは遷移しない。以下の手順を推奨する。

1. **実装確認：** フィールドの有無・JCS正規化の実装差異・浮動小数点の丸め処理を確認する
2. **再試行：** 修正後にrecord_closeを再度呼び出す。推奨再試行上限は3回
3. **紛争移行：** 再試行上限を超えてもhash_matchがfalseの場合、Requesterはrecord_feedbackで `status: "disputed"` を提出し、IEDIレコードを紛争状態に移行する
4. **紛争解決：** `disputed` 状態のレコードに対する具体的な解決手続きは将来仕様で定義する

> **注：** `hash_match: false` の主な原因は実装上のハッシュ計算差異（JCS正規化バグ等）であることが多い。真の改ざんと実装差異を区別するため、まず再試行を試みることを推奨する。

---

### B-4. `record_verify`

**役割：** 指定したIEDIレコードのrecord_hashを照合し、ProviderのIEDIレコードが改ざんされていないか検証する。信頼確認フェーズで過去取引の整合性を事前確認するために使用する。

**フェーズ：** ② 信頼確認

**Input Schema：**

```json
{
  "type": "object",
  "required": ["record_id"],
  "properties": {
    "record_id": {
      "type": "string",
      "pattern": "^[0-9A-Z]{26}$"
    },
    "expected_hash": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$",
      "description": "省略可。RequesterがコピーしているIEDIレコードから計算したrecord_hash。提供した場合、hash_matchフィールドで一致確認結果が返る。"
    }
  },
  "additionalProperties": false
}
```

**Output Schema：**

```json
{
  "type": "object",
  "required": ["record_id", "provider_record_hash", "verified_at"],
  "properties": {
    "record_id": { "type": "string" },
    "provider_record_hash": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$",
      "description": "Providerが現在保持するIEDIレコードから計算したrecord_hash"
    },
    "hash_match": {
      "type": "boolean",
      "description": "expected_hashが提供された場合のみ返却。provider_record_hashとの一致結果。"
    },
    "verified_at": {
      "type": "string",
      "format": "date-time",
      "description": "照合実行時刻（ISO 8601、UTC）"
    }
  }
}
```

---

### B-5. `trust_claims`

**役割：** 過去のIEDI実績の定性評価を返す。カテゴリ別の信頼度・特記事項・Delta統計を含む。

**フェーズ：** ② 信頼確認

**Input Schema：**

```json
{
  "type": "object",
  "required": [],
  "properties": {
    "category": {
      "type": "string",
      "description": "省略可。フィルタするカテゴリタグ（例：legal、accounting、engineering）。省略時は全カテゴリを返す。"
    },
    "requester_actor_id": {
      "type": "string",
      "description": "省略可。特定のRequesterとの取引実績のみにフィルタする場合に指定。"
    }
  },
  "additionalProperties": false
}
```

**Output Schema：**

```json
{
  "type": "object",
  "required": ["actor_id", "summary", "categories"],
  "properties": {
    "actor_id": {
      "type": "string",
      "description": "このProviderのDID"
    },
    "summary": {
      "type": "string",
      "description": "全体的な信頼度サマリー（自然言語）"
    },
    "categories": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "completed_count", "avg_delta_score", "completion_rate"],
        "properties": {
          "name": { "type": "string", "description": "カテゴリ名" },
          "completed_count": { "type": "integer", "description": "完了済みレコード数" },
          "avg_delta_score": { "type": "number", "description": "Delta平均スコア（低いほど誠実）" },
          "completion_rate": { "type": "number", "minimum": 0, "maximum": 1, "description": "完了率（0.0〜1.0）" },
          "notable": { "type": "string", "description": "特記事項（AIが抽出した傾向・特徴）" }
        }
      }
    }
  }
}
```

---

### B-6. Actor固有ToolへのRecord_id渡し規約（クレーム）

> **Prior Art：** AMCPに準拠するActor固有Toolへの呼び出しは、呼び出しモード（structured / intent）に関わらず、以下の形式に統一する。

```json
{
  "record_id": "<ULID>"
}
```

この設計により：
- structured モード：argsはrecord_start時点でProviderに保持されており再送不要
- intent モード：intent文字列に全実行情報が含まれており実行時追加パラメータ不要
- 呼び出し元は record_id のみ保持すればよく、Toolの実装詳細を知る必要がない

---

## 付録C（Prior Art）　AMCP標準Resourcesスキーマ

> **Prior Art Disclosure：** 本付録に定義するResourcesスキーマは、2026年5月6日の本稿公開をもって先行技術として確立される。

AMCP準拠サーバーは以下の4つのMCP Resourceを実装する。各ResourceはMCP標準の `resources/read` で取得できる。

---

### C-1. `actor_info`

**URI：** `amcp://actor/info`

**説明：** Actor（AMCサーバー）の識別情報・DID・公開鍵・AMCP対応バージョン。

```json
{
  "type": "object",
  "required": ["amcp_version", "actor_id", "display_name"],
  "properties": {
    "amcp_version": {
      "type": "string",
      "description": "対応するAMCP仕様バージョン（例：1.0）"
    },
    "actor_id": {
      "type": "string",
      "description": "このActorのDID（例：did:web:yamada.amc.example）"
    },
    "display_name": {
      "type": "string",
      "description": "AMCの表示名（例：山田AMC）"
    },
    "description": {
      "type": "string",
      "description": "このActorが提供するサービス・専門領域の概要説明"
    },
    "mode": {
      "type": "string",
      "enum": ["autonomous", "cooperative", "delegated"],
      "description": "このActorのデフォルト実行モード。各capabilityのexecution_modesでツール単位に上書き可能。"
    },
    "legal_entity": {
      "type": "object",
      "properties": {
        "jurisdiction": { "type": "string", "description": "法人登記国（ISO 3166-1 alpha-2、例：JP）" },
        "registration_number": { "type": "string", "description": "法人番号（任意公開）" }
      },
      "description": "法人登記情報（任意）"
    },
    "public_key": {
      "type": "object",
      "required": ["type", "value"],
      "properties": {
        "type": { "type": "string", "description": "鍵種別（例：Ed25519）" },
        "value": { "type": "string", "description": "公開鍵（Base64URL）" }
      },
      "description": "DID署名認証（計画中拡張）に使用する公開鍵"
    }
  }
}
```

---

### C-2. `availability`

**URI：** `amcp://actor/availability`

**説明：** 現在の受注可否・稼働時間・モード別応答SLA。

```json
{
  "type": "object",
  "required": ["currently_available", "response_sla"],
  "properties": {
    "schedule": {
      "type": "string",
      "description": "稼働スケジュールの単一文字列（例：\"Asia/Tokyo Mon-Fri 09:00-18:00\"）。autonomousモードは24時間対応のため省略可。"
    },
    "currently_available": {
      "type": "boolean",
      "description": "現在新規リクエストを受け付けているか"
    },
    "next_available": {
      "type": "string",
      "format": "date-time",
      "description": "currently_available: falseの場合に次回受付可能な日時（ISO 8601、UTC）。省略可。"
    },
    "current_load": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "description": "現在の負荷状況（任意）"
    },
    "response_sla": {
      "type": "object",
      "properties": {
        "autonomous": {
          "type": "string",
          "description": "autonomousモードの典型応答時間（ISO 8601 Duration、例：PT1M）"
        },
        "cooperative": {
          "type": "string",
          "description": "cooperativeモードの典型応答時間（例：PT24H）"
        },
        "delegated": {
          "type": "string",
          "description": "delegatedモードの典型応答時間（例：PT72H）"
        }
      },
      "description": "モード別の標準応答SLA（ISO 8601 Duration）"
    }
  }
}
```

---

### C-3. `capabilities`

**URI：** `amcp://actor/capabilities`

**説明：** 提供するActor固有ToolのAMCP拡張定義。料金・モード・呼び出し形式を含む。

```json
{
  "type": "object",
  "required": ["tools"],
  "properties": {
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["tool_name", "description", "call_modes", "execution_modes", "pricing"],
        "properties": {
          "tool_name": {
            "type": "string",
            "description": "MCP tool_name（record_startのtool_nameに対応）"
          },
          "description": {
            "type": "string",
            "description": "ツールの説明"
          },
          "call_modes": {
            "type": "array",
            "items": { "type": "string", "enum": ["structured", "intent"] },
            "description": "対応する呼び出しモード"
          },
          "execution_modes": {
            "type": "array",
            "items": { "type": "string", "enum": ["autonomous", "cooperative", "delegated"] },
            "description": "対応する実行モード（動的判定の候補一覧）"
          },
          "pricing": {
            "type": "object",
            "required": ["model"],
            "properties": {
              "model": {
                "type": "string",
                "enum": ["free", "per_call", "time_based", "subscription", "quote"],
                "description": "課金モデル。free: 無料、per_call: 呼び出し単位、time_based: 時間単位、subscription: 月額等定額、quote: 要見積もり"
              },
              "amount": { "type": "number", "description": "基本料金（model が free / quote 以外の場合）" },
              "currency": { "type": "string", "description": "ISO 4217通貨コード（例：JPY）" }
            }
          },
          "response_sla": {
            "type": "string",
            "description": "このToolのデフォルト応答SLA（ISO 8601 Duration）"
          },
          "tags": {
            "type": "array",
            "items": { "type": "string" },
            "description": "trust_claimsのカテゴリフィルタに対応するタグ（例：[legal, contract]）"
          },
          "intent_mode_supported": {
            "type": "boolean",
            "description": "intentモードをサポートするか（falseの場合はstructuredモードのみ）"
          }
        }
      }
    }
  }
}
```

**実例：**

```json
{
  "tools": [
    {
      "tool_name": "draft_contract",
      "description": "業務委託・NDA等の契約書ドラフトを作成する",
      "call_modes": ["structured", "intent"],
      "execution_modes": ["autonomous", "cooperative"],
      "pricing": { "model": "per_call", "amount": 5000, "currency": "JPY" },
      "response_sla": "PT24H",
      "tags": ["legal", "contract"],
      "intent_mode_supported": true
    }
  ]
}
```

---

### C-4. `iedi_records`

**URI：** `amcp://actor/iedi_records`

**説明：** このActorが当事者として関与した公開IEDIレコードの集合。RequesterとProviderの双方がミラーコピーを保持する対称構造であり、`public` フラグが双方でtrueのレコードのみ公開される。完全なレコードスキーマは付録Aに定義する。

```json
{
  "type": "object",
  "properties": {
    "actor_id": {
      "type": "string",
      "description": "このActorのDID"
    },
    "records": {
      "type": "array",
      "items": { "$ref": "https://amcp.spec/schemas/iedi-record/v1" },
      "description": "公開IEDIレコードの配列。付録A定義のIEDIRecordスキーマに準拠。evidence は typed event array（elicitation / logging / sampling / tool_result の各MCPイベント）で構成される。"
    },
    "pagination": {
      "type": "object",
      "properties": {
        "total": { "type": "integer", "description": "公開レコードの総件数" },
        "limit": { "type": "integer", "description": "このレスポンスの最大件数" },
        "cursor": { "type": "string", "description": "次ページ取得用カーソル（任意）" }
      }
    }
  }
}
```

**クエリパラメータ（URI Template）：**

| パラメータ | 型 | 説明 |
|---|---|---|
| `counterparty_actor_id` | DID文字列 | 特定の取引相手とのレコードにフィルタ |
| `from_date` | ISO 8601日時 | 開始日時フィルタ |
| `to_date` | ISO 8601日時 | 終了日時フィルタ |
| `limit` | 整数 | 取得件数上限（デフォルト50） |
| `cursor` | 文字列 | ページネーションカーソル |

**アクセス制御：** RequesterとProvider双方の `public` フラグが `true` のレコードのみ返却する（AND条件）。認証済みActorが当事者であるレコードは、`public` フラグに関わらず参照可能。

---

## 付録D（Prior Art）　intent_statement Promptスキーマ

> **Prior Art Disclosure：** 本付録に定義するPromptスキーマは、2026年5月6日の本稿公開をもって先行技術として確立される。

### D-1. intent_statement Promptの役割

`intent_statement_[tool_name]` は、AMCP準拠サーバーが提供するMCP Promptである。Requesterが `record_start` の `intent` フィールドに記述する意図宣言文字列を標準化するためのテンプレートを提供する。

このPromptは以下の目的を持つ：

1. **意図の網羅性確保：** 実行に必要な情報が intent 文字列に漏れなく含まれることを保証する
2. **IEDIの品質向上：** 明確な Intent が Delta の計算精度を高める
3. **structured / intent モード共通：** どちらの呼び出しモードでも、intent フィールドの形式を統一する

### D-2. Prompt スキーマ定義

```json
{
  "type": "object",
  "required": ["name", "description", "arguments"],
  "properties": {
    "name": {
      "type": "string",
      "pattern": "^intent_statement_[a-z_]+$",
      "description": "Prompt名。intent_statement_{tool_name}の形式。"
    },
    "description": {
      "type": "string",
      "description": "このPromptが対象とするtool_nameの説明"
    },
    "arguments": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "description", "required"],
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "required": { "type": "boolean" }
        }
      },
      "description": "intent文字列の生成に必要な入力変数の一覧"
    }
  }
}
```

### D-3. 実装例：`intent_statement_draft_contract`

```json
{
  "name": "intent_statement_draft_contract",
  "description": "draft_contractツール呼び出し時のintent宣言文字列を生成するテンプレート",
  "arguments": [
    { "name": "counterparty_name", "description": "契約相手方の名称", "required": true },
    { "name": "contract_type", "description": "契約種別（例：業務委託、NDA、売買）", "required": true },
    { "name": "duration", "description": "契約期間（例：3ヶ月、1年）", "required": true },
    { "name": "amount", "description": "契約金額（例：月50万円）", "required": false },
    { "name": "deadline", "description": "ドラフト納期（例：24時間以内）", "required": true },
    { "name": "special_conditions", "description": "特記事項・特別条件", "required": false }
  ]
}
```

**生成されるintent文字列の例：**

```
A社との業務委託契約書（期間：3ヶ月、金額：月50万円）を
24時間以内にドラフトする。
特記事項：知的財産権の帰属はクライアント側とする。
```

### D-4. 主要クレーム

| クレーム | 説明 |
|---|---|
| **tool_name別Promptの標準化** | `intent_statement_[tool_name]` 命名規則によるAMCP全体でのintent宣言形式の統一 |
| **structured / intent モード共通形式** | 呼び出しモードに関わらず同一のintent形式を使用することでIEDIの一貫性を保つ |

---

## 付録E　モード判定アルゴリズムの疑似コード

### E-1. アルゴリズム概要

ProviderのAMCサーバーは、`record_start` 呼び出し時に以下の手順で `mode_used` を決定する。

### E-2. 疑似コード

```python
def determine_mode(
    tool_name: str,
    intent: str,
    tool_config: ToolConfig,
    iedi_history: IEDIDatabase,
) -> ExecutionMode:
    """
    IEDIログとツール設定に基づいてmode_usedを決定する。
    
    Returns: "autonomous" | "cooperative" | "delegated"
    """

    # ステップ1：ツール設定による固定モードの確認
    if tool_config.forced_mode is not None:
        return tool_config.forced_mode  # delegated_required等の固定設定

    # ステップ2：タスクの埋め込みベクトルを生成
    task_embedding = embed(f"{tool_name}: {intent}")

    # ステップ3：類似IEDIレコードをベクトル検索
    similar_records = iedi_history.vector_search(
        embedding=task_embedding,
        tool_name=tool_name,
        top_k=10,
        status_filter=["completed", "no_execution", "cancelled"]
    )

    # ステップ4：類似実績なし → cooperative（安全側に倒す）
    if len(similar_records) == 0:
        return "cooperative"

    # ステップ5：Delta統計の算出
    delta_scores = [r.delta_score for r in similar_records]
    avg_delta = mean(delta_scores)
    completion_rate = len([r for r in similar_records if r.status == "completed"]) / len(similar_records)

    # ステップ6：高額案件は autonomous を禁止する（Delta統計に関わらず）
    estimated_amount = tool_config.pricing.base
    if estimated_amount > tool_config.autonomous_amount_threshold:
        return "cooperative"  # 高額案件は autonomous に昇格させない

    # ステップ7：autonomousへの昇格判定
    # ALPHA = Delta平均の閾値（例：0.05）、BETA = 完了率の閾値（例：0.95）
    if avg_delta < ALPHA and completion_rate > BETA:
        return "autonomous"

    # ステップ8：デフォルト
    return "cooperative"


def embed(text: str) -> List[float]:
    """テキストを埋め込みベクトルに変換する（実装はProviderに委ねる）"""
    ...


# 設定定数（Providerが調整可能）
ALPHA = 0.05   # Delta平均のautonomous昇格閾値
BETA  = 0.95   # 完了率のautonomous昇格閾値
```

### E-3. 補足

- `delta_score` はDeltaオブジェクトから算出する正規化スコア（0.0〜1.0、低いほど誠実）。算出方法はtool_calledに依存するためProviderが定義する。**この委譲は意図的な設計であり、AMCP仕様の範囲外である。** Providerは各tool_calledの特性に応じてdelta_scoreの算出式を実装すること（例：納期遵守度・追加往復回数・誤差率の加重平均）
- `ALPHA` / `BETA` はProviderが独自に調整する閾値。本仕様では値を規定しない
- 将来的には、取引先AMCのtrust_claimsスコアやリスク分類等の多元的要素を追加できる

---

## 付録F　用語集

| 用語 | 定義 |
|---|---|
| **AMC** | AI-Mediated Corporation。AIを外骨格とした1個人1法人の新形態。AMCPを通信規格として使用する |
| **AMCP** | AI-Mediated Component Protocol。MCPのProfile仕様。AIがコンポーネント（Actor）間の取引を仲介するプロトコル。設計から生まれる特性として適応的（Adaptive）かつ非同期（Asynchronous）でもある |
| **IEDI** | Intent / Evidence / Delta / Insight。AMCPが記録する取引の一単位。4フィールドで構成 |
| **Intent** | IEDIの第1フィールド。事前に表明した目標・計画・条件 |
| **Evidence** | IEDIの第2フィールド。実際に起きたことのMCPイベントログ |
| **Delta** | IEDIの第3フィールド。IntentとEvidenceの乖離。誠実さの定量指標 |
| **Insight** | IEDIの第4フィールド。Deltaから導かれた更新済み知見 |
| **Actor** | AMCPに参加する取引当事者（AMCサーバーを持つ主体） |
| **Requester** | サービスを依頼するActor。AMCPの5フェーズを起動する側 |
| **Provider** | サービスを提供するActor。Actor固有Toolを公開しIEDIレコードを生成する側 |
| **Actor固有Tool** | Provider固有のMCP Tool（例：draft_contract）。AMCPの標準ToolではなくProviderが独自に定義する |
| **record_id** | IEDIレコードのグローバルユニークID（ULID形式）。Providerがrecord_start時に生成 |
| **record_hash** | IEDIレコード全フィールド（自身を除く）の正規化JSONのSHA-256。改ざん検知に使用 |
| **autonomous** | AI単独自律実行モード。過去IEDIのDelta小・成功率高の場合に適用。同期応答 |
| **cooperative** | 人間協調実行モード。Providerの人間（AMCオーナー）が関与する。Tasks primitive利用の非同期応答 |
| **delegated** | Requester委譲実行モード。Requester側の人間が主導する。Elicitation利用の非同期応答 |
| **structured モード** | record_startの呼び出し形式。argsオブジェクトで実行内容を明示的に指定する |
| **intent モード** | record_startの呼び出し形式。intent文字列のみで実行内容を表現する |
| **MCP** | Model Context Protocol（Anthropic）。AIモデルと外部ツール・データソースを統一規格で接続するプロトコル |
| **MCP Profile** | MCPの上位互換仕様。AMCPはMCPのProfile仕様として定義される |
| **Tasks primitive** | MCPの非同期タスク管理機能（2025年11月仕様）。AMCPのcooperative / delegatedモードの基盤 |
| **DID** | Decentralized Identifier（W3C標準）。プラットフォーム非依存のAMC識別子 |
| **SBT** | Soulbound Token（ERC-5192）。譲渡不可のオンチェーン実績証明 |
| **ZKP** | Zero-Knowledge Proof（ゼロ知識証明）。中身を開示せずに条件充足を証明する暗号技術 |
| **VC** | Verifiable Credentials（W3C標準）。第三者署名付きの検証可能な実績証明書 |
| **zkTLS** | ZKP付きTLS。生データを開示せずAIサマリーの正確性を証明する技術 |
| **JCS** | JSON Canonicalization Scheme（RFC 8785）。record_hash計算のためのJSON正規化規格 |
| **ULID** | Universally Unique Lexicographically Sortable Identifier。ソート可能なグローバルユニークID。record_idに使用 |
| **ハッシュチェーン** | 各IEDIレコードが前レコードのrecord_hashを参照する連鎖構造。ブロックチェーンのDHTと同一原理 |
| **防衛的公開** | 特許取得を防ぐために設計・仕様を公開すること（Prior Art Disclosure）。本稿の主要な目的の一つ |
## 参考文献・参照仕様

### 基盤プロトコル

- **MCP（Model Context Protocol）** — Anthropic, 2024. "Model Context Protocol Specification." Version 2025-11-25. https://spec.modelcontextprotocol.io/specification/2025-11-25/
- **RFC 8785** — K. Rundgren, B. Jordan, S. Erdtman. "JSON Canonicalization Scheme (JCS)." IETF, 2020. https://www.rfc-editor.org/rfc/rfc8785
- **W3C DID** — Manu Sporny et al. "Decentralized Identifiers (DIDs) v1.0." W3C Recommendation, 2022. https://www.w3.org/TR/did-core/
- **ULID** — A. Feerasta. "Universally Unique Lexicographically Sortable Identifier." https://github.com/ulid/spec

### 関連・競合プロトコル（§3-1 比較表）

- **A2A（Agent-to-Agent Protocol）** — Google, 2025. "A2A Protocol Specification." https://google.github.io/A2A/
- **ERC-8004** — Ethereum Improvement Proposals, 2026. "AI Agent On-Chain Identity and Reputation Standard."
- **Experian Agent Trust** — Experian, 2026. "AI Transaction Risk Scoring for Agent Commerce."
- **MCP Server Cards** — Anthropic（予定）, 2026. "MCP Server Discovery and Capability Advertisement Standard."

### 識別・プライバシー技術

- **ERC-5192（Soulbound Token）** — Tim Daubenschütz. "Minimal Soulbound NFTs." Ethereum Improvement Proposals, 2022. https://eips.ethereum.org/EIPS/eip-5192
- **W3C Verifiable Credentials** — Manu Sporny et al. "Verifiable Credentials Data Model v2.0." W3C, 2024. https://www.w3.org/TR/vc-data-model-2.0/
- **ERC-4337（Account Abstraction）** — Vitalik Buterin et al. "Account Abstraction Using Alt Mempool." Ethereum Improvement Proposals, 2021. https://eips.ethereum.org/EIPS/eip-4337

---

*本稿に記載するすべての設計・アルゴリズム・データ構造は、2026年5月1日の公開をもって先行技術として確立される。*
