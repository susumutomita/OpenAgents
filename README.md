# Gr@diusWeb3

> **Play to Design Agents.**
> Konami's _Gradius III_ made **you** the hero.
> **Gr@diusWeb3** makes your **agent** the hero.

A retro arcade shooter that doubles as the world's fastest onboarding for autonomous DeFi / web3 agents. Play 30–90 seconds, walk away with an iNFT agent whose risk profile, execution policy, wallet, and ENS identity are all fully derived from how you played.

---

## The Problem

AI agents on-chain are now technically possible (ERC-4337 smart accounts, x402 autonomous payments, agentic finance). But three problems block adoption:

1. **Designing an agent is hard.** Settings screens ask for `max drawdown 5%`, `slippage 0.5%`, `position size 10%`. No one knows what those mean intuitively.
2. **Trade-offs are invisible.** Speed vs safety, concentration vs diversification, single vs multi-agent — these are abstract until you _feel_ them.
3. **Bots are black boxes.** Even after deployment, owners can't explain _why_ their agent does what it does. No reproducibility, no trust.

## The Solution

**Replace the settings screen with a 30–90 second arcade game.**

Every choice the player makes during gameplay is also a design decision for their agent:

- **Shoot or skip a labeled enemy** = pick one side of a trade-off (`Slow & Safe` vs `Fast & Risky`).
- **Collect capsules from killed enemies** = advance the Gradius power-up bar.
- **Press the commit button at a chosen bar position** = lock that capability into your agent.
- **Defeat one of five Moai bosses** = release archetype-flavored capsules.

When the stage ends, gameplay events are deterministically hashed to:

- A **wallet** (private key derived from `keccak256(playLog)`),
- An **ENS subname** (`{playerName}.openagents.eth`),
- An **iNFT** (ERC-7857) carrying the agent's profile,
- A **5-axis radar** of stats (`Attack`, `Defense`, `Intelligence`, `Agility`, `Cooperation`),
- A composite **Combat Power** number (DBZ-scouter style).

The current MVP already ships the arcade, deterministic profile derivation, local birth API, ENS-style naming, wallet derivation, and an AXL-ready runtime draft. Sepolia minting, real ENS writes, and prize-network integrations are the next wiring step, not yet live in this branch.

## How Gameplay Maps to Agent Design

### Power-up Bar = Trade-off Queue

```
[ SPEED ] [ MISSILE ] [ DOUBLE ] [ LASER ] [ OPTION ] [ ? ]
    ↑ each capsule collected advances the highlight
    ↑ commit button at any position locks that trait into the agent
    ↑ multiple commits at same slot stack the trait
    ↑ skipping = explicitly rejecting that design choice
```

| Power-up | Agent stat raised | Meaning |
|----------|-------------------|---------|
| **SPEED** | Agility | Fast reaction, lightweight reasoning |
| **MISSILE** | Intelligence | External tool / API access |
| **DOUBLE** | Attack | Multi-target generalist |
| **LASER** | Attack | High-precision specialist |
| **OPTION** | Cooperation | **Multi-agent / swarm** (spawns extra AXL nodes) |
| **?** (Shield) | Defense | Safety-first, drawdown-averse |

### Five Moai Bosses = Five Archetypes

The Moai stage's iconic stone heads each represent a design archetype. Killing one biases the capsule drops toward its specialty:

| Moai | Archetype | Drops |
|------|-----------|-------|
| 🛡 **Aegis** | Defense | Shield-heavy |
| ⚔ **Razor** | Attack | Laser-heavy |
| 🧠 **Oracle** | Intelligence | Missile-heavy |
| 💨 **Comet** | Agility | Speed-heavy |
| 🤝 **Hive** | Cooperation | Option-heavy (multi-agent) |

The player chooses which Moai to engage. Skipping one = explicitly rejecting that archetype. Engaging two = a hybrid agent.

## Sample Outcomes

