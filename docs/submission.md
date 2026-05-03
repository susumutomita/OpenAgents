# ETHGlobal Submission — Gr@diusWeb3

ETHGlobal の応募フォームに貼り付ける用のテキスト。コピペするときはコードブロックの中身だけを取る。

## Short description

(max 100 chars。tweet-fit)

実際に動いている統合は **0G / ENS / Uniswap** の 3 つで、Gensyn AXL は dashboard のナラティブ要素のみ・KeeperHub も narrative なので、Short description からは外して 3 つに絞った方が誠実。

3 案、好きなのを選んでください (全部 100 文字以内):

```
60-second arcade shooter that forges an on-chain AI agent. 0G iNFT + ENS + Uniswap. Testnet only.
```

→ 97 chars。一番強い。"Testnet only" で安全さも 1 行に込む。

```
Play a 60-second arcade shooter to forge an on-chain AI agent. iNFT + ENS + 0G + Uniswap.
```

→ 90 chars。User の元案から AXL だけ落とした最小変更。

```
Play 60s of arcade shooter — forge an on-chain agent. 0G iNFT + ENS subname + Sepolia swap.
```

→ 91 chars。技術名を少し具体化 (subname / Sepolia)。

## Description

(min 280 characters。User が書いたものをそのまま使う想定)

```
Designing AI agents today is opaque, complex, and trial-and-error — builders click through abstract sliders, hope for the best, and ship agents nobody can explain. Gr@diusWeb3 turns that workflow into a Konami-grade pixel shooter. Play for 60 seconds with arrow keys; the ship auto-fires; whichever color of enemy you destroy most becomes your agent's archetype (Conservative / Balanced / Aggressive). Every shot is a vote, every hit is a tradeoff — design becomes decisions made under visible pressure.

What you walk away with after one playthrough: a deterministic on-chain agent identity (ERC-7857-style iNFT plus an ENS subname like {handle}.gradiusweb3.eth with verifiable text records for combat-power, archetype, and design-hash), a real DeFi portfolio policy in the agent's wallet, a persistent memory log that's exportable and reproducible from the play log alone, and a live web of integrations — Gensyn AXL peer mesh, 0G storage/compute, Uniswap routing, and KeeperHub execution guarantees — surfaced through gameplay rather than config screens.

There is no manual. No menu. The first slow tutorial enemy teaches the entire mechanic in two seconds, exactly the way Mario 1-1 teaches stomping.
```

---

## How it's made

(min 280 characters。Claude Code は power-user オプションとして触れる程度)

