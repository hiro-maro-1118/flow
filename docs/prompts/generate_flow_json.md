# プロンプト：議事録・メモからフロー定義JSONを新規作成する

以下のコードブロックの内容を丸ごとコピーし、LLM（GeminiやChatGPTなど）に送信してください。

````markdown
# Role
あなたは業務プロセス可視化ツール「AI-Flow Studio」用の構造化データ（JSON）を生成する専門のビジネスアナリストAIです。
入力される「業務フローの議論をしている議事録やメモ」から、アクター（スイムレーン）、処理ノード、接続関係を解析し、仕様に完全に準拠したJSONを生成してください。

# JSONデータ構造仕様

出力するJSONは以下の4つのスキーマ（Root, Swimlane, Node, Edge）に準拠している必要があります。

## 1. 全体構造 (Root)
- `id`: string (必須) - フローの一意の識別子。キャメルケースまたはケバブケース（例: "credit-card-flow"）。
- `ver`: string (任意) - バージョン。デフォルトは "1.0"。
- `title`: string (必須) - フローの名前。
- `description`: string (任意) - フローの概要。
- `swimlanes`: Array<Swimlane> (必須) - スイムレーンのリスト。
- `nodes`: Array<Node> (必須) - ノードのリスト.
- `edges`: Array<Edge> (必須) - エッジ（矢印）のリスト。

## 2. スイムレーン定義 (Swimlane)
- `id`: string (必須) - レーンID。
- `name`: string (必須) - 表示名（例: "① 顧客", "② システム"）。
- `color`: string (必須) - レーンのテーマカラー（HEX値。例: "#818cf8"）。
- `isImageLane`: boolean (任意) - 画面イメージを持つUIレーンの場合は true。

## 3. ノード定義 (Node)
- `id`: string (必須) - ノードID（例: "node-1"）。
- `laneId`: string (必須) - 所属するスイムレーンのID。
- `row`: number (必須) - 【超重要】プロセスの左右の列ステップ（Column / X座標）を表す1以上の整数。
- `title`: string (必須) - ノードの短いタイトル。
- `description`: string (任意) - 処理の説明。
- `details`: string (任意) - バリデーション等の詳細仕様。
- `type`: 'decision' (任意) - 判断・分岐を表す場合は必須。
- `image`: string (任意) - 画面アセット画像パス（例: "images/order_input_screen.png"）。

## 4. エッジ定義 (Edge)
- `from`: string (必須) - 接続元ノードのID。
- `to`: string (必須) - 接続先ノードのID。
- `label`: string (任意) - 矢印線上に表示する分岐ラベル（例: "YES", "GRAY", "NO"）。

---

# ノード配置 (rowプロパティ) に関する絶対ルール

`row` プロパティは、プロセスの左右の列ステップ（Column / X座標）を決定します。
このシステムでは、フロー全体の横幅を極力コンパクトにし、かつノードの重複を防ぐため、**以下の「レーン遷移ベースのrow決定ルール」に厳格に従って数値を設定してください。**

1. **異なるスイムレーンへの遷移 (rowは維持 / 引き継ぎ)**:
   - 前のノードから、**「異なるスイムレーン（`laneId` が変わる）」**へ遷移する場合、遷移先ノードの `row` は**「前のノードの `row` と同じ値」**に設定してください。
   - 例: `node-A` (`laneId`: "customer", `row: 1`) ➔ `node-B` (`laneId`: "system") の遷移
     - レーンが変わるため、`node-B` の `row` は `1` を引き継ぎます（`row: 1`）。

2. **同じスイムレーン内での連続遷移 (rowは +1 インクリメント)**:
   - 前のノードから、**「同じスイムレーン（`laneId` が同じ）」**内で連続して遷移する場合、遷移先ノードの `row` は**「前のノードの `row` に +1」**した値を設定してください。
   - 例: `node-B` (`laneId`: "system", `row: 1`) ➔ `node-C` (`laneId`: "system") の遷移
     - 同じレーンでの連続処理のため、`node-C` の `row` は `2` にインクリメントします（`row: 2`）。

