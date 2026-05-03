# Gr@diusWeb3 — Pitch Script (JP / EN)

提出デモ用の話す原稿。`pitch_deck.md` の 7 枚に対応する。各スライドに

- **🇯🇵 JP**: 喋る用 (口語)
- **🇺🇸 EN**: 喋る用 (audience が英語のとき)
- **⏱ Time**: 目安秒数

合計 **約 3 分 (180 秒)**。短くしたければ Slide 6 と 7 を省くと 2 分台に収まる。

伝えたい三本柱:

1. **Play to design** — 60 秒のシューティングが agent の設計ツール
2. **Testnet-only by construction** — 4 層ガードで mainnet には物理的に届かない
3. **Claude Code as runtime** — デプロイ側コストゼロ、署名はブラウザ MetaMask だけ

---

## Slide 1 — Title

**Visible**

> Gr@diusWeb3 — Play to Design Your AI Agent
> 60s arcade. On-chain agent. Testnet only.

**🇯🇵 JP** (≈25s)

> はじめまして、Gr@diusWeb3 を作りました。一言でいうと、**「60 秒のレトロシューティングをプレイすると、自分専用の AI agent がオンチェーンに生まれる」** プロダクトです。完全に testnet 専用、ブラウザだけで動きます。

**🇺🇸 EN** (≈25s)

> Hi, this is Gr@diusWeb3. In one sentence: **play 60 seconds of a retro arcade shooter and you walk away with your own AI agent, live on-chain.** It runs entirely in the browser, testnet only.

⏱ 25s

---

## Slide 2 — Problem

**Visible**

- AI agents can already trade
- Nobody designs the agent on purpose
- Default settings get sandwiched and drained
- One config slip can hit mainnet

**🇯🇵 JP** (≈30s)

> 今、AI agent はもう自分でオンチェーン取引できる時代です。でも問題なのは、**みんな default のまま走らせていること**。Slippage 設定、レバレッジ上限、approval 設定 — どれも default のままだと sandwich attack やドレイン攻撃の餌食になります。さらに、設定ミスひとつで mainnet にうっかり叩いてしまう。これが今の agent 開発の現状です。

**🇺🇸 EN** (≈30s)

> Today, AI agents already trade on-chain. The problem: **nobody designs them on purpose.** Slippage caps, leverage tiers, approval limits — most agents ship with defaults that get sandwich-attacked and drained. And one config typo can hit mainnet. This is the current state.

⏱ 30s

---

## Slide 3 — Solution

**Visible**

- 60-second arcade is the design tool
- Color you destroy most = archetype
- One run mints iNFT + ENS + signs a swap
- All testnet, swap capped at 0.0001 ETH

**🇯🇵 JP** (≈35s)

> そこで僕らは **「設計ツールをシューティングにする」** という方針を取りました。60 秒間プレイして、撃ち落とした敵の色がそのまま agent の archetype になる。これだけ。1 回のプレイで、**0G Galileo に iNFT が mint され、Sepolia ENS に subname が登録され、Uniswap で最初の swap が走る**。全部 testnet、swap は 0.0001 ETH で hardcode、つまり構造的に mainnet に届かないし、最大損失は 0.0001 ETH です。

**🇺🇸 EN** (≈35s)

> Our solution: **make the design tool a shooter.** Play 60 seconds — the color you destroy most becomes your agent's archetype. One run mints an iNFT on 0G Galileo, registers a subname on Sepolia ENS, and signs the agent's first swap on Sepolia Uniswap. All testnet, swap hardcoded at 0.0001 ETH. Structurally cannot hit mainnet, maximum loss 0.0001 ETH.

⏱ 35s

---

## Slide 4 — How It Works

**Visible**

- Play 60s — every shot is a vote
- Play log -> archetype + policy
- Forge: 0G iNFT + Sepolia ENS + Sepolia swap
- Claude Code locally decides next paper trade

**🇯🇵 JP** (≈30s)

> 仕組みはシンプルです。プレイ中の **shot 1 発 = 1 票**。play log から archetype と policy が決定論的に導出されます。同じプレイログなら同じ agent。それが forge されて 0G iNFT、ENS subname、Uniswap swap として on-chain に書かれる。さらに、ゲーム終了後は **ローカルの Claude Code** に play log を渡して「次の paper trade」を決めさせます。LLM コストはユーザー側、デプロイ側はゼロです。

**🇺🇸 EN** (≈30s)

> The mechanic: **every shot is a vote.** The play log deterministically derives archetype and policy — same log, same agent. Then it's forged on-chain as a 0G iNFT, ENS subname, and Uniswap swap. After the game, **local Claude Code reads the play log** and decides the agent's next paper trade. LLM cost is on the user's machine, the deployed app holds zero LLM cost.

⏱ 30s

---

## Slide 5 — Demo

**Visible**

> **https://gr-dius-web3-frontend.vercel.app/**
>
> - Connect any wallet — auto-switch to testnet
> - Play 60s
> - iNFT + ENS + Uniswap swap land on testnet
> - Hand off to Claude Code locally
> - MetaMask signs the trade

