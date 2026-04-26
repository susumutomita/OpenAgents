# Agent Forge 仕様書

## プロダクト positioning

> **「Play to Design Agents — AI エージェント設計をゲームに変える。」**

AI エージェントの設計は属人的・再現性ゼロ・パラメータ多すぎで、誰も直感的にできない。Agent Forge は、レトロゲーム (グラディウス) を UI として使い、**トレードオフの選択** でエージェントを生成する。**30〜90 秒** で完了するオンボーディング体験。

一行コピー: **「Play to Design Agents」**

## 解決する課題

1. **エージェント設計が難しい** — パラメータが多く直感的でない、何を変えるとどう変わるか分からない。
2. **トレードオフが理解できない** — 精度 vs 速度、安全性 vs 柔軟性、単体 vs マルチエージェント、コスト vs 効果。
3. **再現性がない** — なぜそのエージェントが強いのか説明できない。

## コアアイデア

> **「トレードオフを撃ち落とすことで設計する。」**

- **敵** = トレードオフの片側
- **撃つ** = もう一方を選ぶ
- **通す** = 撃った方を捨てる

議事録グラディウス公式の直接適用: 議事録は「不要発言を撃ち落として完成」、Agent Forge は「**捨てた設計を撃ち落として個性が決まる**」。

## ユーザー体験 (30〜90 秒で完了)

### ① プレイ (30〜90 秒)
グラディウス風ステージ。パワーアップ取得 = 設計選択。

| パワーアップ | 設計選択 | 影響する agent 特性 |
|-------------|---------|------------------|
| **SPEED** | 高速・低精度 | 機動力↑ 攻撃力↓ |
| **LASER** | 高精度・高コスト | 攻撃力↑ コスト↑ |
| **OPTION** | マルチエージェント | 協調性↑ (= AXL ノード追加) |
| **SHIELD** | 安全性 | 防御力↑ |
| **MISSILE** | ツール/API 連携 | 知能↑ (外部接続強化) |

敵の撃ち分け = トレードオフラベルの選択 (例: `Speed vs Safety`、`Concentrated vs Distributed`、`Aggressive vs Conservative`)。

### ② 設計ログ生成

```
play_log
  → decision_pattern (撃った / 通した / 取った powerup)
  → agent_profile (5 軸数値)
```

設計の **根拠** が説明可能になる (再現性確保)。

### ③ Agent 生成

- **skill 構成** (どのツールを持つか)
- **行動ポリシー** (リスク・実行戦略)
- **wallet** (シード = play_log hash、testnet only)
- **ENS subname** 自動付与 (`{name}.openagents.eth`)
- **iNFT (ERC-7857)** として mint

### ④ 可視化 (戦闘力 + radar)

5 軸 radar chart で個性表示:

- **攻撃力** (成功率 / 単発威力)
- **防御力** (安全性 / drawdown 制御)
- **知能** (推論 / ツール接続深さ)
- **機動力** (速度 / 反応時間)
- **協調性** (multi-agent / swarm 適性)

合成指標: **戦闘力** (5 軸の加重和) を DBZ スカウター風 UI で表示。

### ⑤ 実行

- 他 Agent (AXL 経由 P2P) と通信・協調・対戦
- 任意で DeFi タスク (Uniswap swap)
- 任意で外部 task 実行 (web fetch、計算、etc.)

## 生成される「個性」(例)

| 個性 | パワーアップ傾向 | 特徴 |
|------|-----------------|------|
| 🛡 **Defensive Agent** | SHIELD + MISSILE | 安全・外部依存・低リスク |
| ⚡ **Aggressive Swarm** | OPTION + SPEED | 分散・高速・不安定 |
| 🎯 **Sharpshooter** | LASER + SHIELD | 高精度・低リスク・低速 |
| 🤝 **Coordinator** | OPTION + MISSILE | swarm 統括・外部接続 |

個性に **「理由」** がある (`why this profile`) = 説明可能 + 再現可能。

## ユーザーストーリー

- **AI Agent 開発初心者** として、**30〜90 秒で自分の Agent を作りたい**。設定画面では何を入れるべきかわからない、ゲームなら直感で決まる。
- **DeFi Bot を試したい一般ユーザー** として、Bot の個性が **戦闘力 + radar** で見えるので、黒箱でない安心感がほしい。
- **Agent 開発者** として、自分の Agent 個性をプレイで定義し、iNFT として他人に譲渡・販売したい。
- **DAO / 組織の treasury 担当** として、複数 Agent をプレイスタイル違いで生成し、ポートフォリオを役割分担させたい。

