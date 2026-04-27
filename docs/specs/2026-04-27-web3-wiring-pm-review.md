# Web3 Wiring (実体化) — PM レビュー

仕様本体: [`2026-04-27-web3-wiring.md`](./2026-04-27-web3-wiring.md)
Issue: Issue 12 (`[Web3 Wiring] PM: 要件・受け入れ基準の詳細化`)
担当: Product Manager
作成日: 2026-04-27
ブランチ: `feat/web3-wiring`

本ドキュメントは仕様書を「実装可能な単位」「検証可能な単位」「スコープを守れる単位」に解像する。コード実装の指針ではなく、QA / Designer / Developer / User 役割のための合意事項として扱う。

---

## 1. ユーザーストーリー (Given / When / Then)

### Story A: ETHGlobal 審判 (judge)

審判は 100 件以上のプロジェクトを 1 件あたり数分で評価する。「ON-CHAIN で動いているか」を**3 分の demo 動画**と**1 つの live link**で判定したい。長文 README は読まない前提で考える。

- **Given** 審判が ETHGlobal の project page を開き、demo 動画リンクと live demo URL を確認した状態である
- **When** 審判が live demo URL にアクセスし、ゲームを 60 秒プレイし、ゲーム終了画面 (AgentDashboard) まで到達する
- **Then** 60 秒以内に AgentDashboard の "ON-CHAIN PROOF" セクションに最低 3 つのリンク (0G iNFT explorer / ENS resolver / 0G Storage CID) が表示され、各リンクをクリックすると別タブで本物のチェーンエクスプローラーが開き、tx hash と block number が確認できる
- **And** demo 動画 1:20-2:00 区間で同じ並列 mint の様子が見えるため、live demo が落ちていてもエビデンスは残る
- **受け入れ基準との対応**: AC-1, AC-3, AC-6

### Story B: 初プレイのプレイヤー (first-time player)

仕様の本来のユーザー。Web3 知識ゼロでも遊べることが前提。ウォレット接続は要求するが「秘密鍵を入力させる」「seed phrase を出させる」は禁止。

- **Given** プレイヤーが live demo URL に到達し、wagmi の WalletConnect モーダルで Sepolia 対応ウォレットを接続済みである (`0G Galileo` チェーンも auto-add される想定)
- **When** プレイヤーが 60 秒の Gradius 風ステージをプレイし、game over に到達する
- **Then** プレイヤー操作なしで `Promise.allSettled` の 3 並列 (0G Storage put / 0G iNFT mint / ENS subname 発行) が走り、各ステップは loading → success / failure の状態でフィードバックされる
- **And** 失敗したステップがあっても他のステップと AgentDashboard 自体は表示され、"ARCHETYPE" "COMBAT POWER" "RADAR" の既存 UI は壊れない (フェイルセーフ要件)
- **And** 全成功時のみ `[INSERT COIN FOR FIRST TRADE]` ボタンが押下可能になり、ボタンを押すと wallet が tx 署名モーダルを出して Sepolia Uniswap v3 swap を実行する
- **受け入れ基準との対応**: AC-1〜6, AC-8 (失敗ケース UX)

### Story C: 0G prize 審査員 (0G prize reviewer)

0G の審査員は「iNFT として intelligence が embed されているか」「Storage が cosmetic ではなく iNFT メタデータの構成要素になっているか」をルーブリック化して見ている。リンクをクリックして 1 分以内に確証を得たい。

- **Given** 0G 審査員が project page から AgentDashboard を開き、"ON-CHAIN PROOF" セクションに到達している
- **When** 審査員が `0G iNFT — [explorer link]` をクリックする
- **Then** 0G Galileo testnet explorer が開き、ERC-721 contract の `tokenURI(tokenId)` が data URI として `role` / `policy` / `playLogHash` / `storageCID` / `archetype` / `combat-power` を含む JSON を返している
- **And** その JSON 中の `storageCID` が "ON-CHAIN PROOF" セクションの "0G STORAGE CID" と一致しており、CID をブラウザに貼ると実際の play log JSON がフェッチできる
- **And** 同じ play log で再 mint しても tokenId が `keccak(playLogHash)` から導出されるため重複しない (冪等性が demo で示せる)
- **受け入れ基準との対応**: AC-1, AC-2, AC-6, 非機能「冪等性」

