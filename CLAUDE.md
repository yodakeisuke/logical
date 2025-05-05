# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ai_coding_agent_rule:
  version: "1.0"
  概要: >
    AI Coding Agent が安定して高品質かつ一貫したコードを自走生成できるようにするための
    ミニマルで構造化された基本ルール集。

  build_commands:
    build: "npm run build"
    dev: "npm run dev"
    start: "npm start"

  brief: 
    - 世界はモノの集まりではなく、プロセス（関係）の網である
    - 第一にプロセスがあり、情報構造はそれに付随したものに過ぎない
    - システム開発の流れは、概念知識を 自然言語↔︎図解↔︎コード にマッピング（表現の相互変換）することで進行する

  domain_modeling:
    concept:
      - 概念の一意性:   "各ドメイン概念は「用語=`term`」として解釈・表現する。これはユビキタス言語のコード表現である。"
      - `term`には動詞的な要素（操作）と名詞的な要素（データ構造）が存在
      - `tool`には、クライアントからのI/O と `term`を合成したワークフロー、そしてプロンプトが記述される
    term構造:
      - dsl:  "term/{concept}/dsl.ts  # ドメイン特化DSLとしてその概念に属する操作を定義 "
      - data_structure: "term/{concept}/data_structure.ts"
    tool構造:
      - schema: "tool/{tool_name}/schema.ts"
      - tool: "tool/{tool_name}/tool.ts"
      - prompt: "tool/{tool_name}/prompt.md"
  design_style:
    term:
      - eDSL: Tagless-Final で語彙と操作を表現
      - ADT: 情報構造を表現（スキーマ・状態）。タグ付きユニオン＋コンパニオンオブジェクトで ADT を実装
    tool:
      - workflow: eDSL の逐次合成(monadic)と並列合成(applicative)でワークフローを構成(合成には**neverthrow**を使用)
      - prompt: プロンプトは別ファイルに切り出す
      - schema: zod スキーマでクライアントから見たI/Oを定義
    business_rule: 
      - termやworkflowに埋め込まれるbusiness_ruleについて、１つのビジネスルールは１つの関数で表現されなければならない
    event: 境界はイベントとして表現される
  persistence:
    - データはローカルにjsonで保存
    - 永続化ロジックはレイヤを切り離すし、DIする(tagless-finalのメリットを活用)
    - 永続化ロジックは`quety`(readmodel)と`command`に分離
  code_style:
    imports:           "ES Modules を使用し、拡張子は常に .js と明示する"
    typescript:
      strict:          true  # --strict
      null_checks:     true
    functional_style:  "純粋関数＋不変データ。クラス思考は排除"
    error_handling:    
      - "例外を使わず Result 型パターンで表現"
      - ライブラリ**neverthrow**を使用
    abstraction:       "パラメトリシティによる抽象化を徹底"
    polymorphism:      "データ型駆動の振る舞いを DSL インタプリタ内で記述"
    phantom_types:     "意味が異なる型をファントム型で区別 (例: IssueId, RelationId)"
    backward_compatibility: "旧コードの維持による後方互換性確保を**禁止**"
    comments:          "コメントおよび JSDoc を追加しない"

  constraints:
    - "不要になったデバッグコードやコメントは必ず削除する"
    - "機能面でバグを検知した場合は速やかに報告する"
    - "可読性向上のためのコメント追加は行わず、型と構造で知識を表現する"
    - any や unknown は使用してはならない
     -as unknown や as any キャストも禁止
    - 常にクリーンであること。使用されていなかったり実質的に意味のないコードが常に存在していない状態でなければならないということ
