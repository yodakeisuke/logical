# アーキテクチャ設計

本ドキュメントでは、MCPサーバー「logical-thinking」のアーキテクチャを説明します。このサーバーは関数型プログラミングの原則に基づいており、CQRSパターン（Command Query Responsibility Segregation）を採用しています。

## 全体構成

```
┌───────────────┐     ┌────────────────────────────┐     ┌───────────────┐
│   MCP Tools   │────▶│       Domain Layer         │────▶│ Persistence   │
│ (issue,       │◀────│  ┌──────────┐ ┌──────────┐ │◀────│   Layer       │
│  breakdown)   │     │  │LogicalTree│ │Breakdown │ │     └───────────────┘
└───────────────┘     │  └──────────┘ └──────────┘ │              │
                      │  ┌──────────┐              │              ▼
                      │  │  Issue   │              │     ┌───────────────┐
                      │  └──────────┘              │     │  File System  │
                      └────────────────────────────┘     │ (JSON Files)  │
                                                         └───────────────┘
```

### ディレクトリ構造

```
src/
├── common/            # 共通ユーティリティ
│   ├── id.js          # ID生成ユーティリティ
│   ├── format.js      # フォーマット変換
│   ├── mermaid.js     # Mermaid図生成
│   └── result.js      # Result型定義
│
├── term/              # ドメインモデルとロジック
│   ├── logical-tree/  # 論点ツリー
│   │   ├── data_structure.js  # 論点ツリーの型定義
│   │   └── dsl.js             # タグレスファイナルDSL
│   │
│   ├── issue/         # 論点
│   │   ├── data_structure.js  # 論点の型定義
│   │   └── dsl.js             # 論点操作DSL
│   │
│   └── breakdown/     # ブレイクダウン
│       ├── data_structure.js  # ブレイクダウンの型定義
│       └── dsl.js             # ブレイクダウン操作DSL
│
├── persistence/       # 永続化レイヤー（CQRS原則に従う）
│   └── persistence.js # 永続化機能（コマンド・クエリ）
│
└── tool/              # MCPツール実装
    ├── issue.js       # 論点操作ツール
    ├── breakdown.js   # ブレイクダウンツール
    └── index.js       # ツールのエクスポート
```

## ドメインモデル構成

### 論点ツリー（LogicalTree）

論点全体を管理するルートエンティティです。

```typescript
type LogicalTree = {
  nextStepYouNeedToTake: NextStep;           // 次のステップ
  collection: IssueCollection;               // 論点コレクション
  breakdownCollection: BreakdownCollection;  // ブレイクダウンコレクション
  meta: TreeMeta;                            // メタデータ
};
```

### 論点（Issue）

個々の論点を表すエンティティです。

```typescript
type Issue = {
  id: IssueId;               // 論点ID
  title: string;             // タイトル
  dimension: Dimension;      // 次元・切り口
  parentId: IssueId | null;  // 親論点ID（ルートはnull）
};
```

### ブレイクダウン（Breakdown）

論点の分解関係を表すエンティティです。

```typescript
type Breakdown = {
  id: BreakdownId;               // ブレイクダウンID
  parentIssueId: IssueId;        // 親論点ID
  childIssueIds: IssueId[];      // 子論点ID配列
  type: BreakdownType;           // 分解タイプ（why/what/how）
  dimension: Dimension;          // 次元・切り口
  decomposeType: DecomposeType;  // 分解型（AND/OR）
  createdAt: string;             // 作成日時
};
```

## 設計原則

### 1. 関数型プログラミング

- **不変性**: すべてのデータ構造が`Readonly`として定義され、状態の変更を防止
- **副作用の分離**: 純粋関数による処理と副作用（ファイルI/Oなど）の明示的な分離
- **代数的データ型（ADT）**: 豊かな型システムによるモデリング
- **タグレスファイナルDSL**: 操作の抽象化と解釈の分離

### 2. CQRS（コマンド・クエリ責務分離）

- **コマンド**: 状態を変更する操作（書き込み）
- **クエリ**: 状態を取得する操作（読み込み）
- **責務の分離**: 書き込みと読み込みの機能を分離し、それぞれに最適化

### 3. エラー処理

- **Result型**: 例外を使わずに型で表現されたエラーハンドリング
- **代数的データ型**: エラーバリアントによる詳細な型安全性
- **明示的な伝播**: エラーの伝播を型システムで追跡可能

## ブレイクダウンの概念

ブレイクダウンは論点の分解関係を表現する重要な概念です。

### ブレイクダウンタイプ

論点をどのような観点で分解するかを表します。

- **why**: 理由や原因の探求（なぜその論点が存在するのか）
- **what**: 要素や内容の説明（何が論点の内容なのか）
- **how**: 方法や手段の提示（どうやって実現するか）

### 分解タイプ（DecomposeType）

論点間の関係性を表します。

- **AND**: すべての子論点が必要（例: 「成功の3要素」全てが必要）
- **OR**: いずれかの子論点が選択可能（例: 「解決策の候補」から選択可能）

## データフロー

1. **ツール呼び出し**:
   - ユーザーがツール（例：`issue`、`breakdown`）を呼び出す
   - パラメータ検証（Zod）

2. **ドメイン処理**:
   - 既存データの読み込み（Query）
   - DSLインタープリタによる操作実行
   - 新しい状態の生成（不変な変換）

3. **永続化処理**:
   - 新しい状態の保存（Command）
   - スナップショットの生成

4. **レスポンス生成**:
   - JSON表現の生成
   - MCPレスポンスの構築

## 視覚化（Mermaid）
論点ツリーはクライアントサイドで可視化される。サーバサイドではjsonとして返却することが責務
