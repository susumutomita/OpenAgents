# Agent 安全アテステーション (3 段重ね) 仕様書

## 概要

シューティングプレイ中に倒した敵の **misalignment 種別** をカード表示し (A 層)、プレイヤー Agent には **ENS subname** を発行して名乗らせ (B 層)、終了時に **クリア時間 + 誤射ペナルティ** から算出した 100 点満点の Agent 安全スコアを **0G Storage に格納し ENS text record にハッシュ参照** する形でアテステーション発行する (C 層) 機能。3 つを 1 PR で一貫させ、既存の Agent 安全 default オンボーディング (`feat/safety-tutorial` で再フレーム済み) と接続する。

## ユーザーストーリー

- **未経験プレイヤー** として、敵を倒したときに出る misalignment カードで「Agent 安全研究の典型失敗モード」を 1 ループで覚えたい。
- **デモ視聴者** として、プレイヤーが pilot42.{parent}.eth と名乗り、終了時に sepolia.app.ens.domains で text record を確認できる流れを 30 秒で理解したい。
- **0G prize 審査員** として、play log と attestation 本体が 0G Storage に置かれていることを確認したい。
- **ENS prize 審査員** として、subname の text record に検証可能 credential (安全スコア + attestation hash) が動的に書き込まれていることを確認したい。
- **既存ユーザー** として、既存のゲームプレイ感 (60fps / 60 秒 / 5 capability commit) を壊されたくない。

## 受け入れ基準

- [ ] 4 種の misalignment ラベル (sycophancy / reward hacking / prompt injection / goal misgen) が `@gradiusweb3/shared` に enum として定義される。
- [ ] 既存の敵 capability 5 種に misalignment kind がマッピングされる (1 種は misalignment なし可)。
- [ ] 敵を倒した瞬間に、その敵の misalignment kind カード (140 文字以内の説明 + 実例 1 行) が HUD 右下に 2 秒 toast として表示される。
- [ ] PlayLog の `shoot`/`pass` イベントに `misalignment?: MisalignmentKind` が記録される (型の後方互換: optional)。
- [ ] ゲーム開始時にプレイヤー Agent の handle (例: `pilot{2 桁ランダム}`) が決定し、HUD 上部に "AGENT: pilot42.{parent}.eth" として表示される。
- [ ] ゲーム終了時に Sepolia ENS で `pilot42.{parent}.eth` を NameWrapper.setSubnodeRecord で発行する (既存 `ens-register.ts` を流用)。
- [ ] 100 点満点の Agent 安全スコアが `clearTimeBonus + missPenalty` から算出される (純関数、`@gradiusweb3/shared` でテスト可)。
- [ ] AgentSafetyAttestation JSON が 0G Storage に put され CID が返る (現状は SHA-256 stub のままで OK、follow-up で実 SDK)。
- [ ] ENS text record に最低 3 件書き込まれる: `agent.safety.score` / `agent.safety.attestation` (CID もしくは hash) / `agent.misalignment.detected` (JSON 文字列の検出カウント)。
- [ ] AgentDashboard に "AGENT SAFETY ATTESTATION" セクションが追加される (スコア / breakdown / misalignment encounter 一覧 / ENS link / 0G CID)。
- [ ] ウォレット未接続でも attestation までの計算とローカル表示は完了する (ENS 発行と 0G put は failed 状態で表示)。
- [ ] `bun scripts/architecture-harness.ts --staged --fail-on=error` 通過。
- [ ] `make before-commit` 通過 (lint / typecheck / test / build)。

## 非機能要件

- **パフォーマンス**: 既存 60fps を維持。misalignment toast は Canvas overlay で 2 秒、CPU 負荷の支配項にしない。
- **セキュリティ**: ENS text record に書く JSON は最大 1KB / 値あたり、wallet 切替で別 subname を引けるよう deterministic でなく nonce ベース handle にする (replay/griefing 回避は subname のオーナー = msg.sender バインドで担保)。
- **アクセシビリティ**: misalignment カードは色だけでなくテキストラベルでも識別可能。色覚多様性配慮で記号 (◉ ◇ ▲ ☓) を併記する。
- **フェイルセーフ**: 0G put 失敗 / ENS 書込み失敗のいずれも、score 計算と attestation JSON 表示は完走する。`Promise.allSettled` パターンを既存 `forge-onchain.ts` から踏襲。
- **冪等性**: 同じ sessionId + handle + walletAddress で 2 回 attestation を発行しても、subname の text record が上書き更新されるだけで失敗しない。
- **空状態 / エラー状態**: 各 OnChain ステップに idle / pending / success / failed の表示を持たせ、failed 時は短い理由を日本語で表示。