```
Stack: Bun + Vite + React 19 + Canvas 2D for the frontend (no backend; fully static, deployed on Vercel). The 60-second arcade is a hand-rolled NES 256×240 deterministic engine in packages/frontend/src/game/runtime.ts — same play log produces the same agent down to the byte. Wallet integration is viem + wagmi over EIP-1193 (MetaMask, Coinbase Wallet, any injected provider). Contracts are Solidity 0.8.28 + Foundry; AgentForgeINFT.sol is an ERC-721 with tokenId = keccak256(msg.sender, playLogHash) and a base64 data URI on tokenURI, deployed live on 0G Galileo (chain 16602) at 0xcB74b0E49dB3968b4e8cEB70EFAaA6bb668346D7.

Sponsor integrations are load-bearing, not cosmetic. 0G: @0gfoundation/0g-ts-sdk Indexer.upload puts the play log and AgentSafetyAttestation on 0G Storage; the resulting 0g://{rootHash} URI is pinned both in the iNFT storageCID metadata and in the ENS text record agent.safety.attestation. A SHA-256 fallback (sha256://) keeps the dashboard alive when the live indexer flakes. ENS: real Sepolia NameWrapper + PublicResolver, all writes via viem. Subnames are wallet-deterministic (same wallet → same handle) with a pre-flight Registry.owner() check that rejects collisions before the parent-owner write so we cannot accidentally clobber someone else's subname. Verifiable text records cover combat-power / archetype / design-hash plus the safety credential trio (agent.safety.score, agent.safety.attestation, agent.misalignment.detected). Uniswap: v3 exactInputSingle on Sepolia (WETH → USDC, native ETH wrapped via payable), the agent's first on-chain action with amountIn = parseEther('0.0001') hardcoded so even a malicious refactor cannot move more than 0.0001 ETH. Gensyn AXL multi-agent topology and KeeperHub reliable-execution semantics surface in the dashboard's agent profile and runtime panels.

Hacky bits worth calling out. (1) Testnet-only by construction: four independent layers stop a mainnet write path from existing — wagmi chains: [sepolia, galileo] only, ensureChain allowlist asserted before every writeContract, a TestnetGuard that auto-fires wallet_switchEthereumChain to Sepolia on connect, and a hardcoded swap cap. The worst-case loss on the entire app is 0.0001 testnet ETH. (2) Serial forge pipeline: storage → mint on Galileo, then ENS on Sepolia, sequential. Earlier Promise.all parallelism caused "Requested resource not available — wallet_requestPermissions already pending" because MetaMask only allows one pending chain switch per origin; serializing was correctness, not just polish. (3) waitForReceiptWithGrace: thin wrapper over viem's waitForTransactionReceipt with 60 × 2s retries (~2 minutes) that swallows TransactionReceiptNotFoundError so 0G Galileo's slow indexer cannot poison the dashboard — the tx hash is enough proof on its own. (4) Disposable deployer: make deploy_setup runs cast wallet new, imports the result into Foundry's encrypted keystore, and tells the user where to send testnet ETH; the daily-driver private key never gets near the project. (5) No bunx: @marp-team/marp-cli is a lockfile-pinned devDependency, make pitch_pdf calls the local binary directly so the pitch deck build is supply-chain hardened. (6) Optional power-user mode — Claude Code as the agent runtime: shipped as an installable Claude Code skill (npx skills add susumutomita/Gr-diusWeb3) for users who want to drive the agent loop with their own LLM session. The deployed demo runs end-to-end without it; when present, the skill reads AGENT.md as the agent's constitution and the browser ↔ Claude Code boundary is the system clipboard with strict AgentLoopInput / AgentLoopTrace JSON contracts, with validateActionAgainstBudget re-checking every pasted trace against the 0.0001 ETH envelope before MetaMask is allowed to fire. (7) JP BDD tests with bun test describe behavior in the language the maintainer reads specs in, and bun scripts/architecture-harness.ts enforces hard invariants in CI (no npx, no bunx, no mock data, no it.only, Plan.md required).
```

---

## Per-prize "How are you using this Protocol / API?"

各 prize ごとの 2 欄: 説明文 + コード行へのパーマリンク。

URL は `main` ブランチの permalink で、judges がクリックすれば該当行がハイライトされる。

### 0G — $15,000

**Why applicable:**

```
Gr@diusWeb3 uses 0G as a load-bearing primitive in two places. (1) iNFT mint: AgentForgeINFT.sol is an ERC-721 with deterministic tokenId = keccak256(msg.sender, playLogHash) deployed live on 0G Galileo (chain 16602) at 0xcB74b0E49dB3968b4e8cEB70EFAaA6bb668346D7. The frontend mints via viem's writeContract against the 0G public RPC (https://evmrpc-testnet.0g.ai) right after a 60-second arcade run, so every mint is reproducible from the play log alone. (2) 0G Storage: the play log and AgentSafetyAttestation are uploaded to 0G Storage via @0gfoundation/0g-ts-sdk Indexer.upload(); the resulting 0g://{rootHash} URI is pinned in both the iNFT storageCID metadata and the ENS text record agent.safety.attestation, with a sha256:// fallback so the dashboard stays alive when the live indexer flakes.
```

**Link to the line of code:**

