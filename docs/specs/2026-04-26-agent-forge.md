# Gr@diusWeb3 仕様書

## プロダクト positioning

> **「Play to Design Agents — AI エージェント設計をゲームに変える。」**

AI エージェントの設計は属人的・再現性ゼロ・パラメータ多すぎで、誰も直感的にできない。Gr@diusWeb3 は、Gradius (1985) のモアイステージを UI として使い、**敵の撃ち分け** と **パワーアップバーの commit タイミング** で agent の設計判断を行う。**30〜90 秒** で完了するオンボーディング体験。

一行コピー: **「Play to Design Agents」**

## 解決する課題

1. **エージェント設計が難しい** — パラメータが多く直感的でない、何を変えるとどう変わるか分からない。
2. **トレードオフが理解できない** — 精度 vs 速度、安全性 vs 柔軟性、単体 vs マルチエージェント、コスト vs 効果。
3. **再現性がない** — なぜそのエージェントが強いのか説明できない。

## コアアイデア

> **「パワーアップバーが、トレードオフの蓄積。撃ち分けが、設計選択。」**

- **雑魚敵** = トレードオフの片側 (撃つ = 一方を選ぶ、通す = もう一方)
- **モアイ** = 5 種の design archetype (撃破するとカプセル放出 + bar 進行)
- **パワーアップバー** = トレードオフを蓄積するキュー
- **commit (button)** = 現在の bar 位置で **設計選択を確定** する瞬間

議事録グラディウス公式の直接適用: 議事録は「不要発言を撃ち落として完成」、これは「**設計をパワーアップバーで commit して個性が決まる**」。

### 2026-04-27 意味づけ・見た目の修正方針

ゲームは「ただのシューティング」ではなく、Agent 設計を 60 秒で体験させる UI である。画面内のキャラクタ・敵・機体は、見た瞬間に **Agent / DeFi / Web3 の何を意味するか** が分からなければならない。

- **敵は能力モジュール** として表示する。`SHIELD` は circuit breaker、`SPEED` は low-latency L2 execution、`OPTION` は AXL peer、`LASER` は 0G sealed reasoning、`MISSILE` は Uniswap / external tool routing を表す。
- **撃破は commit** として扱う。敵を倒すたびに play_log へ `shoot` だけでなく、対応する `capsule` / `barAdvance` / `commit` を記録し、Agent profile と policy に直接反映する。
- **モアイは制約** として表示する。Gas、latency、oracle drift、MEV / slippage、coordination risk など、実運用で Agent を止める壁を攻撃してくる存在にする。
- **機体は真面目な実行機** に寄せる。丸いマスコット感やパロディ感を避け、細い機首、硬い翼面、明確なエンジンを持つ original sprite にする。
- **HUD は現在の Agent loadout** を示す。スコアよりも、どの能力を何回 commit したか、どの execution mode に寄っているかを優先して見せる。

この修正により、爽快感は維持しつつ、プレイ結果が `Agent capability -> Web3 tool -> DeFi policy` に接続される。

### Gradius パワーアップバー 公式メカニクス → 設計選択への翻訳

```
[SPEED] [MISSILE] [DOUBLE] [LASER] [OPTION] [?]
   ↑ カプセル取得でハイライトが進む
   ↑ ボタン押下で現在位置で commit (= 該当 archetype を設計に組み込む)
   ↑ 進めて他の commit に向かうか、ここで止めるか自分で決める = 設計判断
```

| パワーアップ | 影響する agent 軸 | 意味 |
|-------------|-----------------|------|
| **SPEED** | 機動力↑ | 反応速度を上げる、軽量 agent |
| **MISSILE** | 攻撃力↑ (地形対応) | 外部 API / ツール接続を持つ |
| **DOUBLE** | 攻撃力↑ (拡散) | 多目的、多機能化 |
| **LASER** | 攻撃力↑ (集中) | 高精度・特化型 |
| **OPTION** | 協調性↑ | **multi-agent 化** (= AXL ノード追加) |
| **?** (Shield) | 防御力↑ | 安全性、損失回避 |

**重要**: bar の同じ位置で複数回 commit すると stat が累積する → 同じ trade-off に深く commit するか、複数を浅く commit するか = **集中 vs 分散** の判断が自然に発生。

## ユーザー体験 (30〜90 秒で完了)

### ① プレイ (30〜90 秒)
Gradius 風 side-scrolling シューター。背景はモアイステージ (巨大頭像が静的に並ぶ + リング弾を吐く)。プレイヤーは自由 4 方向移動、ショット射撃。

