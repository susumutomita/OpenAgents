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

The agent then immediately starts running on Sepolia: communicating with peer agents over Gensyn AXL, optionally executing Uniswap swaps, with KeeperHub guaranteeing transaction execution.

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
│  - AgentDashboard (live feed of agent activity)                │
└────────────┬───────────────────────────────────────────────────┘
             │ POST /api/birth (PlayLog)
             ▼
┌────────────────────────────────────────────────────────────────┐
│  Backend (Hono + Bun)                                          │
│   - mapPlayLogToProfile  (pure, deterministic)                 │
│   - mapProfileToPolicy   (pure, deterministic)                 │
│   - keccak256 → wallet seed (BIP39)                            │
│   - 0G Compute  ← sealed inference for profile derivation      │
│   - 0G Storage  ← play log + execution history                 │
└──────┬──────────────┬─────────────┬────────────────────────────┘
       │              │             │
       ▼              ▼             ▼
┌──────────┐    ┌──────────┐  ┌──────────────────────────────────┐
│ Sepolia  │    │   ENS    │  │ Gensyn AXL (≥3 nodes, multi-proc)│
│ (Foundry)│    │ subname  │  │  - birth server                  │
│  ERC-7857│    │ + text   │  │  - agent runtime                 │
│  iNFT    │    │ records  │  │  - peer agent (other player)     │
└──────────┘    └──────────┘  └──────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────────────┐
│  Agent runtime loop                                            │
│   - Reads policy from iNFT                                     │
│   - Executes swaps via Uniswap API                             │
│   - Submits txs through KeeperHub (private mempool / retries)  │
│   - Halts autonomously on drawdown / depeg / AXL alert         │
└────────────────────────────────────────────────────────────────┘
```

## Prize Integrations (How Each Is Meaningfully Used)

### Primary

- **Gensyn AXL** — `OPTION` commits on the power-up bar literally spawn extra AXL nodes. The demo runs **3+ nodes across separate processes** (birth server, agent runtime, peer agent), satisfying the multi-node requirement structurally rather than cosmetically.
- **0G Autonomous Agents** — Each agent is an **ERC-7857 iNFT** with policy embedded. Persistent memory uses **0G Storage** (Log/KV). The profile derivation runs as **sealed inference on 0G Compute**, so the agent's design is verifiably the result of the play log.
- **ENS — Most Creative Use** — Each agent is auto-issued a subname like `kotetsu.openagents.eth`. We write `combat-power`, `attack`, `defense`, `intelligence`, `agility`, `cooperation`, and a hash of the play log into the subname's text records. This turns the subname into a **portable, verifiable agent credential** — not cosmetic, but a queryable proof of how the agent was forged.

### Secondary

- **0G Framework / Tooling** — Gr@diusWeb3 itself is a reusable agent-design framework. The arcade UI ships as a working example agent and the design-derivation pipeline is reusable.
- **Uniswap** — Agents execute real swaps on Sepolia via the Uniswap API (used in proportion to the player's Attack and Cooperation stats). `FEEDBACK.md` in the repo root captures every DX friction encountered, as required by the prize.
- **KeeperHub** — Optional but used: x402 for inserting a coin into the arcade, private-mempool execution for the agent's swap path, and retry logic so the agent's policy actually fires under stress.

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
make start                   # frontend + backend + AXL nodes
# open http://localhost:5173 and play 30–90s
```

## Safety / Scope

- **Testnet only.** Agent wallets are capped at `MAX_AGENT_BALANCE = 100 USDC (Sepolia)`.
- **No real-money betting.** Strength of play affects initial testnet token funding only.
- **Reproducibility.** Same play log → same agent. Always.
- **Out of scope** (follow-ups): mainnet, multi-chain, agent breeding, full marketplace UI.

## Acknowledgments

- **Konami** — for _Gradius_ (1985) and the Moai stage. The `@` in `Gr@dius` is an homage and a trademark side-step, not a typo.
- **0G, ENS, Gensyn, KeeperHub, Uniswap Foundation** — see [`docs/prizes/`](./docs/prizes/) for full requirements.

## License

MIT — see [`LICENSE`](./LICENSE).