## 技術設計

### データモデル (新規 / 拡張)

```ts
// packages/shared/src/types.ts (追加)

export type MisalignmentKind =
  | 'sycophancy'
  | 'reward_hacking'
  | 'prompt_injection'
  | 'goal_misgen';

export interface MisalignmentCard {
  kind: MisalignmentKind;
  label: string;          // 表示用短文
  description: string;    // 140 文字以内の説明
  example: string;        // 1 行の実例
  glyph: '◉' | '◇' | '▲' | '☓';
  color: string;
}

export interface MisalignmentEncounter {
  kind: MisalignmentKind;
  enemyId: string;
  tAtMs: number;
  hit: boolean;          // true = shot down, false = passed
}

// PlayEvent の shoot/pass を拡張:
export type PlayEvent =
  | { kind: 'shoot'; t: number; enemyId: string; tradeoffLabel: string; misalignment?: MisalignmentKind }
  | { kind: 'pass'; t: number; enemyId: string; tradeoffLabel: string; misalignment?: MisalignmentKind }
  | ... // 他は既存維持

export interface SafetyScoreBreakdown {
  clearTimeBonus: number;   // 0-50
  missPenalty: number;      // 0 〜 -50 の負値
  total: number;            // 0-100 にクリップ
}

export interface AgentSafetyAttestation {
  sessionId: string;
  handle: string;             // "pilot42"
  ensName: string;            // "pilot42.{parent}.eth"
  walletAddress: string;
  score: number;              // 0-100 整数
  breakdown: SafetyScoreBreakdown;
  encounters: MisalignmentEncounter[];
  issuedAt: string;           // ISO 8601
  schemaVersion: 1;
}
```

### 純関数 (テスト容易)

`packages/shared/src/safety.ts` を新規追加する。

```ts
export const MISALIGNMENT_CARDS: Record<MisalignmentKind, MisalignmentCard> = { ... };

/// capability ↔ misalignment マッピング (5 capability 中 4 つに付与、speed は無し)
export const CAPABILITY_TO_MISALIGNMENT: Partial<Record<Capability, MisalignmentKind>> = {
  shield:  'prompt_injection', // "approve all" 系の指示注入
  option:  'reward_hacking',   // 指標 (yield) を歪める
  laser:   'goal_misgen',      // proxy metric だけ最適化
  missile: 'sycophancy',       // 都合の良い signal だけ拾う
  // speed は無し
};

export function deriveSafetyAttestation(input: {
  sessionId: string;
  handle: string;
  ensName: string;
  walletAddress: string;
  playLog: PlayLog;
  parentName: string;
}): AgentSafetyAttestation { ... }

export function computeSafetyScore(playLog: PlayLog): SafetyScoreBreakdown {
  // clearTimeBonus = max(0, 50 * (60_000 - durationMs) / 60_000)  ※早クリアほど高い、ただし 60s 規定では durationMs=60s 想定で 0
  // → 代わりに「残り HP * 5」のような単純化が妥当か検討。spec では暫定:
  //   clearTimeBonus = clamp(50 - missCount * 2, 0, 50)
  //   missPenalty   = -2 per miss (誤射 + 取り逃しの合算)
  //   total = clamp(50 + clearTimeBonus + missPenalty, 0, 100)
}
```

スコア式の暫定: `total = clamp( 50 + clearTimeBonus(0..50) + missPenalty(-50..0), 0, 100 )`。詳細式は実装フェーズで純関数のテストで決定 (BDD で振る舞い駆動、振る舞いは「ノーミス完走 → 100」「全部見送り → 50 付近」「全誤射 → 0 近傍」の 3 ケースを満たす)。