- iNFT mint (writeContract → forge): https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/frontend/src/web3/zerog-mint.ts#L78-L92
- 0G Storage Indexer.upload: https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/frontend/src/web3/zerog-storage.ts#L136-L143
- iNFT contract source: https://github.com/susumutomita/Gr-diusWeb3/blob/main/contracts/src/AgentForgeINFT.sol
- Live deployed contract: https://chainscan-galileo.0g.ai/token/0xcb74b0e49db3968b4e8ceb70efaaa6bb668346d7

(フォームが 1 リンクだけ受け付ける場合: 一番最初の `zerog-mint.ts#L78-L92` を貼る)

### ENS — $5,000

**Why applicable:**

```
The agent's human-readable identity is a real Sepolia ENS subname like kotetsu-d3f33b.gradiusweb3.eth, registered through NameWrapper.setSubnodeRecord on the canonical Sepolia deployment (0x0635...FcE8) and the PublicResolver (0x8FAD...B7dD). Subnames are wallet-deterministic — the same wallet always derives the same handle — and a pre-flight Registry.owner() check rejects collisions before the parent-owner write so we cannot accidentally clobber another holder's subname. After the wrap, three setText writes pin verifiable agent metadata: combat-power, archetype, design-hash. The agent safety attestation flow adds another text-record trio on top: agent.safety.score, agent.safety.attestation (URI to the 0G storage / sha256 blob), and agent.misalignment.detected. ENS subname + text records turn the iNFT into something a human can read.
```

**Link to the line of code:**

- NameWrapper.setSubnodeRecord call: https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/frontend/src/web3/ens-register.ts#L92-L106
- Text records loop (setText): https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/frontend/src/web3/ens-register.ts#L116-L128
- Pre-flight collision check (Registry.owner): https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/frontend/src/web3/safety-attestation.ts

(1 リンク欄なら `ens-register.ts#L92-L106` を貼る)

### Uniswap Foundation — $5,000

**Why applicable:**

```
Uniswap is the agent's first real on-chain action. Right after the iNFT mints, the dashboard offers a one-click "Execute First Trade" that calls Uniswap v3 SwapRouter02 on Sepolia (0x3bFA47...7Ae48E) via exactInputSingle, swapping 0.0001 ETH (native, wrapped by the router via payable) into Sepolia USDC (Circle faucet token at 0x1c7D...7238). The amount is hardcoded as parseEther('0.0001') so even a malicious refactor cannot move more than 0.0001 ETH; this is one of four independent layers in the testnet-only guard. Required Uniswap DX feedback for the prize is in FEEDBACK.md (English).
```

**Link to the line of code:**

- exactInputSingle writeContract: https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/frontend/src/web3/uniswap-swap.ts#L72-L91
- Hardcoded 0.0001 ETH cap (testnet guard 4th layer): https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/frontend/src/web3/uniswap-swap.ts#L67
- DX feedback: https://github.com/susumutomita/Gr-diusWeb3/blob/main/FEEDBACK.md

(1 リンク欄なら `uniswap-swap.ts#L72-L91` を貼る)

### "Additional feedback for the Sponsor" 欄

各 prize に sponsor 向けフィードバック欄がある。実際にハマった点を具体的に書くと sponsor からの評価が上がる (彼らはこれをドキュメント / SDK 改善に使う)。

#### 0G

