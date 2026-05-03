---
marp: true
theme: uncover
class:
  - lead
  - invert
paginate: true
---

# Gr@diusWeb3

**Play to Design Your AI Agent**

60-second arcade. On-chain agent. Testnet only.

---

## Problem

- AI agents can already trade
- Nobody designs the agent on purpose
- "Default" settings = sandwich, drift, drain
- And one config typo can hit mainnet

---

## Solution

- 60-second retro shooter is the design tool
- The color you kill most becomes your archetype
- Forge mints an iNFT, registers an ENS subname, swaps on Uniswap
- All testnet. All testnet. All testnet.

---

## How It Works

- Play 60 s — every shot is a vote
- Play log → deterministic archetype
- 0G Galileo iNFT + 0G Storage CID
- Sepolia ENS subname + Sepolia Uniswap swap
- One run = one agent, fully on-chain

---

## Why It Can't Go Wrong

- Layer 1 — wagmi config: only Sepolia + 0G Galileo
- Layer 2 — `ensureChain`: testnet allowlist asserted before every write
- Layer 3 — `TestnetGuard`: auto-switch wallet off mainnet on connect
- Real swap is hardcoded at 0.0001 ETH. Forever.

---

## The Loop

- AGENT.md is the agent's constitution
- Claude Code runs locally as the thinking head
- Browser exports input JSON to your clipboard
- `claude /agent-loop` decides one paper trade
- Paste trace back → MetaMask signs in browser

---

## Why Claude Code

- Deployed app runs zero LLM cost
- Local Claude Code = the user's own quota
- CLI never holds a private key
- Browser MetaMask is still the only signer
- Budget envelope (0.0001 ETH cap) is structural, not vibes

---

## Demo

**https://gr-dius-web3-frontend.vercel.app/**

- Connect wallet (any chain — we switch you)
- Play 60 s
- Watch iNFT + ENS + Uniswap land on testnet
- Hand off to local Claude Code for one paper-trade decision
- Approve & sign in MetaMask

---

## Tech Stack

- Bun + Hono + Vite + React 19 + Biome
- viem + wagmi + Foundry
- 0G Galileo (iNFT) + 0G Storage SDK
- ENS NameWrapper + PublicResolver (Sepolia)
- Uniswap v3 SwapRouter02 (Sepolia)
- Claude Code as local agent runtime

---

## Thank You

**Gr@diusWeb3**

github.com/susumutomita/Gr-diusWeb3
gr-dius-web3-frontend.vercel.app
