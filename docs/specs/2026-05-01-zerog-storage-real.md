# 0G Storage SDK 実統合 仕様書

## 概要

`packages/frontend/src/web3/zerog-storage.ts` の SHA-256 stub を `@0gfoundation/0g-ts-sdk` の real put に差し替える。playLog と AgentSafetyAttestation の両方を 0G Galileo testnet に upload し、root hash を `0g://{rootHash}` 形式で iNFT metadata と ENS text record に伝播させる。これにより 0G Storage 賞の Autonomous Agents / Swarms / iNFT トラックを stub から real demo に格上げし、judge が 0G storage explorer で実データを検証できる状態にする。

## ユーザーストーリー

- **ハッカソン審査員 (0G Storage 賞)** として、demo URL から AgentDashboard を開き、`0g://{rootHash}` を 0G storage explorer で検索したら playLog の JSON とその attestation が実際に保存されていることを 1 分で確認したい。
- **iNFT 審査員** として、minted iNFT の `tokenURI` が指す metadata 中の `storageCID` が実 0G root hash であり、agent intelligence/memory が embedded であると証明したい。
- **プレイヤー (Sepolia ENS + 0G Galileo 両対応)** として、game over 時にウォレットが Sepolia → 0G Galileo → Sepolia と自動切替され、各 popup を順に承認するだけでフローが完了したい。
- **0G testnet ETH を持っていないプレイヤー** として、real put が失敗してもローカル attestation 表示と ENS write は継続し体験が壊れないこと。

## 受け入れ基準

- [ ] `@0gfoundation/0g-ts-sdk` を `packages/frontend/package.json` に追加し Vite browser bundle で動く。
- [ ] `packages/frontend/src/web3/chains.ts` の 0G Galileo chain id を `16601` → `16602` に修正 (live RPC で `eth_chainId = 0x40da` を確認済み)。
- [ ] `contracts/foundry.toml` の chain id コメントも更新。
- [ ] `zerog-storage.ts` の `putPlayLog` / `putAttestation` が `Indexer.upload` 呼び出しを内部で行い、root hash を `0g://{0x...}` URI で返す。
- [ ] indexer / RPC は `VITE_ZEROG_INDEXER` / `VITE_ZEROG_RPC` env で上書き可能、未設定時は公式 turbo indexer (`https://indexer-storage-testnet-turbo.0g.ai`) と `https://evmrpc-testnet.0g.ai` をフォールバックで使う。
- [ ] real put が失敗した場合 `sha256://{hex}` の従来 stub にフォールバックし、ENS write は継続する (フェイルセーフ)。
- [ ] orchestrator (`safety-attestation.ts`) で wallet を 0G Galileo に switchChain → upload → Sepolia に switchChain → ENS setText の順序を保証する。
- [ ] 各 chain switch は `useSwitchChain` (wagmi) で 1 度試行し、失敗時は friendly Japanese error で failed 状態に倒す。
- [ ] `forge-onchain.ts` (iNFT mint flow) も新しい real CID を使うように調整、tokenURI metadata の `storageCID` が `0g://...` を含む。
- [ ] `bun scripts/architecture-harness.ts --staged --fail-on=error` 通過。
- [ ] `make before-commit` 通過 (lint / typecheck / test / build)。
- [ ] live demo で実 root hash を AgentDashboard と sepolia.app.ens.domains の両方から確認可能。

## 非機能要件

- **パフォーマンス**: 既存 60fps を維持。0G upload は game-end の post-processing でのみ実行、メインゲームループに影響なし。upload 自体は ~3-10 秒想定 (ネットワーク + on-chain 確認)。
- **セキュリティ**: secret は env / wallet 経由のみ、ハードコード禁止。failure 時のメッセージで private key やシークレットを露出しない。チェーンスプーフィング (Sepolia 以外で 0G upload が走らないよう、switchChain 前後で chain id を assert)。
- **アクセシビリティ**: chain switch 中は `aria-live` で「0G Galileo に切り替え中」「Sepolia に戻し中」を音声読み上げ。失敗メッセージは日本語。
- **フェイルセーフ**: 0G upload 失敗 → ENS write は `sha256://{hex}` で記録継続。Sepolia switch 失敗 → ENS は failed のみ、storage 結果は維持。
- **冪等性**: 同じ playLog を 2 回 put しても deduplication が 0G 側で起きる (同じ rootHash が返る) ことを期待。テストで確認。

## 技術設計

### データフロー

