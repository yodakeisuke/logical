# Issue Tool

論点（Issue）の操作を行うためのツールです。ルート論点の作成、論点の更新、論点の削除ができます。

## 使用例

### 論点の追加（add）

```json
{
  "operation": "add",
  "title": "プロジェクトの目標を明確化する"
}
```

### 論点の更新（update）

```json
{
  "operation": "update",
  "issueId": "I123",
  "title": "プロジェクトの目標を明確化して文書化する",
  "dimension": "goals"
}
```

### 論点の削除（delete）

```json
{
  "operation": "delete",
  "issueId": "I123"
}
```

## パラメータ

- `operation`: 操作種別
  - `add`: ルート論点の追加
  - `update`: 論点の更新
  - `delete`: 論点の削除
- `title`: 論点のタイトル（add/update操作で必須）
- `issueId`: 論点のID（update/delete操作で必須）
- `dimension`: 論点の次元（update操作で必須）

## 制約条件

- `add`操作では既存のルート論点がある場合はエラーになります
- `update`/`delete`操作では指定したIDの論点が存在しない場合はエラーになります
- ルート論点を削除する場合は子論点も全て削除されます

## 戻り値

成功時は更新された論理ツリーを返します。