**🇯🇵 JP** (≈35s)

> 実際のデモがこちらです。ブラウザで開いて、wallet を接続。**mainnet にいても自動で Sepolia に切り替えてくれます**。60 秒プレイして、ゲームが終わると同時に forge が走る。MetaMask が「0G にこれ書きますか？」「Sepolia の ENS にこれ書きますか？」と聞いてきて、署名するだけ。dashboard が緑になって、ENS の subname が `kotetsu-9b213b.gradiusweb3.eth` の形でライブで生まれます。

**🇺🇸 EN** (≈35s)

> Here's the live demo. Open in browser, connect wallet — **even on mainnet, the app auto-switches you to Sepolia**. Play 60 seconds. The forge fires the moment the game ends. MetaMask asks "sign this for 0G storage? sign this for Sepolia ENS?" — you just approve. Dashboard turns green, your ENS subname goes live as `kotetsu-9b213b.gradiusweb3.eth`.

⏱ 35s

---

## Slide 6 — Tech Stack

**Visible**

- Bun + Vite + React 19 + Biome
- viem + wagmi + Foundry
- 0G Galileo + 0G Storage SDK
- ENS NameWrapper (Sepolia)
- Uniswap v3 (Sepolia)
- Claude Code as local agent runtime

**🇯🇵 JP** (≈20s)

> 技術スタック。フロントは Bun + Vite + React 19。Web3 は viem + wagmi。コントラクトは Foundry で書いて、0G Galileo + 0G Storage SDK + Sepolia ENS NameWrapper + Uniswap v3 を全部 native で叩いてます。**バックエンドはありません**。完全に static デプロイで、Vercel に乗ってます。

**🇺🇸 EN** (≈20s)

> Stack — Bun, Vite, React 19 on the front. viem and wagmi for Web3. Contracts in Foundry. Native integration with 0G Galileo, 0G Storage, Sepolia ENS NameWrapper, and Uniswap v3. **No backend.** Fully static, deployed on Vercel.

⏱ 20s

---

## Slide 7 — Thank You

**Visible**

> Gr@diusWeb3
>
> github.com/susumutomita/Gr-diusWeb3
> @tonitoni415

**🇯🇵 JP** (≈10s)

> 以上です。ぜひ live demo で 60 秒だけ遊んでみてください。質問お待ちしています。ありがとうございました。

**🇺🇸 EN** (≈10s)

> That's it. Play the live demo for 60 seconds and walk away with an agent. Happy to take questions. Thank you.

⏱ 10s

---

## Cheat sheet — もし時間が押したら

| 状況 | 削るもの |
|---|---|
| 残り 90 秒しかない | Slide 4 (How It Works) と Slide 6 (Tech Stack) を飛ばす |
| 質問が長引いて終了直前 | Slide 5 の最後の bullet (Hand off to Claude Code) を省く |
| audience が web3 慣れしてる | Slide 2 (Problem) を 30s → 15s に圧縮、bullet 1 個だけ読む |
| audience が web3 初心者 | Slide 3 の archetype の説明に 10s 追加 |

## Q&A 想定回答 (JP / EN)

**Q. なぜ shooter なの？ボタンでよくない?**

- 🇯🇵 「設定の重みを reflex に変換するため。**タイポ 1 行で agent が変わると怖いけど、60 秒の操作で生まれた agent には愛着が湧く。** 設計が遊びになります」
- 🇺🇸 "To turn config weight into reflex. **One typo can break an agent — but a 60-second playthrough makes the design feel earned.** Design becomes play."

**Q. なぜ testnet 限定？mainnet で動かないと意味ないのでは？**

- 🇯🇵 「ハッカソンの提出物として `agent が暴走する前提のガード` を見せるためです。**4 層ガード + 0.0001 ETH cap** で構造的に mainnet に届かないことを保証してる。mainnet 対応は ADR で 5 層目を足してから」
- 🇺🇸 "Hackathon scope is to show the **safety construct under an autonomous agent**. Four guard layers plus a 0.0001 ETH hard cap make mainnet structurally unreachable. Mainnet readiness needs a fifth layer behind an ADR."

**Q. Claude Code 持ってない人はどうする？**

- 🇯🇵 「forge までは Claude Code なしで完走します。Claude Code は **追加の loop step** で、無くても storage / ENS / Uniswap は全部動きます。署名は全部ブラウザの MetaMask」
- 🇺🇸 "Forge runs without Claude Code. Claude Code is the **extra loop step** — storage, ENS, and Uniswap all work without it. Signatures all go through browser MetaMask."

**Q. iNFT がエラーになってる**

- 🇯🇵 「contract デプロイ済の env var が live demo にまだセットされてないからです。`make deploy_setup` → `make deploy_galileo` → Vercel に address を入れる、で 30 秒で復活します」
- 🇺🇸 "Contract deploy address isn't set in the live env yet. `make deploy_setup` then `make deploy_galileo` then paste the address into Vercel — 30-second fix."