---

## 2. E2E テストシナリオ (受け入れ基準ごと)

各 AC を「人間が手で / Playwright で再現可能な手順」に落とす。No Mock 原則のため、テスト中の RPC・SDK 呼び出しは本物の testnet を叩く。

### AC-1: iNFT が 0G Galileo testnet で mint される

1. 接続済み wallet で 60 秒プレイし game over まで到達。
2. AgentDashboard の `0G iNFT — [explorer link]` を取得。
3. 別タブでリンクを開き、0G Galileo explorer 上で contract address と tokenId が表示されることを確認。
4. 同 tokenId の `tokenURI` を explorer から呼び、data URI が返ることを確認。
5. **失敗判定**: explorer で 404 / 異なる chainId / mint tx が pending のまま 60 秒以上 → AC-1 不合格。

### AC-2: play log JSON が 0G Storage に put され、CID が iNFT メタデータに埋まる

1. AgentDashboard の "0G STORAGE CID" を取得。
2. 0G Storage の gateway URL に CID を渡し、play log JSON が取得できることを確認 (ブラウザ fetch でよい)。
3. 同じ tokenId の `tokenURI` JSON 中の `storageCID` フィールドが、UI 表示の CID と完全一致することを確認。
4. **失敗判定**: CID が `null` / fetch で 404 / `tokenURI.storageCID` が UI と不一致 → AC-2 不合格 (ただし失敗時 fallback で `null` 許容かはリスク表で扱う)。

### AC-3: Sepolia ENS で `{handle}.gradiusweb3.eth` subname が発行される

1. AgentDashboard の `ENS — {handle}.gradiusweb3.eth` を取得。
2. `https://sepolia.app.ens.domains/{handle}.gradiusweb3.eth` を開き、Owner / Resolver / Records が表示されることを確認。
3. 表示された owner address が現在の connected wallet address と一致することを確認。
4. **失敗判定**: name not found / Resolver 未設定 / Owner が deterministic wallet placeholder のまま → AC-3 不合格。

### AC-4: subname の text records に `combat-power` / `archetype` / `design-hash` が書かれる

1. sepolia.app.ens.domains の `Records` タブで 3 keys が存在することを確認。
2. 値が AgentDashboard の "ARCHETYPE" "COMBAT POWER" 表示と完全一致することを確認。
3. `design-hash` が play log の keccak hash であることを `viem` の readContract で検証 (CI 用 script で再計算)。
4. **失敗判定**: いずれかの key が空 / UI と不一致 → AC-4 不合格。

### AC-5: ボタン 1 つで Sepolia Uniswap v3 swap が実行できる

1. game over 後 AgentDashboard で `[INSERT COIN FOR FIRST TRADE]` を確認。
2. ボタン押下 → wallet 署名モーダル出現 → 承認。
3. `UNISWAP TX` セクションに tx hash が表示され、Sepolia etherscan で confirmed になることを確認。
4. swap 対象 token (例: WETH ⇄ USDC) は事前に agent / connected wallet に充填済み (リスク表参照)。
5. **失敗判定**: ボタンが押せない / モーダルが出ない / tx revert / etherscan で失敗 → AC-5 不合格。

### AC-6: AgentDashboard に 4 つのリンクが追加

1. AgentDashboard を visual 確認し、`0G iNFT explorer` `ENS resolver` `Uniswap tx hash` `0G storage CID` の 4 リンクが揃っていることを確認。
2. 各リンクが `target="_blank" rel="noopener noreferrer"` で別タブ遷移することを確認。
3. Uniswap tx は `[INSERT COIN FOR FIRST TRADE]` 押下前は "ボタン" として表示、押下後は "tx hash リンク" に切り替わる。
4. **失敗判定**: リンク欠落 / 同タブ遷移 / Uniswap がボタンのままで切替わらない → AC-6 不合格。

