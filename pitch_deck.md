---
marp: true
theme: uncover
class:
  - lead
  - invert
paginate: true
---

![bg](images/01-landing-hero.png)

# Gr@diusWeb3

**Play to Design Your AI Agent**

60-second arcade. On-chain agent. Testnet only.

---

## 6 modules. 6 footguns.

![w:1100](images/03-six-modules.png)

Most agents ship without these defaults armed. We turn each one into a target you have to shoot.

---

## 60s arcade → on-chain agent

![w:520](images/05-arcade-title.png) ![w:520](images/08-agent-dashboard.png)

Color you destroy most = archetype.
One run mints an iNFT on 0G Galileo, registers an ENS subname on Sepolia, and signs your first Uniswap swap.

---

## Testnet-only by construction. Claude Code is the head.

- wagmi config: only Sepolia + 0G Galileo
- `ensureChain` allowlist + `TestnetGuard` auto-switch wallets off mainnet
- Real swap is hardcoded at 0.0001 ETH, forever
- `AGENT.md` is the agent's constitution; Claude Code reads it locally
- Browser exports input → `claude /agent-loop` → paste back → MetaMask signs
- Deployed app holds zero LLM cost and zero private keys

---

## Try it

**https://gr-dius-web3-frontend.vercel.app/**

Bun + Vite + React 19 · viem + wagmi + Foundry · 0G Storage SDK · ENS NameWrapper · Uniswap v3 · Claude Code as local agent runtime

github.com/susumutomita/Gr-diusWeb3
