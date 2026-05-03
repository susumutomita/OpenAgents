# Uniswap API Feedback

## 2026-05-03

For Gr@diusWeb3 we wired a real Sepolia swap as the agent's first on-chain action. The current implementation calls `exactInputSingle` to swap `0.0001 ETH` from `WETH -> USDC`, then returns the tx hash and the explorer URL to the AgentDashboard.

### What worked

- We could fire `walletClient.writeContract` directly at the Uniswap v3 Router. The integration with viem / wagmi was clean — no extra abstraction layer needed.
- `exactInputSingle` is minimal enough to drop into a demo with one tx, and the call sites stayed tiny.
- Waiting for `waitForTransactionReceipt` before showing the UI makes the on-chain proof easy for judges to follow on Etherscan.
- Sending native ETH via `payable` and letting the router wrap it on the way in is a great fit for "the agent's first action" — no separate WETH dance required from the user.

### What did not work

- Sepolia has several tokens called "USDC". Choosing the right canonical address up front took longer than the rest of the integration combined.
- Router / token / chain addresses required hopping between docs and the explorer to double-check. There is no single page we trusted.
- Picking sensible defaults for `amountIn` and slippage at the demo stage involved real judgment ("optimize for the smallest visible demo" vs "stay closer to production"). That decision cost felt heavier than it should.

### DX friction we hit

- We had to verify "is this router actually live on this chain?" by hand every time. The deployments page exists but is not phrased as a runtime liveness check.
- On testnet, demos break the moment faucets / gas / token balances are not aligned, so we ended up wanting a more explicit reproducer recipe baked into the README for judges.
- Failure messages bubble up from on-chain revert reasons, so the UI ends up with raw revert text. Splitting "wallet not connected" / "chain mismatch" / "insufficient balance" client-side would be a much friendlier UX, and a higher-level error mapping from Uniswap would help.

### Bugs / surprises

- Wrong token address obviously reverts, so we had to pin canonical Sepolia addresses in code rather than read them at runtime.
- When the RPC degrades, `waitForTransactionReceipt` hangs. Surfacing the tx hash before the receipt completes — so judges can click through to the explorer immediately — turned out to be essential UX.
- `amountOutMinimum = 0` is convenient for the demo but easy to misread as production-ready. We now annotate it in the code as a deliberately simplified demo setting.

### What we wanted

- An official "smallest possible Sepolia swap" reference sample.
- A single doc page that lists canonical token / router / chain addresses for every supported testnet.
- A higher-level error mapping from Uniswap so apps can render human-readable failure reasons instead of raw revert strings.
- Guidance for safely auto-sizing tiny demo trades like `0.0001 ETH` via the quote API.

### Conclusion

- The Uniswap API is comfortably good enough to build "the agent actually moves real value" experiences on top of.
- The thing that decided whether a demo worked was not the API surface — it was confirming testnet addresses, pinning the chain, and shaping the failure UX.
- Next time we would start from a single template that covers quote → swap → receipt → explorer link in one screen, instead of stitching it together from docs.
