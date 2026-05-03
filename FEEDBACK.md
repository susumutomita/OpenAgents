# Uniswap API Feedback

## 2026-05-03

Gr@diusWeb3 では、Sepolia 上での実 swap を agent の最初のオンチェーン行動として組み込みました。現在の実装では `exactInputSingle` を使い、`0.0001 ETH` を `WETH -> USDC` に swap し、tx hash と explorer URL を AgentDashboard に返します。

### 何がうまくいったか

- `walletClient.writeContract` からそのまま Uniswap v3 Router に投げられたので、viem / wagmi との相性はよかった。
- `exactInputSingle` は最小構成で動き、1 回の swap を demo に落とし込みやすかった。
- `waitForTransactionReceipt` で確認してから UI に返す流れにすると、judges が tx を追いやすい。
- Native ETH を payable で渡して router 側で wrap する構成は、agent の「最初の行動」として分かりやすかった。

### 何がうまくいかなかったか

- Sepolia には "USDC" と名のつくトークンが複数あり、最初にどの token address を使うべきか迷った。
- router / token / chain の address は、docs と explorer を行ったり来たりして手で確認する必要があった。
- swap amount や slippage の既定値を決めるとき、初期の開発段階では「最小デモを優先するか」「実運用寄りにするか」の判断コストが高かった。

### ぶつかった DX 摩擦

- "この chain で本当にその router が生きているか" を毎回自分で検証しないといけない。
- testnet では faucet / gas / token balance が揃わないと demo が止まるため、judge 用の再現手順を README 側にもっと明示したくなった。
- 失敗時のエラーは onchain の revert reason に寄るので、UI 側で「wallet 未接続」「chain 不一致」「token 不足」を分けて見せるとさらに親切。

### バグ / つまずき

- token address を間違えると当然 revert するので、Sepolia 用の canonical address をコードで固定しておく必要があった。
- RPC の調子が悪いと receipt 待ちで止まることがあるため、demo では tx hash を先に見せる導線があると安心。
- `amountOutMinimum = 0` は demo には便利だが、本番の説明では「簡略化したデモ設定」であることを明記したほうが誤解が少ない。

### 欲しかったもの

- 公式に「Sepolia で動く最小 swap デモ」のサンプル。
- token / router / chain の canonical address 一覧を 1 ページで確認できるドキュメント。
- 失敗時の reason を UI に出すための、Uniswap 側のもう少し高レベルなエラーマッピング例。
- 0.0001 ETH のような小額デモを、見積り API から自動で安全に調整するガイド。

### 今回の結論

- Uniswap API は、agent が「実際に価値を動かす」体験を作るには十分実用的だった。
- ただし demo 成功の鍵は API よりも、testnet address の確認・chain の固定・失敗時 UX の整備だった。
- 次にやるなら、quote → swap → receipt → explorer link を 1 画面で追えるテンプレートを最初から用意したい。