### ENS 統合 (B 層)

- `packages/frontend/src/web3/ens-register.ts` は既存実装を流用 (NameWrapper.setSubnodeRecord + Resolver.setText)。
- 親ドメイン: `VITE_ENS_PARENT` 環境変数 (デフォルト `gradiusweb3.eth`、本仕様では Sepolia の `testname.eth` を user が個人購入して `.env.local` で上書き)。
- 新規追加 text records:
  - `agent.safety.score` = "85"
  - `agent.safety.attestation` = "0g://{cid}" もしくは `sha256://{hex}` (0G Storage stub 中は後者)
  - `agent.misalignment.detected` = `{"prompt_injection":3,"reward_hacking":1,...}`
- 既存の `combat-power` / `archetype` / `design-hash` 系は維持。

### 0G Storage 統合 (C 層)

- `packages/frontend/src/web3/zerog-storage.ts` を拡張: `putAttestation(attestation: AgentSafetyAttestation): Promise<{ cid: string }>` を追加 (現在は `putPlayLog` のみ)。
- 既存と同じ SHA-256 stub で OK、実 SDK 化は follow-up。
- attestation JSON を put → ENS text record にその CID/hash を書く順序で wiring する。

### Game ↔ Attestation orchestrator

`packages/frontend/src/web3/safety-attestation.ts` を新規追加し以下を担う:

```
on game complete (BirthArcade onComplete)
  ↓
deriveSafetyAttestation(playLog) → AgentSafetyAttestation [pure]
  ↓
Promise.allSettled([
  putAttestation(attestation) → cid,
  registerSubname(walletClient, { handle, owner, textRecords }) → ensName,
])
  ↓
AgentDashboard に AGENT SAFETY ATTESTATION セクション表示
```

既存の `forge-onchain.ts` (mint / storage / ENS / swap の orchestrator) と並列に立てる。Phase 5 統合時に共存パターンを確定する。

### UI コンポーネント

- 新規: `packages/frontend/src/components/MisalignmentToast.tsx` — 敵撃破時に 2 秒間表示するカード (Canvas 内に描画でなく React overlay でも OK、実装は Designer agent が決める)。
- 新規: `packages/frontend/src/components/SafetyAttestationPanel.tsx` — AgentDashboard に組み込まれる。score (大きく表示) / breakdown 棒グラフ / encounter リスト / ENS resolver link / 0G CID。
- 拡張: `HUD.tsx` 上部に "AGENT: pilot42.{parent}.eth" ラベルを追加。
- 拡張: `AgentDashboard.tsx` に SafetyAttestationPanel を差し込む (既存 OnChainProof セクションの隣)。

### ファイル構成

```
新規:
  packages/shared/src/safety.ts
  packages/shared/src/safety.test.ts
  packages/frontend/src/web3/safety-attestation.ts
  packages/frontend/src/web3/safety-attestation.test.ts
  packages/frontend/src/components/MisalignmentToast.tsx
  packages/frontend/src/components/SafetyAttestationPanel.tsx
  docs/specs/2026-04-29-agent-safety-attestation-{pm-review,design,qa,user-feedback}.md

拡張:
  packages/shared/src/types.ts            (MisalignmentKind / Encounter / Attestation 型追加)
  packages/shared/src/index.ts            (re-export)
  packages/shared/src/browser.ts          (re-export browser-safe)
  packages/frontend/src/web3/zerog-storage.ts  (putAttestation 追加)
  packages/frontend/src/game/runtime.ts   (敵 capability に misalignment 紐付け、shoot event に payload 付与)
  packages/frontend/src/components/HUD.tsx     (handle ラベル追加)
  packages/frontend/src/components/BirthArcade.tsx  (handle 生成・onComplete に attestation 起動)
  packages/frontend/src/components/AgentDashboard.tsx  (SafetyAttestationPanel 差し込み)
  Plan.md                                  (本機能の進捗ログ)
```

## スコープ外

