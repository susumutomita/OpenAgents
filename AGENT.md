Gr@diusWeb3 Local Agent Runbook

Scope
- This repository is testnet-only.
- Allowed chains for any mutating onchain action:
  - Sepolia
  - 0G Galileo (chain id 16602)
- Never attempt mainnet, fork, or unknown chain execution for write actions.
- Do not use real value beyond testnet ETH / testnet tokens.

Operating rules
- Read this file first, then read README.md, Plan.md, CLAUDE.md, and the relevant web3 files before acting.
- Prefer the smallest possible change.
- Do not introduce a backend unless absolutely necessary; this app is frontend-only.
- Preserve existing working tree changes, including FEEDBACK.md.
- If a chain is not Sepolia or 0G Galileo, stop and refuse the action.
- If wallet connection, chain state, or env config is ambiguous, stop and ask for confirmation instead of guessing.
- Never use a private key, seed phrase, API token, or mainnet credential in this repo.

Allowed actions
- Read-only browsing of app state, docs, and tests.
- Testnet-only onchain writes routed through the repo’s guard utilities.
- Local test execution, linting, and build verification.
- Updating docs, tests, and copy to make the testnet-only constraint explicit.

Disallowed actions
- Mainnet execution of any kind.
- Signing transactions on unsupported chains.
- Funding or bridging real assets.
- Circumventing the guard utilities or editing them out for convenience.

Stop conditions
- Connected chain is not Sepolia or 0G Galileo.
- The requested action would touch mainnet, a live wallet with non-testnet funds, or an unsupported chain.
- A write path cannot prove it is testnet-only.
- A command produces a credential, secret, or unknown remote endpoint.

Suggested Hermes / Claude Code loop
1. Read AGENT.md, CLAUDE.md, README.md, and Plan.md.
2. Inspect the relevant source file and tests.
3. Make the minimal code/doc change.
4. Add or update Japanese BDD-style tests for the changed behavior.
5. Run the narrowest relevant tests first, then broader checks if needed.
6. Verify the app still refuses non-testnet chain IDs for every write path.
7. Stop immediately after validation; do not expand scope into mainnet support.

Implementation note
- The repository already contains testnet-aware chain config. New write paths must call the shared guard utility in packages/frontend/src/web3/utils.ts.

Agent loop handoff (one cycle)
- The deployed UI does not run an LLM. It hands off to whatever agent runtime
  is reading this file (Claude Code locally is the default).
- Slash command spec: .claude/commands/agent-loop.md.
- JSON contract: packages/shared/src/agent-loop.ts (AgentLoopInput → AgentLoopTrace,
  schemaVersion 1).
- Flow: browser copies AgentLoopInput JSON to clipboard → user runs
  /agent-loop → trace JSON returned to clipboard → user pastes into the
  "Agent loop" panel in the browser → UI validates and gates the
  "Approve & Sign" button on the budget envelope below.

Budget envelope (HARD limits, non-negotiable)
- Per-action ETH ceiling: 0.0001 (matches executeFirstSwap's hardcoded amount
  in packages/frontend/src/web3/uniswap-swap.ts).
- Allowed PaperTradeAction kinds for the demo: "swap" and "hold". Anything
  else (e.g. "rebalance") is refused at validateActionAgainstBudget before
  the UI ever offers a sign button.
- Allowed chain ids: Sepolia (11155111) and 0G Galileo (16602). Mirrors
  SUPPORTED_TESTNET_CHAIN_IDS in packages/frontend/src/web3/utils.ts.
- The agent never weakens the envelope to make an action fit. If the desired
  trade would exceed the cap, emit a "hold" action with a reason instead.
- The agent never asks the user for a private key, seed phrase, or signs
  anything itself. Real signing happens in the browser MetaMask via the
  existing forge swap path. The agent produces intent only.