| Personality | Behavior pattern | What the agent does on-chain |
|-------------|-----------------|------------------------------|
| 🛡 **Defensive Agent** | Aegis killed, Shield committed often | Tight stop-loss, low position size, Aave conservative LTV |
| ⚡ **Aggressive Swarm** | Hive + Comet, Option committed | Spawns peer agents over AXL, fast rebalances, multiple small positions |
| 🎯 **Sharpshooter** | Razor only, Laser committed twice | One concentrated bet, high conviction, holds long |
| 🤝 **Coordinator** | Hive + Oracle | Coordinates other peer agents, pulls in external data via Missile-class APIs |
| 🧠 **Lone Wolf** | All bosses skipped, single Laser commit | Pure-style minimal agent, no swarm |

Crucially: **every personality has a reproducible reason** (= the play log). Owners can answer "why did my agent do that?".

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Browser (Vite + React + Canvas)                               │
│  - BirthArcade (Gradius / Moai shooter)                        │
│  - RadarDisplay (5-axis + Combat Power)                        │
│  - AgentDashboard (birth feed + policy scan)                   │
└────────────┬───────────────────────────────────────────────────┘
             │ POST /api/birth (PlayLog)
             ▼
┌────────────────────────────────────────────────────────────────┐
│  Backend (Hono + Bun)                                          │
│   - mapPlayLogToProfile  (pure, deterministic)                 │
│   - mapProfileToPolicy   (pure, deterministic)                 │
│   - hash(playLog) → deterministic wallet draft                 │
│   - JSONL persistence for birth records                        │
│   - SSE feed for birth sequence replay                         │
└──────┬───────────────────────┬─────────────────────────────────┘
       │                       │
       ▼                       ▼
┌───────────────┐    ┌───────────────────────────────────────────┐
│ Contract Stubs│    │ Prize Wiring (next step)                  │
│ ERC-7857-ish  │    │ Sepolia mint / ENS subname / AXL / 0G     │
│ ENS registry  │    │ Uniswap / KeeperHub                       │
└───────────────┘    └───────────────────────────────────────────┘
```

## Current MVP

- A playable Moai-stage arcade runs in the browser and emits a deterministic `PlayLog`.
- `POST /api/birth` turns that log into a runtime draft with wallet, ENS-style name, policy, radar stats, and feed.
- Birth records are persisted locally as JSONL so the API has real storage instead of in-memory stubs.
- Solidity contract stubs for the iNFT and subname registry are included under [`contracts/`](./contracts/).

## Prize Integration Plan

- **Gensyn AXL** — the current UI already surfaces multi-node intent through `OPTION` and runtime topology. The actual multi-process AXL wiring is the next step.
- **0G Autonomous Agents** — the deterministic profile and policy pipeline is implemented locally. 0G Storage / Compute integration is still pending.
- **ENS** — the app already derives ENS-style names deterministically. Real subname writes and text records are still pending.
- **Uniswap / KeeperHub** — `FEEDBACK.md` and environment slots are in place. Real swap / private-mempool execution is still pending.

## Demo

<!-- Upload the 2-minute demo recording and replace this comment with the embed (e.g., https://github.com/user-attachments/assets/<id>). -->

_2-minute live demo: video embed lands here._

## Tech Stack

| Layer | Tool |
|-------|------|
| Runtime / package manager | Bun |
| Backend | Hono |
| Frontend | Vite + React + Canvas |
| Linter / formatter | Biome |
| Tests | `bun test` |
| Smart contracts | Solidity + Foundry (ERC-7857, ENS resolver) |
| Network | Sepolia testnet (real mainnet trading is **out of scope**) |

## Quick Start

```bash
make install                # install all workspace deps
make dev                    # backend :3000 + frontend :5173
# open http://localhost:5173 and play the local forge MVP
```

## Safety / Scope

- **Current branch is local-first.** It derives deterministic wallet drafts and ENS-style names, but does not push to Sepolia yet.
- **No real-money betting.** Strength of play affects initial testnet token funding only.
- **Reproducibility.** Same play log → same agent. Always.
- **Out of scope** (follow-ups): mainnet, multi-chain, agent breeding, full marketplace UI.

## Acknowledgments

- **Konami** — for _Gradius_ (1985) and the Moai stage. The `@` in `Gr@dius` is an homage and a trademark side-step, not a typo.
- **0G, ENS, Gensyn, KeeperHub, Uniswap Foundation** — see [`docs/prizes/`](./docs/prizes/) for full requirements.

## License

MIT — see [`LICENSE`](./LICENSE).
