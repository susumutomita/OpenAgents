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

---

### Web3 Wiring (実体化) - 2026-04-27

#### 目的

ゲーム終了 → エージェント生成パイプラインの "Web3" 部分を string 連結から実 SDK / 実コントラクト呼び出しに置き換え、0G iNFT / Sepolia ENS / Sepolia Uniswap の 3 賞金トラックを cosmetic から meaningful に引き上げる。

#### 制約

- A 案 (0G + ENS + Uniswap) で確定。Gensyn AXL / KeeperHub は除外。
- 1 PR で一気貫通 (ヒアリング確定)。
- 0G Storage SDK は real 統合せず stub (follow-up に持ち越し)。
- 0G Galileo deploy / ENS parent 取得 / Sepolia faucet は手動オペ。

#### タスク (5 役割 parallel + integration)

- [x] 仕様書 `docs/specs/2026-04-27-web3-wiring.md`
- [x] PM レビュー `-pm-review.md` (3 ペルソナ user story / dependency graph / scope guard)
- [x] Designer 設計 `-design.md` (ASCII wireframe / 4 row state matrix / mobile)
- [x] Developer 実装: contracts (ERC-721 化, deploy script, foundry.toml) + frontend web3/ 7 module + AgentDashboard wiring
- [x] QA レビュー `-qa.md` (3 critical: tokenId griefing / privateKey 露出 / chain spoofing) → Issue #14, #15 にコメント投稿済み
- [x] User feedback `-user-feedback.md` (5 UX 問題: README 整合 / wallet 未接続導線 / tooltip / 並列署名 / 審査員向けセクション)
- [x] Integration: critical security 2 件適用 (tokenId に msg.sender バインド、privateKey 露出削除)、README 同期 (0G Compute / Subname Registry の旧記述削除)
- [ ] (follow-up) 0G Galileo に実コントラクトデプロイ + `.env` に `VITE_INFT_ADDRESS` 設定
- [ ] (follow-up) Sepolia ENS で `gradiusweb3.eth` 取得
- [ ] (follow-up) 0G Storage SDK 実統合 (現在は SHA-256 stub)
- [ ] (follow-up) wallet 未接続時の OnChainProof 表示分岐 (現在は failed 状態で止まる)
- [ ] (follow-up) StatusBar に動的 chain 表示 (現在は "CHAIN: SEPOLIA" hard-coded)
- [ ] (follow-up) Demo video 撮影 (3 分以内、0G prize 必須)

#### 検証手順

1. `cd contracts && forge test` → 7 pass
2. `make before-commit` → architecture-harness 0 / lint 0 / typecheck 0 / 22 tests / build OK
3. `bun run dev` で UI 起動、game over 後 OnChainProof セクションが表示されることを確認 (実 mint は VITE_INFT_ADDRESS 未設定のため failed 表示)

#### 進捗ログ

- 2026-04-27 21:30 — ヒアリング確定 (Sepolia ENS / 0G Galileo / 1 PR)
- 2026-04-27 21:55 — 仕様書 + 5 Issue 作成
- 2026-04-27 22:30 — 5 役割 agent 並列実行完了 (PM / Designer / Developer / QA / User)
- 2026-04-27 22:50 — security 修正 2 件 (tokenId に msg.sender バインド、privateKey 削除) + README 同期
- 2026-04-27 22:55 — 全ゲート green、PR 準備

#### 振り返り