**撃ち分け** = 雑魚敵のトレードオフ選択:
雑魚敵 (空中要塞・取り巻き) に **トレードオフラベル** が付与 (例: `Slow & Safe` / `Concentrated` / `Conservative` / `Long-term` / `Low Leverage`)。撃つ = 一方、通す = もう一方。

**モアイ撃破 + パワーアップバー commit** = 設計確定:
モアイは 5 種の archetype を表す (画面の特定地点に配置):

| モアイ | archetype | 撃破時に出るカプセル傾向 |
|-------|----------|------------------------|
| 🛡 **Aegis Moai** (盾型) | Defense | ?-Shield カプセル多 |
| ⚔ **Razor Moai** (鋭角) | Attack | LASER カプセル多 |
| 🧠 **Oracle Moai** (オラクル) | Intelligence | MISSILE カプセル多 |
| 💨 **Comet Moai** (高速) | Agility | SPEED カプセル多 |
| 🤝 **Hive Moai** (群体) | Cooperation | OPTION カプセル多 |

撃破→カプセル拾う→bar 進行→commit で agent profile に転写。bar 通過した archetype は捨てた選択 = 拒否設計として記録される。

### ② 設計ログ生成

```
play_log
  → decision_pattern (撃った / 通した / 拾ったカプセル / commit したタイミング)
  → agent_profile (5 軸数値)
```

設計の **根拠** が説明可能になる (再現性確保)。

### ③ Agent 生成

- **skill 構成** (どのツールを持つか)
- **行動ポリシー** (リスク・実行戦略)
- **wallet** (シード = play_log hash、testnet only)
- **ENS subname** 自動付与 (`{name}.gradiusweb3.eth`)
- **iNFT (ERC-7857)** として mint

### ④ 可視化 (戦闘力 + radar)

5 軸 radar chart で個性表示:

- **攻撃力** (LASER / DOUBLE 由来)
- **防御力** (Shield 由来)
- **知能** (MISSILE 由来、外部接続強化)
- **機動力** (SPEED 由来)
- **協調性** (OPTION 由来、multi-agent / swarm 適性)

合成指標: **戦闘力** (5 軸の加重和) を DBZ スカウター風 UI で表示。

### ⑤ 実行

- 他 Agent (AXL 経由 P2P) と通信・協調・対戦
- 任意で DeFi タスク (Uniswap swap)
- 任意で外部 task 実行 (web fetch、計算、etc.)

## 生成される「個性」(例)

| 個性 | カプセル + commit 傾向 | 特徴 |
|------|----------------------|------|
| 🛡 **Defensive Agent** | ?-Shield 多 commit、Aegis 集中撃破 | 安全・低リスク |
| ⚡ **Aggressive Swarm** | OPTION 多 commit (Hive 撃破)、SPEED 1 commit (Comet 撃破) | 分散・高速・swarm |
| 🎯 **Sharpshooter** | LASER 多 commit (Razor 集中)、Shield 1 commit | 高精度・低リスク・低速 |
| 🤝 **Coordinator** | OPTION + MISSILE 同等 commit | swarm 統括・外部接続 |
| 🧠 **Lone Wolf** | LASER 1 commit のみ、他通過 | 単機特化、純粋スタイル |

個性に **「理由」** がある (`why this profile`、どの敵を撃ち、どのモアイを倒し、どこで commit したか) = 説明可能 + 再現可能。

## ユーザーストーリー

- **AI Agent 開発初心者** として、**30〜90 秒で自分の Agent を作りたい**。設定画面では何を入れるべきかわからない、ゲームなら直感で決まる。
- **DeFi Bot を試したい一般ユーザー** として、Bot の個性が **戦闘力 + radar** で見えるので、黒箱でない安心感がほしい。
- **Agent 開発者** として、自分の Agent 個性をプレイで定義し、iNFT として他人に譲渡・販売したい。
- **DAO / 組織の treasury 担当** として、複数 Agent をプレイスタイル違いで生成し、ポートフォリオを役割分担させたい。

## 受け入れ基準