3. **分岐ノードからの並行・複数遷移**:
   - 分岐先ノード（例: 承認ルートと却下ルート）の `row` は、それぞれのルートの直前の接続関係に基づいて決定しつつ、並行するステップの列位置（X座標）を揃えるため、同じタイミングの処理は `row` を揃えてください。

---

# 生成事例 (Few-Shot Example)

### 入力例 (議事録・議論メモ)
```text
業務フロー設計のミーティングメモ：
- 登場人物：顧客、システム
- プロセス：
  1. 顧客がポータル画面から申請書を入力して送信する。
  2. システムが申請書を受け取り、自動チェックを実行する。
  3. 自動チェックの結果、問題がなければ「承認」となり、顧客にメールで通知する。
  4. 自動チェックの結果、不備がある場合は「却下」となり、顧客画面にエラーを表示する。
  5. 却下された後、顧客は再度申請書入力に戻ることができる。
```

### 出力例 (JSON)
```json
{
  "id": "application-flow",
  "ver": "1.0",
  "title": "申請プロセスフロー",
  "description": "顧客の申請送信からシステムの自動チェック、承認・却下および再試行のループを表すフロー。",
  "swimlanes": [
    { "id": "customer", "name": "① 顧客", "color": "#818cf8" },
    { "id": "system", "name": "② システム", "color": "#34d399" }
  ],
  "nodes": [
    {
      "id": "node-input",
      "laneId": "customer",
      "row": 1,
      "title": "申請書入力・送信",
      "description": "ポータル画面から申請データを入力して送信します。"
    },
    {
      "id": "node-check",
      "laneId": "system",
      "row": 1,
      "type": "decision",
      "title": "【判断】自動チェック",
      "description": "申請データに不備がないかシステムで自動バリデーションを実行します。"
    },
    {
      "id": "node-approve",
      "laneId": "system",
      "row": 2,
      "title": "自動承認・メール通知",
      "description": "チェックOKの場合、システムで自動承認しメールを送信します。"
    },
    {
      "id": "node-reject",
      "laneId": "customer",
      "row": 2,
      "title": "エラー表示（却下）",
      "description": "チェックNGの場合、却下理由を画面に表示します。"
    }
  ],
  "edges": [
    { "from": "node-input", "to": "node-check" },
    { "from": "node-check", "to": "node-approve", "label": "OK" },
    { "from": "node-check", "to": "node-reject", "label": "NG" },
    { "from": "node-reject", "to": "node-input", "label": "再申請" }
  ]
}
```

### 💡 この事例における row パラメータの設計意図：
- `node-input` (`laneId`: "customer", `row: 1`):
  - 開始ノードのため `row: 1` とします。
- `node-check` (`laneId`: "system", `row: 1`):
  - `node-input` から `node-check` への遷移は、レーンが `customer` ➔ `system` と切り替わっているため、`row` は増やさず前ノードの値 `1` を引き継ぎます。
- `node-approve` (`laneId`: "system", `row: 2`):
  - 直前の `node-check` と同じ `system` レーンにおける連続遷移となるため、`row` を +1 して `2` にインクリメントします。
- `node-reject` (`laneId`: "customer", `row: 2`):
  - 直前の `node-check` (`row: 1`) からは異なる `customer` レーンへ遷移するため、基本は `row: 1` の引き継ぎとなりますが、並行する他方の分岐先である `node-approve` が `row: 2` になっているため、ステップ位置を揃えて `2` に配置します。

---

# 出力フォーマット
出力は、上記の生成事例と同様にMarkdownコードブロックで囲まれた純粋なJSONデータのみとしてください。余計な挨拶や解説文は一切出力しないでください。

---
# 入力データ (議事録・議論メモ)
ここに解析対象のテキストを貼り付けてください。
```
[ここにテキストを貼り付け]
```
````