## 受け入れ基準

- [ ] **30〜90 秒で完結する** グラディウス風 mini-game が browser 上で動作する。
- [ ] 5 種類のパワーアップ (Speed / Laser / Option / Shield / Missile) が機能する。
- [ ] 各敵にトレードオフラベルが表示され、撃ち分けで設計判断が記録される。
- [ ] play_log → agent_profile が決定的に派生する (純粋関数、テスト可能)。
- [ ] Agent 専用 wallet が play_log のハッシュから生成される (testnet)。
- [ ] **5 軸 radar chart + 戦闘力** で Agent 個性が可視化される。
- [ ] iNFT (ERC-7857) として Agent が mint される (Sepolia)。
- [ ] ENS subname が自動付与される。
- [ ] **他 Agent (別 AXL ノード) と P2P 通信できる** (Gensyn 賞要件)。
- [ ] 任意: DeFi タスク (Uniswap swap) を実行できる。
- [ ] **2 分以内のデモ動画**で全フローが見せられる。

## 非機能要件

- **パフォーマンス**: ゲーム入力遅延 < 50ms、プレイ後の Agent 誕生 + 初手通信が 5 秒以内。
- **セキュリティ**: 実資産での運用は禁止 (testnet only)。Agent wallet 上限額 `MAX_AGENT_BALANCE = 100 USDC (Sepolia)` で hardcap。
- **アクセシビリティ**: WCAG 2.1 AA。キーボード操作のみで全機能到達。色 + 形 + ラベル文字で敵種別区別。
- **i18n**: 日本語 / 英語切替。

## 技術設計

### スタック

- **フロント**: Vite + React + TypeScript、Canvas API でグラディウス描画。
- **バック**: Hono + Bun、ポリシー派生 + Agent ランタイム。
- **contracts**: ERC-7857 iNFT、ENS リゾルバ。Solidity (Foundry)。
- **AXL**: 2 ノード以上を別プロセスで起動 (誕生サーバー + Agent ランタイム)。
- **0G**: Storage (Log/KV) でプレイログ + 設計ログ + 取引履歴永続化、Compute で profile→policy 派生 (sealed)。
- **ENS**: `{name}.openagents.eth` subname 自動付与、戦績 text record。
- **testnet**: Sepolia 主軸。

### データモデル

```typescript
type PlayEvent =
  | { kind: 'shoot'; t: number; enemyId: string; tradeoffLabel: string }
  | { kind: 'pass'; t: number; enemyId: string; tradeoffLabel: string }
  | { kind: 'powerup'; t: number; type: 'speed'|'laser'|'option'|'shield'|'missile' }
  | { kind: 'hit'; t: number; damage: number }
  | { kind: 'bossKill'; t: number; bossId: string };

type PlayLog = {
  sessionId: string;
  events: PlayEvent[];
  durationMs: number; // 30000..90000
  finalScore: number;
};

type AgentProfile = {
  attack: number;       // 0..100
  defense: number;      // 0..100
  intelligence: number; // 0..100
  agility: number;      // 0..100
  cooperation: number;  // 0..100
  combatPower: number;  // composite, 0..10000
};

type AgentPolicy = {
  // generic
  toolsAllowed: string[];        // missile = API access
  swarmEnabled: boolean;         // option = multi-agent
  // DeFi (optional)
  maxPositionSizeUsd: number;
  maxDrawdownPct: number;
  slippageTolerancePct: number;
  rebalanceIntervalSec: number;
  stopLossPct: number;
};

type Agent = {
  iNftTokenId: string;
  ensName: string;
  walletAddress: string;
  profile: AgentProfile;
  policy: AgentPolicy;
  birthBlock: number;
};
```

### 派生ルール (確定的)

```typescript
seed = keccak256(JSON.stringify(playLog.events))
walletPrivKey = seed
profile = mapPlayLogToProfile(playLog)  // pure
policy = mapProfileToPolicy(profile)    // pure
initialFundingUsdc = computeInitialFunding(playLog) // pure, capped at 100
```

### API エンドポイント (Hono)

- `POST /api/birth` — プレイログ受領 → wallet 派生 + iNFT mint + ENS 登録 + 初期 USDC 送金。
- `GET /api/agents/:tokenId` — Agent 状態取得 (profile / policy / 戦闘力)。
- `POST /api/agents/:tokenId/communicate` — 他 Agent と AXL 経由で通信。
- `GET /api/agents/:tokenId/feed` — Agent 行動 feed (SSE)。