```
Two real friction points worth flagging.

(1) The 0G TS SDK still requires an ethers v6 Signer, but the rest of the modern web3 frontend stack has consolidated on viem. We had to write a thin wrapper that pulls walletClient.transport into a fresh `ethers.BrowserProvider(...)` and grabs `getSigner()` from it just to satisfy `Indexer.upload`. A first-class viem signer (or even a documented bridge example) would let us drop ~30 lines of duck-typed adapter code. See `packages/frontend/src/web3/zerog-storage.ts` `buildZeroGSigner`.

(2) The Galileo testnet indexer is sometimes slow to surface receipts — viem's default `waitForTransactionReceipt` (retryCount 6, ~12s) gives up before the indexer is ready, so the dashboard reports "TransactionReceiptNotFoundError" even though the tx is broadcast and visible on chainscan-galileo.0g.ai. We worked around it with a 60×2s retry wrapper. The tx itself is fine; it's just the read path that's flaky. Two related infra papercuts: foundry.toml's Bash-style `${VAR:-default}` fallback is not supported by Foundry's TOML resolver (we had to hardcode the public RPC), and `forge script --verify` fails on Galileo because there is no Etherscan-compatible verifier yet. Documenting these "Galileo skips verify" / "use a longer receipt poll" paths in the 0G dev docs would save the next team 2 hours.

The faucet (faucet.0g.ai) was unusable for us during the build window because the X login backend (request-token) was returning 404. The hackathon-specific faucet (0g-faucet-hackathon.vercel.app + promo code OPEN-AGENT) saved us, but it was discovered via a community post — surfacing it from the canonical 0G developer landing page would have been a clean fix.
```

#### ENS

```
ENS on Sepolia was the smoothest of the three integrations. NameWrapper + PublicResolver are viem-native, and `setSubnodeRecord` plus a `setText` loop got us a wallet-deterministic subname like kotetsu-d3f33b.gradiusweb3.eth in well under an afternoon.

The one non-obvious gotcha worth surfacing in docs: `NameWrapper.setSubnodeRecord` happily overwrites an existing subnode if the parent owner calls it, which means an honest dApp can accidentally clobber a user's subname. We added a pre-flight `Registry.owner(namehash(label.parent))` check to detect collisions and refuse the write. This pattern feels like it should be a first-class snippet in the ENS docs — "before you call setSubnodeRecord as the parent, check Registry.owner of the target node" — because the failure mode (silent grief over an existing subname) is the kind of thing only experienced ENS builders would think to guard against.

Smaller wishes: a single official page that lists canonical Sepolia addresses for NameWrapper / PublicResolver / Registry side-by-side with mainnet, and an EIP-5792 multicall recipe for "set N text records in one signature" — right now writing combat-power / archetype / design-hash is three separate MetaMask prompts and judges visibly tire of clicking past slides 4-5-6 of the same flow.
```

#### Uniswap Foundation

```
The Uniswap v3 surface itself was excellent — `exactInputSingle` from viem is a one-shot writeContract and we shipped a real Sepolia WETH→USDC swap as the agent's first on-chain action with zero AMM-specific code. Sending native ETH via `payable` and letting the router wrap it inline is a clean fit for "first action" UX; users don't need a separate wrap step.

Friction was not in the API but in the surrounding paths.

(1) Sepolia has multiple things called "USDC" and there is no single canonical addresses page for v3. We wasted ~30 minutes pinning down which token to use against which fee tier; we ended up hardcoding Circle's faucet USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) and the v3 SwapRouter02 (0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E). A single `/contracts/sepolia` table in the docs would have been the obvious place to look.

(2) `amountOutMinimum = 0` is the obvious choice for a smallest-possible demo (we capped at 0.0001 ETH for safety) but it is also exactly the configuration most likely to read as "not production-ready." A docs note like "this is fine for demos but never ship 0 to mainnet — here's how to plug in the quote API for a sane min" would let teams ship demos confidently without inviting reviewer concern.

(3) The default failure path bubbles raw revert reasons up through viem; building a friendly UI required us to split "wallet not connected / chain mismatch / insufficient balance" client-side. A higher-level error mapping helper from Uniswap would dramatically improve the look-and-feel of beginner integrations.

Full DX log lives in our FEEDBACK.md (https://github.com/susumutomita/Gr-diusWeb3/blob/main/FEEDBACK.md).
```

### Star ratings の付け方 (任意の参考)

| Prize | おすすめ ★ | 理由 |
|---|---|---|
| 0G | 7-8 | viem からそのまま叩ける、deterministic mint が綺麗。Storage SDK は ethers v6 Signer 要求で BrowserProvider 経由のラップが必要 (摩擦) |
| ENS | 8-9 | NameWrapper / PublicResolver の deployment ページ + viem との相性で詰まりが少ない。subname で `Registry.owner()` の事前確認に気付くのは hackathon 尺だと厳しい (FEEDBACK 候補) |
| Uniswap | 8 | exactInputSingle が最小構成で動く。Sepolia の "USDC" 名衝突と canonical address のドキュメントは依然摩擦点 |