```
game over
  ↓
deriveSafetyAttestation(playLog) [既存、純関数]
  ↓
[chain: Sepolia] ← 開始時の前提
  ↓
useSwitchChain → 0G Galileo (id 16602)
  ↓ (0G testnet ETH を user wallet が保有している前提)
putPlayLog(playLog) → uploadResult.rootHash = "0xa1b2..."
putAttestation(attestation) → uploadResult.rootHash = "0xc3d4..."
  ↓ (失敗時は sha256:// stub にフォールバック)
useSwitchChain → Sepolia
  ↓
ensureSubnameAvailable(handle, parent, owner) [既存 pre-flight]
  ↓
registerSubname({ handle, owner, textRecords: { 'agent.safety.attestation': '0g://0xc3d4...', ... } })
  ↓
AgentDashboard に PipelineDiagram / SafetyAttestationPanel / OnChainProof 表示
```

### 修正ファイル

```
新規:
  - .env.example に VITE_ZEROG_INDEXER / VITE_ZEROG_RPC を追加
  - packages/frontend/src/web3/zerog-storage.test.ts (real put のラッパテスト)

拡張:
  - packages/frontend/package.json: @0gfoundation/0g-ts-sdk 追加
  - packages/frontend/src/web3/chains.ts: 0G Galileo の id を 16601 → 16602
  - packages/frontend/src/web3/zerog-storage.ts: real upload + sha256 fallback
  - packages/frontend/src/web3/safety-attestation.ts: chain switch シーケンス追加
  - packages/frontend/src/web3/forge-onchain.ts: real storage CID を iNFT metadata に流す経路確認
  - packages/frontend/src/components/SafetyAttestationPanel.tsx: PipelineDiagram の 0G ノードに rootHash を hover で表示 (任意)
  - packages/frontend/src/App.tsx: CHAIN_LABELS の 16601 → 16602
  - contracts/foundry.toml: コメントの chain id 修正
  - README.md: Quick verification 表に 0G storage explorer link 行追加
  - Plan.md: 進捗ログと振り返り
```

### SDK 利用パターン

```ts
import { Blob as ZgBlob, Indexer } from '@0gfoundation/0g-ts-sdk';

const ZEROG_INDEXER = import.meta.env.VITE_ZEROG_INDEXER ?? 'https://indexer-storage-testnet-turbo.0g.ai';
const ZEROG_RPC = import.meta.env.VITE_ZEROG_RPC ?? 'https://evmrpc-testnet.0g.ai';

async function uploadJsonToZeroG(json: object, signer: Signer): Promise<{ rootHash: string }> {
  const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
  const zgBlob = new ZgBlob(new File([blob], 'payload.json'));
  const [tree, treeErr] = await zgBlob.merkleTree();
  if (treeErr || !tree) throw new Error(`merkle tree failed: ${treeErr}`);
  const indexer = new Indexer(ZEROG_INDEXER);
  const [tx, uploadErr] = await indexer.upload(zgBlob, ZEROG_RPC, signer);
  if (uploadErr) throw new Error(`upload failed: ${uploadErr}`);
  return { rootHash: tree.rootHash() };
}
```

### Chain switch シーケンス

`safety-attestation.ts` の orchestrator を以下に拡張:

```ts
async function runSafetyAttestation(input) {
  const attestation = deriveSafetyAttestation(input);  // pure
  if (!walletClient) return localOnly(attestation);

  // 1. 0G Galileo に switch して storage put
  let storageProof: OnChainStep<StorageProof>;
  try {
    await ensureChain(walletClient, GALILEO);
    const result = await putAttestation(attestation, walletClient);
    storageProof = { status: 'success', data: { cid: `0g://${result.rootHash}` } };
  } catch (err) {
    // フォールバック: sha256 stub で記録継続
    const stubCid = await sha256Cid(attestation);
    storageProof = { status: 'failed', error: errorMessage(err), data: { cid: stubCid } };
  }

  // 2. Sepolia に戻して ENS write
  let ensProof;
  try {
    await ensureChain(walletClient, SEPOLIA);
    await ensureSubnameAvailable(...);
    ensProof = { status: 'success', data: await registerSubname({ textRecords: { 'agent.safety.attestation': storageProof.data.cid, ... } }) };
  } catch (err) {
    ensProof = { status: 'failed', error: errorMessage(err) };
  }

  return { attestation, storageProof, ensProof };
}
```

## スコープ外

- Sepolia ENS / Uniswap 周りの再設計 (今回 chain switch 経路の調整のみ)。
- 0G Compute (sealed inference) 統合 — 別 v2 候補。
- KeeperHub 統合 — 別 v2 候補。
- 0G Storage の download / verify 機能 (今回は upload のみ、judge の検証は explorer 経由)。
- iNFT contract の再デプロイ (storageCID が文字列フィールドで既に格納可能)。
- Mainnet 対応 (testnet only)。

## Prize Targets

| Prize | Score (0-3) | 統合内容 | NG リスク | 提出物チェック |
|-------|-------------|----------|-----------|----------------|
| 0G Compute | 0 | 範囲外 | — | — |
| 0G Storage (Autonomous Agents / iNFT) | **3** | playLog + attestation を Galileo に real put、explorer link を README に掲載、`0g://` URI を ENS text record にも露出 | indexer 仕様変更で URI 形式が変わるリスク (env で吸収) | 3 分 demo / contract addr / live demo URL / アーキ図 |
| 0G iNFT | **2** | iNFT metadata の `storageCID` が real 0G root hash を指し「intelligence/memory embedded」を客観的に証明 | iNFT 再 mint で同じ rootHash が returns されるかは未確認 | iNFT explorer link / minted token に rootHash 露出 |
| ENS Identity / Creative | 1 | text record `agent.safety.attestation` のスキームが `sha256://` から `0g://` に格上げ | スキーマ変更で ENS judge 側の parser に追従要請 | hard-coded 値なし、live demo |
| Gensyn AXL | 0 | 範囲外 | — | — |
| KeeperHub | 0 | 範囲外 | — | — |
| Uniswap | 0 | 範囲外 | — | — |

