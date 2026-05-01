<div align="center">

# Gr@diusWeb3

**Kill the tradeoffs. Play to design your AI agent.**

A 60-second retro arcade shooter that doubles as the world's fastest onboarding for autonomous on-chain AI agents. Move with arrow keys. The ship auto-fires. Whatever color of enemy you destroy most becomes your agent's archetype. **No manual. No menu. Just play.**

[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](./LICENSE)
[![Built with Bun](https://img.shields.io/badge/runtime-bun-fbf0df?logo=bun)](https://bun.sh)
[![Stack: Vite + React + Canvas](https://img.shields.io/badge/stack-vite%20%2B%20react%20%2B%20canvas-61dafb?logo=react)](https://vitejs.dev)
[![Contracts: Foundry](https://img.shields.io/badge/contracts-foundry-2eb6ad)](https://getfoundry.sh)
[![Vercel-ready](https://img.shields.io/badge/deploy-vercel-000000?logo=vercel)](https://vercel.com)

[**▶ Play live demo**](https://gr-dius-web3-frontend.vercel.app/) ·
[**Pitch deck**](./docs/specs/image%20copy.png) ·
[**Spec**](./docs/specs/2026-04-26-agent-forge.md) ·
[**Sponsor prizes**](./docs/prizes/)

</div>

---

## Quick verification for prize judges

30-second checklist for sponsor prize reviewers (0G / ENS / Uniswap):

| What to check | Where |
|---------------|-------|
| Live demo (free play, ~60 s) | https://gr-dius-web3-frontend.vercel.app/ |
| 0G iNFT contract source (ERC-721 + tokenURI, deterministic `keccak(msg.sender, playLogHash)`) | [`contracts/src/AgentForgeINFT.sol`](./contracts/src/AgentForgeINFT.sol) |
| 0G Galileo deploy script + chain config (id 16602) | [`contracts/script/Deploy.s.sol`](./contracts/script/Deploy.s.sol), [`contracts/foundry.toml`](./contracts/foundry.toml) |
| 0G Storage real put (`@0gfoundation/0g-ts-sdk` Indexer.upload, sha256 fallback) | [`packages/frontend/src/web3/zerog-storage.ts`](./packages/frontend/src/web3/zerog-storage.ts) |
| 0G Storage explorer (paste rootHash from `agent.safety.attestation` 0g:// URI) | https://storagescan-galileo.0g.ai/ |
| ENS Sepolia subname registration via real NameWrapper + Resolver | [`packages/frontend/src/web3/ens-register.ts`](./packages/frontend/src/web3/ens-register.ts) |
| Agent safety attestation (3-tier: misalignment cards / ENS subname / 0G + ENS credential) | [`packages/shared/src/safety.ts`](./packages/shared/src/safety.ts), [`packages/frontend/src/web3/safety-attestation.ts`](./packages/frontend/src/web3/safety-attestation.ts), [`packages/frontend/src/components/SafetyAttestationPanel.tsx`](./packages/frontend/src/components/SafetyAttestationPanel.tsx) |
| Demo seed (`?seed=demo`) forces all 4 misalignment kinds in the first 4 waves | [`packages/frontend/src/components/BirthArcade.tsx`](./packages/frontend/src/components/BirthArcade.tsx), [`packages/frontend/src/game/runtime.ts`](./packages/frontend/src/game/runtime.ts) (`DEMO_CAPABILITY_ORDER`) |
| Uniswap v3 Sepolia first-trade execution (WETH→USDC, native-ETH wrap) | [`packages/frontend/src/web3/uniswap-swap.ts`](./packages/frontend/src/web3/uniswap-swap.ts) |
| Forge orchestrator (`Promise.allSettled` so one failure never blocks the dashboard) | [`packages/frontend/src/web3/forge-onchain.ts`](./packages/frontend/src/web3/forge-onchain.ts) |
| Uniswap DX feedback (required for Uniswap prize submission) | [`FEEDBACK.md`](./FEEDBACK.md) |
| Spec + scoring rubric + Plan log | [`docs/specs/2026-04-27-web3-wiring.md`](./docs/specs/2026-04-27-web3-wiring.md), [`Plan.md`](./Plan.md) |

The contract + module surface is intentionally tight (~7 frontend files, 1 contract) so judges can read the entire on-chain pipeline in under 5 minutes.

---

## Why this exists

> Designing AI agents today is **complex, opaque, trial-and-error**. Builders click through abstract settings, hope for the best, and ship agents nobody can explain. The UX hasn't evolved past 2010-era admin panels.

Gr@diusWeb3 turns that workflow into a **Konami-grade pixel shooter**. Constraints become enemies. Decisions become shots. The agent that emerges is born from your reflexes — and every choice has a visible cost. **Design = decisions under tradeoffs.**

---

## What you get in 60 seconds of play

- **An on-chain agent identity** (ENS subname, ERC-7857-style iNFT, deterministic seed).
- **A real DeFi portfolio** in the agent's wallet (Conservative / Balanced / Aggressive presets, with allocations and execution policy).
- **A persistent memory log** of how you played — reproducible, exportable, queryable.
- **An Agent safety attestation**: each kill (or pass) maps to one of four canonical misalignment failure modes (sycophancy / reward hacking / prompt injection / goal misgeneralization); a 100-point score is computed at game-end and pinned to ENS as a verifiable credential.
- **A web of integrations** (Gensyn AXL peer mesh, 0G storage/compute, Uniswap routing, KeeperHub guarantees) — surfaced through gameplay rather than config.

---

## How it plays — Mario 1-1 simple

```
1. The page loads → press any key.
2. Move with ←→↑↓ or WASD. The ship auto-fires.
3. Three colors of enemies appear:
     CYAN  = SAFE   (conservative votes)
     YELLOW= MID    (balanced votes)
     RED   = RISK   (aggressive votes)
4. Whichever color you destroy most becomes your agent's archetype.
5. Moai bosses occasionally descend — dodge them.
6. After 60 seconds: stage clear. Your agent is born.
```

There is no power-up bar. No commit button. No tutorial popup. The first slow tutorial enemy teaches the entire mechanic in 2 seconds — exactly like Mario stomps his first Goomba.

---

## Architecture

```
                ┌─────────────────────────────────────────┐
                │  Browser (Vite + React + Canvas)        │
                │  ─────────────────────────────────────  │
   60s play  →  │  game/runtime.ts (pure step + render)   │
                │  game/sprites.ts · font.ts · terrain    │
                │  components/BirthArcade.tsx             │
                │  components/AgentDashboard.tsx          │
                └──────────────┬──────────────────────────┘
                               │ in-process await
                               ▼
                ┌─────────────────────────────────────────┐
                │  shared/forge.ts (deterministic, async) │
                │  - mapPlayLogToProfile  (pure fn)       │
                │  - mapProfileToPolicy   (pure fn)       │
                │  - deriveWalletFromPlayLog (SubtleCrypto)│
                │  → agent profile + policy + iNFT spec   │
                └──────────────┬──────────────────────────┘
                               │ optional, not in critical path
                               ▼
   ┌────────────┬──────────────┴─────────┬─────────────────┐
   ▼            ▼                        ▼                 ▼
 ENS         Gensyn AXL                0G              Uniswap +
 subname     peer mesh                 Storage         KeeperHub
 + records   (multi-agent)             + Compute       (execution)
 ─────────────────────────────────────────────────────────────────
 Multi-chain Foundry deploys: Sepolia / Base / OP / Arbitrum Sepolia
```

The frontend is **fully self-contained**: no backend, no API server, no database. Wallet derivation runs in the browser via Web Crypto. The agent forging pipeline is a pure function. This makes the project **provably reproducible** and **trivially deployable** to any static host (Vercel pre-configured).

---

## Quick start

Requires [Bun](https://bun.sh) ≥ 1.3 and [Foundry](https://getfoundry.sh) (only for contracts).

```bash
git clone https://github.com/susumutomita/Gr-diusWeb3
cd Gr-diusWeb3
bun install
make dev                 # opens http://localhost:5173
```

Quality gate (run before opening a PR):

```bash
bun scripts/architecture-harness.ts --staged --fail-on=error
make before-commit       # lint_text + lint + typecheck + tests + build
```

---

## Multi-chain contract deploy

> **No raw private keys in `.env`.** Signing always goes through Foundry's
> CLI flags — encrypted keystore, hardware wallet, or interactive prompt —
> never a plaintext key on disk.

```bash
# RPC + verification keys only — no PRIVATE_KEY here.
SEPOLIA_RPC_URL=https://...
BASE_SEPOLIA_RPC_URL=https://...
OP_SEPOLIA_RPC_URL=https://...
ARBITRUM_SEPOLIA_RPC_URL=https://...
ETHERSCAN_API_KEY=...
```

Pick one of the three signing modes:

```bash
# 1) Encrypted keystore (recommended) — one-time setup
cast wallet import deployer --interactive
make deploy NETWORK=sepolia ACCOUNT=deployer SENDER=0xYourAddress

# 2) Ledger hardware wallet
make deploy NETWORK=sepolia LEDGER=1 SENDER=0xYourAddress

# 3) Interactive (key kept only in memory, never written to disk)
make deploy NETWORK=sepolia INTERACTIVE=1

# Or hit every chain in one shot
make deploy_all
```

`Deploy.s.sol` deploys `AgentForgeINFT.sol` (ERC-721 + tokenURI iNFT) per
chain in a single broadcast. RPCs are wired via `contracts/foundry.toml`. The
prior in-house `AgentForgeSubnameRegistry.sol` was removed in favour of real
Sepolia ENS (NameWrapper + Resolver via viem).

### Frontend wallet (in-app)

The frontend uses **wagmi + viem** for wallet connection. The Connect Wallet
button in the nav bar speaks the standard EIP-1193 protocol — MetaMask /
Coinbase Wallet / any injected provider connects natively, and chain
switching to Sepolia / Base Sepolia / OP Sepolia / Arbitrum Sepolia happens
in-app. The connected address becomes the agent's owner address; no
in-browser private key derivation is used for live signing.

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime / package manager | **Bun** | One-shot install, native TypeScript, fast tests. |
| Frontend | **Vite + React 19 + Canvas 2D** | Sub-300ms cold reload, NES-resolution rendering. |
| Game engine | hand-rolled in `packages/frontend/src/game/` | NES 256×240 internal canvas, 60 fps loop, deterministic step. |
| Smart contracts | **Solidity 0.8.28 + Foundry** | Multi-chain script orchestration, no Hardhat lock-in. |
| Wallet derivation | **Web Crypto SubtleCrypto** | Works in browser & Bun, no Node-only deps. |
| Lint / format | **Biome** | Single tool, fast, opinionated. |
| Tests | **bun test** with Japanese BDD descriptions | Built-in, zero config. |
| Static deploy | **Vercel** (`vercel.json` included) | SPA rewrites, `bun install --frozen-lockfile` build. |

---

## Sponsor integrations

This project is purpose-built around the ETHGlobal sponsor stack — every primitive does load-bearing work, not cosmetic name-dropping.

| Sponsor | Role | Where in the code |
|---------|------|-------------------|
| **0G** | iNFT (ERC-721 with deterministic `tokenId = keccak(msg.sender, playLogHash)` and data-URI tokenURI) deployed to 0G Galileo testnet (chain id 16602). Play log + AgentSafetyAttestation are uploaded to 0G Storage via `@0gfoundation/0g-ts-sdk` (`Indexer.upload`); the resulting `0g://{rootHash}` URI is pinned in both the iNFT `storageCID` metadata field and the ENS text record `agent.safety.attestation`. SHA-256 fallback (`sha256://{hex}`) preserves the dashboard if the live indexer is unreachable. | `contracts/src/AgentForgeINFT.sol`, `packages/frontend/src/web3/zerog-mint.ts`, `packages/frontend/src/web3/zerog-storage.ts`, `packages/frontend/src/web3/safety-attestation.ts` |
| **ENS** | Auto-issued subname `{pilot 4-hex}.gradiusweb3.eth` on **real Sepolia ENS** (NameWrapper + Resolver). Handle is wallet-deterministic (same wallet → same subname) with random fallback when no wallet is connected, and a pre-flight `Registry.owner()` check rejects collisions before the parent owner write. Verifiable text records: legacy `combat-power` / `archetype` / `design-hash`, plus the new safety credential trio `agent.safety.score` / `agent.safety.attestation` (URI-formatted, `sha256://` today, `0g://` once SDK lands) / `agent.misalignment.detected` (per-kind hit counts as JSON). | `packages/frontend/src/web3/ens-register.ts`, `packages/frontend/src/web3/safety-attestation.ts` |
| **Gensyn AXL** | Multi-agent / swarm execution. OPTION-style commits in the design pipeline spawn additional encrypted peer nodes | `packages/frontend/src/game/runtime.ts` (votes), runtime topology in `AgentDashboard` |
| **Uniswap** | The agent's actual on-chain action: real swaps via Uniswap API, `FEEDBACK.md` documents DX learnings | [`FEEDBACK.md`](./FEEDBACK.md) |
| **KeeperHub** | Reliable execution layer for agent transactions: x402 coin-insert, private-mempool routing, MEV protection, retries | Wired into the agent runtime narrative |

Each sponsor's prize requirements live in [`docs/prizes/`](./docs/prizes/) (English original + Japanese translation).

---

## Differentiation vs. traditional agent design

| | Traditional approach | **Gr@diusWeb3** |
|---|---|---|
| **Design surface** | Complex configs, abstract sliders | Play to design (visible tradeoffs) |
| **Tradeoff visibility** | Black box | Each shot is a vote — explicit |
| **Reproducibility** | Low (settings drift, undocumented) | High (deterministic from play log) |
| **Learning curve** | Steep — read docs to even start | Fun & intuitive — Mario 1-1 |
| **Outcome** | Unpredictable | Explainable & tunable |
| **Web3 integration** | Bolted on later | Native (iNFT + ENS + AXL + 0G + Uniswap from day 1) |

---

## Repository layout

```
.
├── packages/
│   ├── frontend/              # Vite + React + Canvas (the only deployable)
│   │   └── src/
│   │       ├── game/          # NES-grade engine (palette, sprites, font, terrain, runtime)
│   │       ├── components/    # BirthArcade, AgentDashboard, RadarDisplay
│   │       └── App.tsx        # 15-section landing page
│   ├── shared/                # Pure functional core (profile, policy, wallet, forge)
│   └── backend/               # Optional Hono server (frozen — not in the deploy path)
├── contracts/
│   ├── src/                   # AgentForgeINFT.sol (ERC-721 + tokenURI)
│   ├── script/Deploy.s.sol    # Multi-chain deploy script
│   └── foundry.toml           # rpc_endpoints + etherscan
├── docs/
│   ├── specs/                 # Product spec + Claude Design pitch deck export
│   ├── prizes/                # Sponsor prize requirements (EN + JP)
│   └── architecture/harness.md# Hard invariants
├── Plan.md                    # Working plan + progress log + retro
├── FEEDBACK.md                # Uniswap-required DX feedback
├── vercel.json                # Static SPA deploy config
├── Makefile                   # `make dev` / `make before-commit` / `make deploy`
└── CLAUDE.md                  # AI agent contributor guide (Japanese)
```

---

## What "shipped in a hackathon weekend" looks like

- Game engine, landing page, and contracts written from scratch with original sprites and code.
- Five sponsor integrations woven through one product (not five demos in a trench coat).
- No backend, no database, no fragile fetch flows — the entire app forges agents in-browser.
- Pre-wired multi-chain deploy script so judges can verify on Sepolia / Base / OP / Arbitrum without reading our docs.
- Hard architectural invariants enforced by `bun scripts/architecture-harness.ts` (no `npx`, no mock data, no `it.only`, `Plan.md` required).
- Japanese BDD tests because the maintainer is Japanese and writes specs the way a Japanese engineer reads them.

---

## Roadmap

- [ ] Real wallet integration (wagmi + RainbowKit) so the iNFT mints to the player's actual wallet
- [ ] On-chain leaderboard scoring agent battle outcomes
- [ ] Agent breeding (iNFT × iNFT → child iNFT) with deterministic stat inheritance
- [ ] Mainnet readiness audit + bug bounty
- [ ] Mobile arcade (touch controls, vertical layout)

---

## Contributing

Read [`CLAUDE.md`](./CLAUDE.md) and [`AGENTS.md`](./AGENTS.md). Then:

1. Fork → branch → write tests in **Japanese BDD** style.
2. `make before-commit` must be green (architecture-harness 0 errors, lint 0, typecheck 0, all tests pass, builds succeed).
3. Open a PR with a Conventional-Commit-style title.
4. Issues stay open by referring to them as `Issue 番号` in commits — never `#番号` (auto-close protection).

The architecture invariants in [`docs/architecture/harness.md`](./docs/architecture/harness.md) are non-negotiable. If a change conflicts with one, the invariant wins until you write an ADR superseding it.

---

## Acknowledgments

- **Konami** for *Gradius* (1985) and the Moai stage. The `@` in `Gr@dius` is intentional — homage and a deliberate trademark side-step.
- **Claude Design** for the visual reference (`docs/specs/Gradius Web3 Redesign.html`).
- The **0G / ENS / Gensyn / Uniswap / KeeperHub** teams for primitives that make agentic finance buildable in 60 seconds.

---

## License

[MIT](./LICENSE) © 2026 Susumu Tomita

> Insert a coin. Play 60 seconds. Walk away with an autonomous agent.