### UI コンポーネント

- `BirthArcade` — グラディウス風 mini-game (Canvas)、トレードオフラベル付き敵キャラ。
- `RadarDisplay` — 5 軸 radar chart + 戦闘力 (DBZ スカウター風)。
- `AgentDashboard` — Agent の行動 feed、ENS、戦闘力、他 Agent との通信履歴。

## スコープ外

- **実資産運用** (mainnet)。testnet only。
- 複数チェーン対応 (Sepolia 1 本)。
- Agent breeding (iNFT 合体)。フォローアップ。
- Agent marketplace のフル実装 (UI tease のみ)。
- 高度な MEV 戦略。
- 装備強化 UI (時間あれば追加)。

## Prize Targets (再優先付け)

| Prize | Score | 主・副 | 統合内容 |
|-------|-------|--------|---------|
| **Gensyn AXL** | 3 | **メイン** | OPTION パワーアップ取得で multi-agent 化、誕生サーバー × Agent ランタイム × 対戦相手 Agent の **3 ノード以上 P2P 通信**、複数ノード要件を depth で過剰達成 |
| **0G Autonomous Agents** | 3 | **メイン** | Agent = iNFT (ERC-7857)、Storage で persistent memory、Compute で sealed inference design derivation |
| **ENS Creative** | 3 | **メイン** | `{name}.openagents.eth` 自動付与、`design-log` `combat-power` を verifiable text record (verifiable credential) として埋める = creative use |
| 0G Framework / Tooling | 2 | サブ | Agent Forge そのものが「agent design framework」として応募可、working example agent 同梱 |
| Uniswap | 2 | サブ | DeFi タスク例として swap 実装、`FEEDBACK.md` 必須 |
| KeeperHub | 1 | 任意 | tx 実行時に integration、深さは時間次第 |

期待射程: **$15K〜$25K**。3 メイン (Gensyn $2,500 + 0G iNFT $1,500 + ENS Creative $1,250) は確実、0G framework $7,500 が上振れ。

## 2 分デモ構成

- **0:00–0:15** タイトル → 「**Play to Design Agents**」 → コイン投入 (任意で KeeperHub x402)
- **0:15–1:30** **Full Gradius play (75 秒)**
  - 5 種パワーアップ取得 (途中で OPTION を 2 つ取って multi-agent 化が画面で確認できる)
  - 各敵にトレードオフラベル
  - 撃ち分けで設計判断
  - ボス = 設計の主役トレードオフ (`Tight vs Loose stop-loss` 等)
- **1:30–1:45** **Agent 誕生 reveal**
  - スカウター UI: 戦闘力 1,247
  - 5 軸 radar が描画される
  - ENS 名 + iNFT explorer link
- **1:45–1:55** **Agent 実行**: 他 Agent (別ノード) と AXL で通信 → 協調タスク or 任意で Uniswap swap 実行
- **1:55–2:00** ENS verifiable credential 確認、「次のコインで refine」

タイト 2 分、main course = full play、結果が即可視化される。

## 検証手順 (One-Pass Local)

1. `bun install` で依存解決。
2. `make dev` でフロント + バック + 別ノード AXL を起動。
3. browser で `http://localhost:5173` 開いて 30〜90 秒プレイ。
4. プレイ完了で wallet 生成 + iNFT mint (Sepolia) + ENS 登録 + 別ノード Agent との通信が 5 秒以内に完了。
5. radar chart + 戦闘力が表示される。
6. `make before-commit` が green。

## リスクと緩和

- **0G Compute レイテンシ** → ポリシー派生は事前計算 + キャッシュ、リアルタイム判断は軽量ステートマシン。
- **AXL multi-node 要件未達** → 最低 3 ノード (誕生 / Agent ランタイム / 対戦相手) を別プロセスで起動。
- **ENS subname gas** → testnet 無料。
- **Uniswap API DX 摩擦** → FEEDBACK.md に逐次記録。
- **30〜90 秒で全機能を盛り込めるか** → ステージは 1 画面、5 powerup と 5 トレードオフ敵で密度を上げる。プレイヤーが 30 秒で抜けても agent 生成は成立する設計。

## 関連ドキュメント

- 賞金詳細: `docs/prizes/`
- Architecture invariant: `docs/architecture/harness.md`
- スキル: `.claude/skills/feature/SKILL.md`、`.claude/skills/prizes/SKILL.md`