### AC-7: FEEDBACK.md に Uniswap API DX learnings を追記

1. リポジトリ root の `FEEDBACK.md` を `git diff main..feat/web3-wiring` で確認。
2. Uniswap セクションに「実装中の摩擦」「型定義の不足」「Sepolia v3 router の罠」など最低 3 項目の bullet が追加されていることを確認。
3. **失敗判定**: 追記なし / 一般論で具体例なし → AC-7 不合格。賞金資格に直結するため Developer ロールはこれを最優先で書く。

### AC-8: 失敗ケース (RPC 切断 / wallet 拒否 / faucet 切れ) で UX が壊れない

1. **RPC 切断テスト**: DevTools Network panel で 0G Galileo RPC URL を block → game over → AgentDashboard で "0G iNFT: failed (network)" が表示され、ENS / Storage は通常通り進む。
2. **Wallet 拒否テスト**: swap ボタン押下後 wallet 上で reject → AgentDashboard が壊れず "Uniswap: rejected by user" を表示。
3. **Faucet 切れテスト**: gas 不足の wallet で mint → "0G iNFT: insufficient funds" を表示し、Storage / ENS は他の wallet 不要部分があれば進む (ENS は gas が要るので同時に失敗、その場合も他 step を block しない)。
4. **失敗判定**: 1 失敗で AgentDashboard 全体が white screen / コンソール uncaught exception / ボタンが永久 loading → AC-8 不合格。

---

## 3. 依存関係グラフ

実装ブロックの先行 / 後続関係。並列可能なものは同 wave に置く。

```
[Phase 0: 前提]
  P0-A 0G Galileo RPC URL 確定 + faucet 確認 ─┐
  P0-B Sepolia RPC URL 確定 + faucet 確認 ────┤
  P0-C `gradiusweb3.eth` Sepolia parent 取得 ─┤── これが揃わないと Phase 1 以降全部進まない
  P0-D 0G Storage SDK 認証フロー検証 ─────────┘

[Phase 1: コントラクト]                       depends on: P0-A, P0-D
  C1 AgentForgeINFT を ERC-721 + tokenURI 化
  C2 AgentForgeSubnameRegistry 削除
  C3 0G Galileo deploy script
  C4 forge test green
        │
        ▼
[Phase 2: デプロイ]                           depends on: Phase 1
  D1 0G Galileo に AgentForgeINFT デプロイ
  D2 contract address を `.env.example` 反映
        │
        ▼
[Phase 3: frontend web3 module] (内部並列可)  depends on: D2, P0-B, P0-C
  F1 chains.ts (viem chain definitions)
  F2 zerog-storage.ts                                 ← 内部並列
  F3 zerog-mint.ts          (depends on F1)           ← F1 後並列
  F4 ens-register.ts        (depends on F1, P0-C)     ← F1 後並列
  F5 uniswap-swap.ts        (depends on F1)           ← F1 後並列
  F6 forge-onchain.ts orchestrator (depends on F2-F5)
  F7 types.ts (OnChainProof / TxStatus)               ← どの phase の前にも書ける
        │
        ▼
[Phase 4: UI 統合]                            depends on: Phase 3
  U1 App.tsx の handleComplete から forge-onchain 呼出
  U2 AgentDashboard に OnChainProof セクション
  U3 [INSERT COIN FOR FIRST TRADE] ボタン
        │
        ▼
[Phase 5: 提出物]                             depends on: Phase 4
  S1 FEEDBACK.md 拡充 (実装中に書き溜める前提だが PR 直前で再整理)
  S2 demo 動画撮影 (3 分構成)
  S3 README に live demo URL / explorer link 追加
  S4 `make before-commit` + 5 ゲート全通過
```

### クリティカルパス

`P0-C (ENS parent 取得) → C1 → D1 → F4 → U2 → S2`

P0-C が遅れると ENS の AC-3, AC-4 が一切動かず demo に組み込めない。**最優先で着手**。

### 並列化のヒント