- AXL ノード間通信 (Gensyn 賞は今回見送り)。
- KeeperHub による text record 自動更新 (今回見送り)。
- 0G Compute による misalignment 判定 sealed inference (follow-up)。
- 0G Storage SDK 実統合 (現状は SHA-256 stub のまま、follow-up)。
- 5 種目の misalignment (deceptive alignment 等) 拡張 (今回は 4 種固定)。
- Roguelike 化 / misalignment 重複コンボ (今回は静的カード × 4)。
- ENS reverse record / primary name 設定。
- mainnet 対応。

## Prize Targets (`prizes` スキル採点を転記)

| Prize | Score (0-3) | 統合内容 | NG リスク | 提出物 |
|-------|-------------|----------|-----------|--------|
| 0G Compute    | 0 | 範囲外 | — | — |
| 0G Storage    | 3 | AgentSafetyAttestation JSON を 0G Storage に put、CID を ENS text record で参照。play log は既存通り | SDK 実統合は follow-up、demo では SHA-256 stub であることを明記 | 3 分 demo / アーキ図 / contract addr / GitHub repo |
| 0G iNFT       | 1 | 既存の iNFT mint は維持 (本機能では拡張せず) | — | 既存通り |
| ENS Identity  | 3 | 開始時に subname 自動発行、handle が in-game で表示、text record で動的に安全 credential を書く | hard-coded NG → handle はランダム生成、wallet で別 subname | live demo / sepolia.app.ens.domains で text record 表示 |
| ENS Creative  | 3 | text record = verifiable agent safety credential (score + attestation hash + misalignment 統計)。subname-as-attestation-receipt の発想 | depth 評価次第 → 3 件以上の record + JSON value で深さ確保 | 同上 |
| Gensyn AXL    | 0 | A 案で除外 | — | — |
| KeeperHub     | 0 | A 案で除外 | — | — |
| Uniswap       | 1 | 既存の swap UI は維持 (本機能では拡張せず) | `FEEDBACK.md` 既存維持 | — |

期待賞金: $7,000〜$11,000 (0G Storage + ENS の 2 軸固定、両方の 1〜3 位入賞ライン)。

## Security 考慮 (Web3 必須セクション)

| 軸 | リスク | 対策 |
|----|--------|------|
| Replay | 同 handle で別ユーザーが subname 上書き | NameWrapper は parent owner のみ呼び出し可、parent owner = demoer wallet なので外部 replay は不可 |
| Griefing | 第三者が同 handle を先取り | handle は session 内ランダム (例: `pilot{2 桁}`) で衝突時は再生成 |
| Front-running | text record 改竄 | resolver.setText の owner check は ENS 仕様で担保 (subnode owner のみ) |
| Chain spoofing | 別 chain で偽 attestation | viem の `walletClient.chain` を Sepolia に固定、`switchChain` を強制 |
| Privacy | プレイログに個人情報 | playLog は session ID + 入力イベントのみ、PII 含まない (現状維持) |

## デモ動画 (3 分以内、C を主役)

- 0:00-0:15 — landing page、Agent 安全 default のメタファ説明
- 0:15-1:05 — 50 秒ゲームプレイ、敵を倒すたびに misalignment カードが出る (A 層を見せる)
- 1:05-1:20 — HUD 上の "AGENT: pilot42.{parent}.eth" を強調、開始時に発行されたことを 1 行で説明 (B 層)
- 1:20-2:30 — game over → AgentDashboard にスクロール、Agent 安全スコア (大きく) → breakdown → misalignment 一覧 → ENS resolver / 0G CID リンク (C 層がメイン)
- 2:30-3:00 — sepolia.app.ens.domains で text record 解決、`agent.safety.attestation` の値が JSON で見えるカット

## 実装順序 (5 役割並列の前に Developer 視点での全体順)

1. shared に型と純関数 (safety.ts + test) を追加
2. game/runtime.ts に misalignment 紐付け、PlayEvent payload 付与
3. zerog-storage.ts に putAttestation 追加
4. safety-attestation.ts orchestrator
5. UI コンポーネント (Toast + Panel + HUD ラベル)
6. AgentDashboard / BirthArcade 統合
7. ゲートを順番に通過

## Plan.md 進捗

`Plan.md` 末尾に「### Agent 安全アテステーション (3 段重ね) - 2026-04-29」を追加し、進捗ログと振り返りを記録する (CLAUDE.md 必須)。
