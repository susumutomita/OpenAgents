# Contracts

Foundry-based Solidity 0.8.28 sources for Gr@diusWeb3. The ENS layer was moved to
real Sepolia ENS (NameWrapper + PublicResolver), so the only contract we still
own and deploy is the iNFT.

## What's here

| File | Role |
|---|---|
| [`src/AgentForgeINFT.sol`](./src/AgentForgeINFT.sol) | ERC-721 with deterministic `tokenId = keccak256(msg.sender, playLogHash)` and a base64 data-URI `tokenURI` that pins the agent's archetype, combat power, play-log hash, policy blob, and 0G Storage CID on-chain. |
| [`script/Deploy.s.sol`](./script/Deploy.s.sol) | Foundry deploy script. Multi-chain (Sepolia / Base / OP / Arbitrum / 0G Galileo); reads RPCs from `foundry.toml`. |
| [`foundry.toml`](./foundry.toml) | Solidity `0.8.28`, optimizer + via-IR, `[rpc_endpoints]` aliases for every supported testnet, `[etherscan]` keys for the Sepolia family. Galileo's RPC is hardcoded because Foundry's TOML resolver does not understand `${VAR:-default}`. |

## Live deployments

| Chain | ID | Address |
|---|---|---|
| **0G Galileo** | 16602 | [`0xcB74b0E49dB3968b4e8cEB70EFAaA6bb668346D7`](https://chainscan-galileo.0g.ai/token/0xcb74b0e49db3968b4e8ceb70efaaa6bb668346d7) |

## Build & test

```bash
forge build
forge test     # if/when tests are added; currently the contract is small enough to lean on the deploy script + on-chain verification
```

## Deploy

Always go through the repo-root `Makefile` so the testnet-only guard is
preserved. The Makefile never accepts a raw private key — signing is keystore
/ Ledger / Trezor / interactive only. See the
[top-level README](../README.md#make-the-inft-live) for the full flow.

```bash
# one-time: generate a fresh disposable wallet + import into Foundry's encrypted keystore
make deploy_setup

# per chain (run from the repo root, not from inside contracts/)
make deploy_galileo          ACCOUNT=deployer SENDER=0xYourAddress
make deploy_sepolia          ACCOUNT=deployer SENDER=0xYourAddress
make deploy_base_sepolia     ACCOUNT=deployer SENDER=0xYourAddress
make deploy_op_sepolia       ACCOUNT=deployer SENDER=0xYourAddress
make deploy_arbitrum_sepolia ACCOUNT=deployer SENDER=0xYourAddress

# everything in one shot
make deploy_all ACCOUNT=deployer SENDER=0xYourAddress
```

After each deploy, copy the printed contract address into the Vercel project as
`VITE_INFT_ADDRESS=0x...` and redeploy the frontend so the dashboard targets it.

### Verification

Sepolia-family deploys verify on Etherscan automatically (`--verify` flag in
the Makefile). 0G Galileo skips `--verify` because Galileo does not yet expose
an Etherscan-compatible verifier; the deploy still succeeds and the contract
is visible on https://chainscan-galileo.0g.ai.

## Removed: `AgentForgeSubnameRegistry.sol`

An earlier version of this directory shipped an in-house ENS-like registry. It
was removed when we wired the frontend to real Sepolia ENS via viem
([`packages/frontend/src/web3/ens-register.ts`](../packages/frontend/src/web3/ens-register.ts)).
The iNFT is the only contract we own.

## Testnet-only invariant

The frontend never sends a write to a chain outside its testnet allowlist —
`wagmi` config, `ensureChain`, `TestnetGuard`, and a hardcoded swap cap each
enforce this independently. See the
["Why it can't hit mainnet" section](../README.md#why-it-cant-hit-mainnet) of
the top-level README for how the four layers compose.