- F2 (Storage) は SDK 認証フローが個別なので、P0-D が解決し次第早めに着手し、SDK の罠を吸収する時間を確保する。
- C1〜C4 と F1〜F2, F7 は別 PR になりにくいが、別ブランチで draft 進めておくと統合時に手戻りが減る。
- S1 (FEEDBACK.md) は実装中に随時書き、最後に整形だけする。

---

## 4. リスクマトリクス追補

仕様書 §「想定リスクと対策」を上書きせず、**追加・粒度上げ**を記録する。

| 追加リスク | 確度 | 影響 | 対策 | オーナー |
|------------|-----|------|------|----------|
| `gradiusweb3.eth` (Sepolia) parent が hackathon 期間中に取得できない | 中 | ENS 賞ゼロ → クリティカルパス停止 | (a) ENS team が運営する hackathon-only namespace を確認、(b) 取れなければ既保有の別 ENS name (`*.eth`) を一時的に parent として使い、demo 内で「自前取得が間に合わなかった」を正直に説明、(c) PR を分割して ENS だけ後乗せできる構成にしておく | PM (本ドキュメント執筆者) |
| Sepolia ENS NameWrapper の `setSubnodeRecord` が gas 不足 / Resolver 未指定で失敗 | 中 | AC-3 / AC-4 失敗 | デプロイ前に手動 tx でリハーサル、Resolver は public resolver を使う | Developer |
| 0G Storage SDK が browser bundle で `Buffer is not defined` 等の polyfill 問題を起こす | 中 | AC-2 失敗 | Vite の `define` / `optimizeDeps` 調整、最悪 fallback で base64 inline (CID = null)。FEEDBACK.md に同等記録 | Developer |
| 0G Galileo testnet が demo 当日にメンテ / 落ちる | 低-中 | AC-1 / AC-2 完全停止 | demo 動画を必ず事前収録し提出物に含める。当日は動画を主、live demo を補助に位置付ける | PM |
| WalletConnect で 0G Galileo chain が auto-add されない | 中 | プレイヤーが手動 chain 追加を要求される (Story B 崩壊) | wagmi の `addChain` を接続直後に発火、失敗時は「このボタンで 0G Galileo を追加してください」UI を表示 | Designer + Developer |
| Uniswap Sepolia の流動性不足で swap が revert | 低 | AC-5 失敗 | pool を事前確認、最小 amount を使う。token ペアは流動性のある WETH/USDC 等に固定 | Developer |
| `Promise.allSettled` の 3 並列で wallet が連続署名要求を出し UX が破綻 | 中 | Story B 崩壊 | mint と ENS は同一 wallet の連続署名になる。事前に「3 回署名が出ます」のモーダル説明を表示。署名順は固定 (Storage put → Mint → ENS) で、Storage は wallet 署名不要なので 2 連続 sign に圧縮 | Designer |
| `keccak(playLogHash)` 由来 tokenId が衝突 (理論上ほぼゼロだが) | 極低 | mint revert | revert を `已 minted` 判定として UI で「同じ play で再 mint しました」を表示 (冪等性の demo になる) | Developer |
| デモ動画 3 分制限を超過する | 中 | 0G prize 提出物 NG | 60 秒プレイ + 90 秒チェーン確認で max 2:30。残 30 秒バッファで撮り直し許容 | PM |
| `FEEDBACK.md` が Uniswap 賞要件を満たさない (一般論しか書かれていない) | 中 | Uniswap 賞ゼロ | 実装中の git commit メッセージから具体例を 5 件以上拾う。PR review で必ず PM がチェック | PM |

### Sepolia ENS parent acquisition のタイミング詳述

ENS Sepolia の `.eth` 第二階層は public registrar から取得する必要があるが、**hackathon-only ENS faucet**の有無を即確認する。以下の意思決定木で動く。

