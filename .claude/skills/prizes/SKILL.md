---
name: prizes
description: ETHGlobal ハッカソン賞金トラック ($35,000) を機能設計に組み込むスキル。0G ($15K) / ENS ($5K) / Gensyn AXL ($5K) / KeeperHub ($5K) / Uniswap ($5K) の各賞要件を読み込み、機能アイデアに対して「どの賞を狙うか」「統合が cosmetic でなく meaningful か」「資格要件 (デモ動画・FEEDBACK.md 等) を満たせるか」を採点・助言する。`/feature` のヒアリング前に必ず参照する。
---

Gr@diusWeb3 プロジェクトはハッカソン参戦を前提にしている。このスキルは「作るもの」を考える時点で必ず賞金トラックに整合させるための採点・助言ツール。

---

## 賞金トラック一覧 (合計 $35,000)

詳細は `docs/prizes/*.md` を参照。要約とフックポイント:

### 0G — $15,000 (`docs/prizes/0g.md`)
Layer 1 for onchain AI。以下 4 要素のスタック:
- **0G Storage** (KV / Log) — エージェント永続メモリ
- **0G DA** — 無限スケーラブル DA
- **0G Compute** — 検証可能 AI 推論/学習 (sealed inference, qwen3.6-plus, GLM-5-FP8)
- **0G Chain** — EVM 互換

2 トラック (各 $7,500):
- **Framework / Tooling**: OpenClaw 派生の core extension・新フレームワーク (1 位 $2,500、5 位まで)
- **Autonomous Agents / Swarms / iNFT (ERC-7857)**: 実エージェント・swarm・iNFT 化 (各 $1,500、最大 5 チーム)

提出必須: project name, contract address, GitHub repo, 3 分以内 demo video, live demo URL, 使った SDK/feature の説明, team contact (TG & X)。フレームワーク部門は working example agent + アーキ図必須。

### ENS — $5,000 (`docs/prizes/ens.md`)
人間可読な identity 層。エージェントに名前 / 評判 / 発見可能性を付与する。

2 トラック (各 $2,500):
- **Best ENS Integration for AI Agents**: ENS が「アドレス解決・メタデータ・アクセス制御・発見・agent-to-agent 連携」のいずれかで実働する
- **Most Creative Use of ENS**: text record に検証可能 credential や zk proof, subname を access token, 解決ごとに rotate するアドレス等

`docs/ens-building-with-ai` 必読。**判定**: cosmetic な追加ではなく ENS が agent identity / discoverability を本質的に改善している必要あり。hard-coded 値禁止。

### Gensyn AXL — $5,000 (`docs/prizes/gensyn.md`)
P2P ネットワークノード単一バイナリ。アプリは localhost に話し、AXL が暗号化 / ルーティング / peer discovery を担う。MCP / A2A 内蔵、E2E 暗号化。

1 トラック ranked ($2,500 / $1,500 / $1,000)。要件:
- 中央集権 message broker で AXL を代替してはならない
- **複数の独立した AXL ノード間の通信** を実証する (in-process 通信は不可)
- ハッカソン期間中に作る

判定基準: AXL 統合の深さ / コード品質 / ドキュメント / 動く example。

入賞者は Gensyn Foundation grant programme に fast track。

### KeeperHub — $5,000 (`docs/prizes/keeperhub.md`)
エージェントのオンチェーン実行信頼性レイヤー (retry / gas 最適化 / private routing / audit trail)。MCP・CLI・x402・MPP 経由でエージェントが自律支払い可能。

メイン賞 $4,500:
- **Focus 1: Innovative Use** — agent / workflow / dApp / dev tool で KeeperHub を meaningfully に使う
- **Focus 2: Integration** — x402 / MPP との payments bridge、または ElizaOS / OpenClaw / LangChain / CrewAI への connector
- 判定: 動くか / 実用性 / 統合の深さ / mergeable な品質

サブ賞 $500: **Builder Feedback Bounty** (UX 摩擦・bug・docs gap・FR を $250 × 2 で支払う)。メイン賞と独立して応募可能。