- [ ] **30〜90 秒で完結する** Gradius 風 side-scrolling mini-game が browser 上で動作する。
- [ ] モアイステージ背景 (巨大頭像 + リング弾) が描画される。
- [ ] 5 種のモアイ (Aegis / Razor / Oracle / Comet / Hive) が出現し、撃破でカプセル放出する。
- [ ] パワーアップバー UI が動作し、カプセル取得でハイライト進行、ボタン押下で commit する。
- [ ] 各雑魚敵にトレードオフラベルが表示され、撃ち分けで設計判断が記録される。
- [ ] 敵ラベルは Agent / DeFi / Web3 上の意味を併記する。
- [ ] 敵撃破が `capsule` / `barAdvance` / `commit` として記録され、policy の tool unlock に反映される。
- [ ] 自機 sprite はパロディ・マスコット調ではなく、硬質な original execution craft として描画される。
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
- **ENS**: `{name}.gradiusweb3.eth` subname 自動付与、戦績 text record。
- **testnet**: Sepolia 主軸。

### データモデル

```typescript
type Capsule = 'speed' | 'missile' | 'double' | 'laser' | 'option' | 'shield';

type PlayEvent =
  | { kind: 'shoot'; t: number; enemyId: string; tradeoffLabel: string }
  | { kind: 'pass'; t: number; enemyId: string; tradeoffLabel: string }
  | { kind: 'capsule'; t: number; capsule: Capsule }
  | { kind: 'barAdvance'; t: number; position: number }
  | { kind: 'commit'; t: number; position: number; capsule: Capsule }
  | { kind: 'moaiKill'; t: number; moaiId: 'aegis'|'razor'|'oracle'|'comet'|'hive' }
  | { kind: 'hit'; t: number; damage: number };

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
  toolsAllowed: string[];        // missile = API access
  swarmEnabled: boolean;         // option commit = multi-agent
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

- `BirthArcade` — Gradius 風 side-scrolling mini-game (Canvas)、モアイステージ背景、トレードオフラベル付き敵 + 5 種モアイ + パワーアップバー UI。
- `RadarDisplay` — 5 軸 radar chart + 戦闘力 (DBZ スカウター風)。投資方針 5 軸を radar + 戦闘力 1 つの数字で表現する。プロファイルが見えるからこそ Bot が「黒箱でない」。
- `AgentDashboard` — Agent の行動 feed、ENS、戦闘力履歴 (時間と共に経験値で上昇)、他 Agent との通信履歴。

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
| **Gensyn AXL** | 3 | **メイン** | OPTION commit で multi-agent 化、誕生サーバー × Agent ランタイム × 対戦相手 Agent の **3 ノード以上 P2P 通信**、複数ノード要件を depth で過剰達成 |
| **0G Autonomous Agents** | 3 | **メイン** | Agent = iNFT (ERC-7857)、Storage で persistent memory、Compute で sealed inference design derivation |
| **ENS Creative** | 3 | **メイン** | `{name}.gradiusweb3.eth` 自動付与、`design-log` `combat-power` を verifiable text record (verifiable credential) として埋める = creative use |
| 0G Framework / Tooling | 2 | サブ | Agent Gradius そのものが「agent design framework」として応募可、working example agent 同梱 |
| Uniswap | 2 | サブ | DeFi タスク例として swap 実装、`FEEDBACK.md` 必須 |
| KeeperHub | 1 | 任意 | tx 実行時に integration、深さは時間次第 |

期待射程: **$15K〜$25K**。3 メイン (Gensyn $2,500 + 0G iNFT $1,500 + ENS Creative $1,250) は確実、0G framework $7,500 が上振れ。

## 2 分デモ構成

- **0:00–0:15** タイトル → 「**Konami の Gradius III は、あなたを主役にした。Gr@diusWeb3 は、あなたの agent を主役にする。**」 → 「**Play to Design Agents**」 → コイン投入 (任意で KeeperHub x402)
- **0:15–1:30** **Full Gradius Moai Stage play (75 秒)**
  - モアイステージ背景、雑魚敵にトレードオフラベル
  - 5 種モアイ撃破でカプセル放出、bar 進行
  - 途中で OPTION commit → 自機に options が付き multi-agent 化が画面で見える
  - ボス = 大型モアイ (主役 archetype) で最終 commit 判断
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
- **30〜90 秒で全機能を盛り込めるか** → ステージは 1 画面分のループ、5 モアイと 5 powerup で密度を上げる。プレイヤーが 30 秒で抜けても agent 生成は成立する設計。

## 関連ドキュメント

- 賞金詳細: `docs/prizes/`
- Architecture invariant: `docs/architecture/harness.md`
- スキル: `.claude/skills/feature/SKILL.md`、`.claude/skills/prizes/SKILL.md`