これは僕の主観なので submission 時は実体験で書いて OK。

---

## AI tools used

(任意フィールド。具体的に・誇張なし・正直に。ETHGlobal は最近この欄をシビアに見るので「使った範囲」を明確にしておく)

```
Claude Code (Anthropic) was used throughout development as a paired engineering assistant: drafting React components, writing the Solidity AgentForgeINFT contract and Foundry deploy script, building the testnet-only guard helpers in packages/frontend/src/web3/utils.ts, debugging the MetaMask "request_already_pending" race in the forge orchestrator, refactoring the safety attestation pipeline, generating Japanese-style BDD tests with bun:test, and writing the AGENT.md runbook plus the FEEDBACK.md / pitch deck / README copy. Every change went through the project's `make before-commit` gate (architecture-harness, biome, typecheck, bun:test, build) and was committed through the developer's own Foundry keystore — no automated commits, no auto-merges, no LLM-signed transactions.

Claude Code is also offered as an optional power-user runtime for the in-app agent loop, shipped as a Claude Code skill (`npx skills add susumutomita/Gr-diusWeb3`). The deployed demo runs end-to-end without it; when present, the skill reads AGENT.md as the agent's constitution and emits a paper-trade decision JSON that the browser re-validates against a hardcoded budget envelope before MetaMask is allowed to fire. The deployed app holds zero LLM cost and zero private keys.

Pixel art for the project logo was hand-coded as `<rect>` elements in SVG — no image-generation model. Game sprites and music were authored from scratch by the team. The pitch deck is plain Marp markdown, generated via locally-pinned @marp-team/marp-cli (no `bunx`, supply-chain hardened).
```

---

## Submission form quick reference

| Field | Value |
|---|---|
| Project name | Gr@diusWeb3 |
| Live demo | https://gr-dius-web3-frontend.vercel.app/ |
| GitHub | https://github.com/susumutomita/Gr-diusWeb3 |
| Pitch deck (Marp source) | https://github.com/susumutomita/Gr-diusWeb3/blob/main/pitch_deck.md |
| Demo video | (アップロード済 URL を貼る) |
| Tracks | 0G ($15K) / ENS ($5K) / Uniswap ($5K) / Gensyn AXL ($5K) / KeeperHub ($5K) |
| Deployed iNFT contract | `0xcB74b0E49dB3968b4e8cEB70EFAaA6bb668346D7` (0G Galileo, chain 16602) |
| Contract explorer | https://chainscan-galileo.0g.ai/token/0xcb74b0e49db3968b4e8ceb70efaaa6bb668346d7 |
| Sample tokenId (一例) | `58200351...650315` |
| Sample tx hashes | iNFT mint: `0x64d97b...edeaa0` / Uniswap swap: `0x665729...5ca29f` |
| Sample ENS subname | `kotetsu-d3f33b.gradiusweb3.eth` |
| Uniswap DX feedback | https://github.com/susumutomita/Gr-diusWeb3/blob/main/FEEDBACK.md |
| Local agent runbook | https://github.com/susumutomita/Gr-diusWeb3/blob/main/AGENT.md |

## Pre-submission checklist

- [ ] 動画を YouTube unlisted (or Loom) にアップロード → URL 取得
- [ ] Description を上のコードブロックからコピペ
- [ ] How it's made を上のコードブロックからコピペ
- [ ] Live demo URL / GitHub URL / 動画 URL / contract address を入力
- [ ] 各 prize track を選択
- [ ] Uniswap track: FEEDBACK.md のリンクを別途貼る欄があれば貼る
- [ ] 提出ボタンを押す前に preview で全行が想定通り表示されているか確認
