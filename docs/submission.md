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