### Uniswap Foundation — $5,000 (`docs/prizes/Uniswap.md`)
Uniswap API でエージェントに swap / settle 能力を付与。trading / agent 連携 / 新プリミティブを募集。

1 トラック ranked ($2,500 / $1,500 / $1,000)。**必須**: repo root に `FEEDBACK.md` を置く (DX 摩擦・バグ・docs gap・欲しいエンドポイント)。これがないと審査対象外。

---

## 共通の最低提出物

賞ごとに違うが、最大公約数として機能設計時点で以下を作れるか確認する:

- [ ] Public GitHub repo (README に setup / アーキテクチャ)
- [ ] Live demo URL
- [ ] Demo video (3 分以内が多い)
- [ ] Contract deployment address (該当する場合)
- [ ] Team contact info (Telegram / X)
- [ ] **Uniswap**: `FEEDBACK.md` (root)
- [ ] **0G iNFT 部門**: explorer 上で minted iNFT へのリンク + intelligence/memory が embedded である証明
- [ ] **0G framework 部門**: working example agent コード + アーキ図
- [ ] **Gensyn**: 複数ノード間通信の demo

---

## アイデア採点ルーブリック

機能アイデアが出たらこのルーブリックで採点する。1 機能で複数賞を取りに行く設計が望ましいが、cosmetic な統合は減点。

各賞について 0〜3 点:

- **0**: 一切関与しない / cosmetic な見せかけ
- **1**: 副次的に使う (置き換え可能なレベル)
- **2**: 機能の中で具体的に動く (置き換えると壊れる)
- **3**: 機能の中核 / 賞要件の判定基準 (識別性・深さ・新規性) を強く満たす

合計を取って **賞金期待値** を試算する (各賞の重み = 1 位賞金):

```
期待値 = Σ (各賞のスコア / 3) × 1 位賞金 × 競争係数 (0.3〜0.7)
```

競争係数は track の混雑度を考慮 (0G framework $7,500 は混雑 = 0.3、Gensyn AXL は新規 = 0.6 など、感覚値)。

---

## アイデア発散プロンプト (機能ヒアリング前に使う)

`/feature` でヒアリングを始める前に、以下を必ず提示してユーザーと壁打ちする:

1. **複数賞を貫く軸はあるか?** (例: 「自律 agent が ENS で名乗り、AXL で会話し、0G に記憶し、KeeperHub で実行し、Uniswap で値動かす」が単一プロダクトで成立するか)
2. **削るとしたらどの賞を捨てるか?** (全部盛りは薄くなりがち。深さで勝つか広さで勝つか決める)
3. **最低限の MVP** はどれか (3 分 demo video に収まる範囲)
4. **判定基準で殴られないか** (cosmetic / hard-coded / 中央集権 broker 置換 などの NG パターンに該当しないか)

---

## 推奨ワークフロー

1. ユーザーが「何を作るか」検討する → このスキルを load
2. 候補ごとにルーブリック採点を提示
3. 上位 2〜3 案に絞り、`reality-intersection-review` で現実接地確認
4. 確定したら `/feature` を起動、Phase 1 のヒアリングに「prize alignment」セクションを追加
5. Phase 2 仕様書テンプレに **Prize Targets** セクションを必ず含める (どの賞 × 何を満たすか × 提出物チェックリスト)

---

## 出力フォーマット

採点する時は以下の表で返す:

```
| Prize         | Score (0-3) | 統合内容                       | NG リスク |
| 0G Compute    | 2           | 推論を 0G Compute に置く        | sealed inference の証明が必要 |
| 0G Storage    | 3           | エージェント記憶を KV/Log に    | -        |
| ENS Identity  | 3           | サブネームを agent ID として配る | -        |
| Gensyn AXL    | 1           | ノード間通信に使う              | 単一ノードだと失格      |
| KeeperHub     | 0           | 関与なし                       | -        |
| Uniswap       | 2           | swap 実行                      | FEEDBACK.md 忘れずに |

期待賞金: $X,XXX
推奨: [採用 / 削減 / 統合強化 (具体提案) ]
```
