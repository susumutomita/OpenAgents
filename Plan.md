# Plan

## Gr@diusWeb3 — 2026-04-26

### 目的

**「Play to Design Agents」** — AI エージェント設計を **Gradius モアイステージ** に変えるプロダクト。雑魚撃ち分けで設計判断、5 種モアイ (Aegis / Razor / Oracle / Comet / Hive) 撃破でカプセル取得、**パワーアップバー** で commit タイミングを自分で決めて agent profile を確定する。**30〜90 秒**で agent_profile (5 軸 + 戦闘力) + iNFT + ENS 名 + wallet が生成される。Agent は他 Agent と AXL で通信、任意で DeFi タスク (Uniswap swap) を実行する。2 分デモで全フロー完結。

**議事録グラディウス公式の直接適用**: 撃ち落とし + bar commit = 設計判断 = 個性。Gradius のパワーアップバーは「トレードオフを蓄積して、どこで commit するか自分で決める」リズムそのもので、agent 設計判断のメタファーとして最強。

仕様書: [`docs/specs/2026-04-26-agent-forge.md`](./docs/specs/2026-04-26-agent-forge.md)

メイン狙い prize: **Gensyn AXL** + **0G Autonomous Agents** + **ENS Creative**。サブ: 0G Framework、Uniswap、KeeperHub。

### 制約

- **backend なし** (frontend 完結)、Vercel 静的配信、SubtleCrypto で wallet 派生。
- **testnet only** (Sepolia 主軸)、実資産運用禁止。
- **No Mock**: スタブ API / モックデータ不使用 (architecture harness で検出)。
- **No npx**: `bunx` / `nlx` を使う。
- **TDD**: 各タスクで Red → Green → Refactor。
- **One-Pass Local**: データ層 → API → UI → テストまで通る。
- **One-Pass CI**: `make before-commit` で green。
- **4 分 demo に収まる範囲**: スコープを広げない。

### タスク (依存順)

#### Wave 1: スキャフォールド (並列)
- [x] `packages/backend` (Hono) と `packages/frontend` (Vite + React) をスキャフォールド。
- [x] `contracts/` に Foundry 向け stub を配置し、ERC-7857 風 iNFT contract と ENS リゾルバ stub を追加。
- [x] `FEEDBACK.md` を repo root に作成 (Uniswap 賞要件)。
- [x] `.env.example` で testnet RPC、Uniswap API key、KeeperHub credentials 等のスロットを定義。

#### Wave 2: ドメインロジック (並列)
- [x] `mapPlayLogToProfile` 純粋関数を実装、テストで決定性 (同じ入力 → 同じ出力) を保証。
- [x] `mapProfileToPolicy` 純粋関数を実装、境界値テスト含む。
- [x] `keccak256(playLog) → wallet seed` の派生関数 + テスト。
- [x] `embedPolicy` 相当の contract stub を実装。

#### Wave 3: API + UI 統合
- [x] Hono の `POST /api/birth` を実装 (現在は local birth draft を返し、JSONL に永続化)。
- [x] React の `BirthArcade` コンポーネントを Canvas で実装、入力イベントを `PlayLog` に変換。
- [x] `ScouterDisplay` / `RadarDisplay` と `AgentDashboard` を実装。
- [ ] `BossArena` で自動ボス戦シミュ (Aave 風 LTV 突破 + KeeperHub で先逃げ)。

#### Wave 4: prize 統合 (並列、優先度別)
**メイン (必達)**:
- [ ] **Gensyn AXL**: 3 ノード以上 (誕生 / Agent ランタイム / 対戦相手) を別プロセス起動、OPTION powerup で multi-agent 化を可視化。
- [ ] **0G iNFT**: ERC-7857 mint + Sepolia explorer link 取得。
- [ ] **0G Storage**: プレイログ + agent profile + 行動履歴を Log/KV に永続化。
- [ ] **0G Compute**: profile→policy 派生を sealed inference 上で実行 (検証可能)。
- [ ] **ENS**: subname 自動付与、`design-log` `combat-power` text record (Creative track)。

**サブ (時間あれば)**:
- [ ] **Uniswap**: Agent の swap を Uniswap API で実行、FEEDBACK.md に DX 摩擦を記録。
- [ ] **KeeperHub**: x402 でコイン投入、Agent tx を private mempool 経由。

#### Wave 5: デモ + 提出物
- [ ] 4 分デモ動画撮影。
- [ ] live demo URL の公開 (Vercel + Render などで minimal deploy)。
- [ ] アーキ図作成。
- [ ] README に setup / 各 prize integration の説明。

### 検証手順

仕様書「検証手順 (One-Pass Local)」セクションを参照。

### 進捗ログ

- **2026-04-26**: 仕様書作成、ブランチ `feat/risk-gradius-agent` 切る。
- **2026-04-26**: Wave 1 完了。workspace / contract stub / `.env.example` / `FEEDBACK.md` を追加。
- **2026-04-26**: Wave 2 完了。deterministic profile / policy / wallet derivation とテストを追加。
- **2026-04-26**: Wave 3 の MVP 部分完了。Canvas arcade、`POST /api/birth`、JSONL 永続化、Radar / Dashboard を実装。
- **2026-04-26**: `make before-commit` を green で通過。

### 振り返り (実装中・実装後に追記)

#### 問題

- README が実装前提のまま prize 完成版を記述しており、現状の local MVP と乖離していた。

#### 根本原因

- 仕様を先に大きく固定した一方で、実装後の README 整合確認を後回しにしていた。

#### 予防策

- 実装完了時に Quick Start、現在のスコープ、未接続の外部 integration を必ず README に反映する。

### Known Follow-ups

- mainnet 対応 (実資産運用) は別 PR / 別フェーズ。
- Agent breeding (iNFT 合体) は v2。
- Agent marketplace UI のフル実装は v2。
- 複数チェーン (Base、Optimism Sepolia) 対応は v2。