期待賞金: $10-14K (前 PR の $7-11K から押し上げ。0G Autonomous Agents track 最大 5 チームの $1,500 入賞ライン + iNFT メモリ embed 主張で順位押し上げ可能)。

## Security 考慮

| 軸 | リスク | 対策 |
|----|--------|------|
| Chain spoofing | switchChain 後の post-check 漏れで Sepolia が出ていない / 0G が出ていない状態で書込み | 各 write 直前に `walletClient.chain.id` を再 assert、不一致なら failed |
| Replay | 同じ playLog が複数回 upload される | 0G の content-addressed root hash で deduplication が効くと想定。テストで idempotent を確認 |
| Griefing | 攻撃者が user の playLog を勝手に upload / iNFT mint と紐付け | upload 時の signer = msg.sender、mint 時の tokenId に msg.sender を bind 済 (前 PR) |
| Privacy | playLog に PII | 既存通り PII なし、rootHash が公開されることをユーザーに UI で告知 |
| Front-running | 0G upload 中に Sepolia への switch race | Sepolia switch は upload Promise の resolve 後でのみ実行 (直列) |
| Secret leakage | indexer / RPC URL に secret が紛れ込む | env var は public 値のみ、private key 系は wagmi 経由のみ |
| Bundle size | SDK が tree-shake 不能で bundle が肥大 | dynamic import で 0G コード分離検討、build size を gate で監視 |

## デモ動画 (3 分以内、0G Storage 賞主役)

- 0:00-0:15 — landing page、Agent 安全 default のメタファ説明
- 0:15-1:00 — 45 秒ゲームプレイ (`?seed=demo`) で 4 種 misalignment カードが必ず表示
- 1:00-1:30 — game over → wallet popup: Sepolia → 0G Galileo の切替 → upload (storage 行が pending → success に遷移、rootHash が表示される)
- 1:30-2:00 — wallet popup: 0G Galileo → Sepolia 切替 → ENS subname 発行 + text record write、`0g://{rootHash}` が text record に書かれる
- 2:00-2:30 — sepolia.app.ens.domains で text record を確認 → `agent.safety.attestation` が `0g://0xabcd...` 形式
- 2:30-3:00 — その rootHash を 0G storage explorer に貼り付け、JSON が表示されて attestation の中身を確認 ("intelligence/memory embedded" 主張の証拠)

## 実装順序 (5 役割並列の前に Developer 視点での全体順)

1. `@0gfoundation/0g-ts-sdk` を install、Vite で import 試行 (browser bundle が通るか)。失敗時は `viem ZkSync 風` に dynamic import or polyfill 検討。
2. `chains.ts` の 0G Galileo を 16602 に修正、wagmi config も同期。
3. `zerog-storage.ts` を書き換え: real upload + sha256 fallback、URI を `0g://` に変更。
4. `safety-attestation.ts` の orchestrator に chain switch シーケンスを追加。
5. `forge-onchain.ts` 経由の iNFT mint も real CID を tokenURI に焼き込むことを確認。
6. UI 側: SafetyAttestationPanel の PipelineDiagram で `0G STORAGE` ノードに rootHash hover を追加 (任意)、CHAIN_LABELS 16602 修正。
7. .env.example に VITE_ZEROG_INDEXER / VITE_ZEROG_RPC、README に 0G storage explorer リンク行追加。
8. ゲートを順に通過。

## Plan.md 進捗

`Plan.md` 末尾に「### 0G Storage SDK 実統合 - 2026-05-01」を追加し、進捗ログと振り返りを記録する (CLAUDE.md 必須)。