1. ENS team の Sepolia faucet で `gradiusweb3.eth` が取得できる → そのまま採用 (理想)
2. 取得できないが既保有の `*.eth` がある → それを parent にして subname 戦略は変えない (demo 上は `gradiusweb3` という名前にこだわらない、「動的 subname 発行」が賞金要件なので問題なし)
3. どちらもダメ → ENS 賞は撤退、Plan.md と spec の Prize Targets を更新、空いた工数を Uniswap 強化と demo 動画磨きに振る

意思決定は **2026-04-28 EOD まで**に確定する (実装に先立つこと最低 1 日)。

---

## 5. スコープガード (NOT-Doing リスト)

実装中に「ついでに」やる誘惑を断つための明示リスト。スコープに入れたければ別 PR + 別 issue。仕様書 §「スコープ外」を実装行動レベルで反復する。

### 絶対やらない

- mainnet デプロイ (testnet only)
- 0G Compute (sealed inference) の実装。仕様書フェーズ 2 持ち越し
- Gensyn AXL ノード起動 / multi-agent 通信
- KeeperHub x402 統合
- iNFT の transfer / approval / burn / secondary market UI
- ENS reverse record (primary name 設定)
- Sepolia 以外の EVM testnet (Base / Optimism / Arbitrum) サポート
- 0G Galileo / Sepolia 以外のチェーン追加
- Wallet 内部生成 (deterministic wallet を tx 署名に使うこと)。表示用 placeholder としてのみ存在を許す
- iNFT メタデータの IPFS / Arweave fallback (0G Storage 1 本に絞る)
- ENS subname の renewal / expiry UI
- Uniswap v2 / Sushi / 1inch 等の代替 DEX
- 自作 Resolver の実装 (public resolver を使う)
- ERC-7857 を「厳密準拠」にすること (ERC-721 + tokenURI で「7857-style」を主張)
- gas estimation UI / max gas 設定 UI
- multi-language i18n (エラー文の日英併記は AC-8 範囲だが、UI 全体の i18n はやらない)
- analytics / 監視 / Sentry 等の運用ツール導入
- e2e テストの Playwright 自動化 (手動シナリオで合格判定する。自動化は別 PR)
- agent profile の SBT 化 (本仕様 iNFT のみ)

### 「やりたくなったら / follow-up に回す」

実装中に湧いた scope 外アイデアは即 `/follow-up add <タイトル>` で `.claude/state/follow-ups.jsonl` に積み、PR 本文の "Known follow-ups" 節に貼る。例:

- 0G Compute 統合
- Gensyn AXL ノード起動
- iNFT 一覧ページ / marketplace UI
- 別チェーン展開
- mainnet 移行スクリプト

### スコープ判定フロー (実装者向け)

```
何かやりたくなった
  ↓
これは AC-1〜AC-8 のいずれかに直接寄与するか?
  ├─ Yes → 実装してよい
  └─ No
       ↓
       これは仕様書「想定リスクと対策」の対策コードか?
         ├─ Yes → 実装してよい
         └─ No → /follow-up add で記録、別 PR
```

---

## 6. PM 承認チェックリスト (PR 直前)

- [ ] AC-1〜AC-8 が全て E2E 手動テスト合格
- [ ] FEEDBACK.md に Uniswap DX 5 項目以上
- [ ] demo 動画 3 分以内に収まり、AC-1〜AC-5 が映っている
- [ ] Plan.md 進捗ログに本仕様の各 phase 完了が追記されている
- [ ] スコープガード違反なし (上記 NOT-Doing リストに該当する変更が PR diff にない)
- [ ] フォローアップが PR 本文 "Known follow-ups" 節に列挙されている
- [ ] 5 ゲート (architecture-harness / before-commit / review / security-review / simplify) all green
- [ ] ENS parent 取得意思決定 (4 章の意思決定木) が確定済み

---

## 7. 参照

- 仕様本体: [`docs/specs/2026-04-27-web3-wiring.md`](./2026-04-27-web3-wiring.md)
- プロジェクト rule: [`CLAUDE.md`](../../CLAUDE.md)
- 賞金トラック: [`docs/prizes/`](../prizes/)
- 進捗: [`Plan.md`](../../Plan.md)
- Issue: Issue 12