- **問題**: Developer agent は `tokenId = keccak(playLogHash)` を実装したが、これは griefing 攻撃 (第三者が同じハッシュで先に mint してトークンを焼ける) を許す。QA agent が即指摘。
- **根本原因**: 仕様書で deterministic tokenId の derivation 詳細を msg.sender bind まで明記していなかった。「冪等性」だけ強調していたため、Developer は最小実装で `keccak(playLogHash)` にしてしまった。
- **予防策**: Phase 2 仕様書テンプレに「Security 考慮」セクションを追加 (replay / griefing / front-running / chain spoofing の 4 軸)。次の Web3 機能仕様で必ず埋める。
- **問題**: `wallet.ts` がレガシーの deterministic privateKey をまだ吐いていた。WalletConnect 移行後は使わないのに型に残り続け、`StoredAgentBirth` で永続化される潜在 leak。
- **根本原因**: 旧コード (#5 まで) のときに作った deterministic wallet を、wagmi 移行 (#8) で置き換えたが型・関数を消し損ねた。
- **予防策**: 大規模リファクタの後に dead-code sweep (gh PR `simplify` 相当) を必ず通す。
- **学び**: 5 役割 parallel agent は機能した。特に QA / User の独立視点が critical 修正と README 整合エラーを拾えた。1 Developer agent では security と UX の両方を見切れない。次回も同じ構成で。

---

### Agent 安全アテステーション (3 段重ね) - 2026-04-29

#### 目的

シューティング = Agent 安全 default オンボーディングの再フレーム (commit 5947342) を踏襲しつつ、(A) 倒した敵に misalignment 種別カードを出す / (B) プレイヤー Agent を ENS subname で名乗らせる / (C) 終了時に 100 点満点の Agent 安全スコアを 0G Storage + ENS text record で発行する 3 層を 1 PR で実装する。

仕様書: [`docs/specs/2026-04-29-agent-safety-attestation.md`](./docs/specs/2026-04-29-agent-safety-attestation.md)

メイン狙い prize: **0G Storage** + **ENS Identity / Creative**。Gensyn AXL / KeeperHub は意図的に除外、Uniswap は既存維持のみ。

#### 制約

- ブランチ: `feat/safety-tutorial` にスタック (再フレーム → 3 段重ねを 1 PR で連続)。
- ENS 親: Sepolia の `testname.eth` を user が個人購入 (.env.local で `VITE_ENS_PARENT` 上書き)、subname を NameWrapper.setSubnodeRecord で発行。
- 0G Storage: 既存の SHA-256 stub のまま、実 SDK 統合は follow-up。
- TDD: shared/safety.ts の純関数 (computeSafetyScore / deriveSafetyAttestation) を Red → Green → Refactor。
- No Mock: 既存 `architecture-harness.ts` の検出に従う。
- Plan.md / 仕様書 / ADR を先に整える (CLAUDE.md の「作業順序」に従う)。

#### タスク (5 役割 parallel + integration)

- [x] 仕様書 `docs/specs/2026-04-29-agent-safety-attestation.md`
- [ ] PM レビュー `-pm-review.md` (受け入れ基準のテストシナリオ化、依存関係、scope guard)
- [ ] Designer 設計 `-design.md` (MisalignmentToast / SafetyAttestationPanel / HUD ラベルの ASCII wireframe、a11y、エラー状態)
- [ ] Developer 実装: shared 型 + safety.ts + game/runtime.ts payload + zerog-storage.ts 拡張 + safety-attestation orchestrator + UI コンポーネント
- [ ] QA レビュー `-qa.md` (Security 4 軸 + score 純関数の境界値 + ENS / 0G failed 状態 + a11y)
- [ ] User feedback `-user-feedback.md` (未経験プレイヤー / デモ視聴者 / ENS 審査員の 3 ペルソナ)
- [ ] Integration: critical 修正反映、Plan.md 振り返り更新、ゲート全通過 → PR

#### 検証手順

1. `bun --filter @gradiusweb3/shared test` で computeSafetyScore / deriveSafetyAttestation の純関数テストが green
2. `bun scripts/architecture-harness.ts --staged --fail-on=error` 通過
3. `make before-commit` 通過 (lint / typecheck / test / build)
4. `bun run dev` で起動、ゲームプレイ → misalignment toast → game over → AgentDashboard で score / breakdown / ENS link / 0G CID 表示まで一気通貫
5. ウォレット未接続 / 接続済みの双方で UX が壊れない

#### 進捗ログ

- 2026-04-29 — `/feature` フロー Phase 0-2 完了、Prize 採点 (0G Storage 3 + ENS 3) → 仕様書承認 → ブランチ feat/safety-tutorial にスタック。
- 2026-04-29 — Phase 3 Issue 5 件作成 (#24 PM / #25 Designer / #26 Developer / #27 QA / #28 User)。
- 2026-04-29 — Phase 4 5 役割並列実装完了。Developer は shared/safety.ts (24 pass) + frontend/safety-attestation.ts (10 pass) + UI コンポーネント 2 件、PM/Designer/QA/User は派生ドキュメントを成果物として出力。
- 2026-04-29 — Phase 5 統合: QA critical #1 (subname handle 衝突 griefing、前回 tokenId 級) を反映。pilot 2 桁 → 4 桁 hex に拡張、ENS Registry の owner() で pre-flight チェック、Sepolia chain assertion を追加。Persona Z 指摘の URI スキーム (`{scheme}://{value}`) を putAttestation に固定。全ゲート green。

#### 振り返り

- **問題**: Developer agent が自動生成した handle が `pilot{2 桁}` (100 通り) で、parent owner 権限の NameWrapper.setSubnodeRecord と組み合わさると「他者保有の subname を上書き」する経路が成立した。前回 tokenId griefing と全く同じ構造 (衝突空間が狭く、parent owner の write 権限が広い)。
- **根本原因**: 仕様書 21 行目に「pilot{2 桁ランダム}」と書いた時点で、衝突空間の狭さが griefing につながると気付けなかった。Phase 2 の Security 考慮セクションに「Griefing — handle pre-claim」を入れていたものの、対策行が「衝突時 retry」止まりで「衝突空間そのものを広げる」「pre-flight ownerOf を見る」まで踏み込めていなかった。並列 QA agent がこれを critical top-1 で拾えたのが救い。
- **予防策**: ハンドル / トークン ID / nonce を含む全ての user-controllable identifier について、仕様書テンプレに「衝突空間サイズ」「parent / owner の write 権限」「pre-flight 確認手段」の 3 列を必須化する。Phase 2 仕様書テンプレ (前回追加した Security セクション) を更にこの 3 列で拡張する。
- **学び**: 並列 QA agent の独立視点が 2 PR 連続で critical を拾えた (前回 tokenId、今回 subname handle)。これは固定運用にする価値がある。Developer agent 単独では最小実装に倒れて衝突空間を考慮しない傾向。

#### Known Follow-ups

- 0G Storage SDK 実統合 (現状 SHA-256 stub のまま、URI は `sha256://{hex}` で書き込み)。
- 0G Compute による misalignment 判定 sealed inference (今回見送り)。
- KeeperHub による text record 自動更新 (今回見送り)。
- Roguelike / misalignment 重複コンボ (v2)。
- 5 種目以降の misalignment 拡張 (deceptive alignment 等)。
- demo 動画用 `?seed=demo` で 4 種 misalignment を強制表示する seed (User Persona Y 指摘)。
- SafetyAttestationPanel の encounter 行に日本語 description / example 併記、breakdown を加減算伝票形式に書き換え (User Persona X 指摘)。
- README Quick verification 表に「Agent safety attestation」行追加、Sponsor integrations の ENS 行を新 text record リストに更新 (User Persona Y 指摘)。
- 同 wallet なら同 subname を返す deterministic mode (User Persona Z 指摘、griefing 対策と両立する設計検討)。
- testname.eth (Sepolia) の個人購入 + `.env.local` の VITE_ENS_PARENT 上書き (本機能の demo 必須前提)。
- Pipeline diagram visualization (A→B→C 連結の視覚化、User Persona Y 指摘)。
- ENS write 直前の switchChain await + post-check (現状は chain assertion のみで failed に倒している)。
