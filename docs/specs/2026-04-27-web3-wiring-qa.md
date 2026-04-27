# Web3 Wiring QA レビュー

> 担当: QA / 対象 Issue #16 / 対象仕様 [`2026-04-27-web3-wiring.md`](./2026-04-27-web3-wiring.md) / 対象 PR ブランチ `feat/web3-wiring`

## 判定 (3 行)

- **HOLD** — 実装コードが未着地 (Developer #14 / #15 が未 push、`packages/frontend/src/web3/` も未作成) のため、本レビューは仕様＋既存コード接続点に対する **事前 QA** とする。
- 仕様レベルで **致命的な合意事項の不足が 3 件** ある (deterministic tokenId の griefing、deterministic wallet と署名の混在リスク、Uniswap unlimited approve)。これらは実装前に確定すること。
- 実装後に再 QA が必要。本書のテストマトリクス・E2E スクリプト・OWASP チェックリストを実装側で受け入れテストとして消化すること。

---

## 受け入れ基準 × テストマトリクス

仕様 14-23 行の各 AC に対する 正常 / 異常 / 境界 シナリオ。`AC-N` は仕様の受け入れ基準に対応。

### AC-1: iNFT が 0G Galileo で mint される

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | Sepolia 接続中に game over → wagmi が 0G Galileo (chainId 16601) に switch を要求 → ユーザー承認 → mint 成功 | tx receipt 取得、tokenId が `keccak(playLogHash)` と一致、0G explorer URL が AgentDashboard に表示 |
| 異常 | ユーザーが chain switch を拒否 | mint ステップだけ failed 表示、ENS / Storage は別プロセスで継続 (allSettled) |
| 異常 | 0G Galileo RPC が 5xx / timeout | 失敗状態 + retry CTA、UI ハングしない |
| 異常 | 既に同じ playLogHash で mint 済 (deterministic tokenId 衝突) | コントラクトが revert する場合: UI に「既に forge 済」と表示し、既存 tokenId を再フェッチして表示する。**現仕様では未定義。Developer に確認必須** |
| 境界 | finalScore=0 / events=[] の playLog | hash は計算可能、tokenId は決定的、mint 自体は通る (空エージェント) |
| 境界 | playLog が 100KB 超 | hash 計算は OK だが Storage put が遅延。タイムアウト/UX を要確認 |

### AC-2: play log JSON が 0G Storage に put され、CID が iNFT メタデータに埋まる

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | Storage put 成功 → CID 取得 → mint の tokenURI に `storageCID` 同梱 | data URI 内 JSON に CID が含まれる、CID リンクが UI に表示 |
| 異常 | Storage put 失敗 | 仕様 risk 表 で `data URI に fallback (CID は null)` とある → tokenURI に `storageCID: null` が入ること、UI に「Storage failed」表示 |
| 異常 | Storage put が遅延し mint より遅く完了 | mint が CID なしで先に走り、後追いで CID を表示するか、それとも CID を待ってから mint するか — **仕様に書かれていない、要確定** |
| 境界 | 同じ playLog を 2 回 put | CID が同一になることを期待 (content-addressed のはず)、要 SDK 仕様確認 |

### AC-3: Sepolia ENS で `{handle}.gradiusweb3.eth` subname が発行される

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | parent `gradiusweb3.eth` を保有する controller wallet で subname `kotetsu.gradiusweb3.eth` を発行 | sepolia.app.ens.domains で resolve できる |
| 異常 | parent name 未取得 (リスク表参照) | NameWrapper.setSubnodeRecord が revert → UI に「ENS step failed: parent not owned」 |
| 異常 | 同じ handle で 2 回呼ばれる | 上書き or revert を仕様で確定する。**未定義** — 別 wallet が同じ handle を取ると先勝ち griefing が成立 |
| 異常 | handle に Unicode / 大文字 / `.` を含む | ENSIP-15 normalize 必須。実装前に viem の `normalize()` 利用を確認 |
| 境界 | handle 空 / 64 文字超 | 入力バリデーションで弾く |

### AC-4: subname の text records に `combat-power` / `archetype` / `design-hash` が書かれる

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | subname 発行 + Resolver.setText を 3 回 | sepolia.app.ens.domains の text record タブで全部見える |
| 異常 | text 設定だけ失敗 (resolver tx revert) | subname は残るが text なし → UI に「partial」表示 |
| 境界 | combatPower の int / string キャスト | コントラクト側は string なので `String(value)`、欠損時 `"0"` |

### AC-5: ボタン 1 つで Sepolia Uniswap v3 swap が実行できる

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | エージェント birth 後、`INSERT COIN FOR FIRST TRADE` クリック → Sepolia に switch → user gesture で wallet 署名 → swap tx → tx hash 表示 | Etherscan Sepolia で確認可能 |
| 異常 | 接続中の wallet が現在 0G Galileo (mint 直後の状態) | **自動で Sepolia に戻すか、ユーザーに switchChain を促すか** を確定する。確定しないと「swap が 0G に飛ぶ」事故が起きる |
| 異常 | user wallet に WETH 残高なし | approve も swap も失敗。事前に「testnet WETH faucet を使え」エラーメッセージを出す |
| 異常 | Uniswap router slippage 超過 | tx revert、UI に decode したエラーを表示 |
| 異常 | router address ハードコード誤り | 失敗を catch するだけでなく、Plan.md にチェックリスト記載 |
| 境界 | 同じセッションで連打 | 二重 tx 防止 (button disabled while pending) |

### AC-6: AgentDashboard に 4 つのリンクが追加

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | mint / Storage / ENS / swap 全成功 | 4 行とも external link 表示、`target="_blank" rel="noopener noreferrer"` 必須 |
| 異常 | 一部失敗 | 失敗行は赤字 + retry ボタン、成功行はリンク有効 |
| 境界 | swap 未実行 (CTA 押す前) | UNISWAP TX 行は CTA ボタン状態 |
| アクセシビリティ | スクリーンリーダー | 各リンクに `aria-label="Open 0G iNFT explorer for token N"` 等 |

### AC-7: FEEDBACK.md に Uniswap API DX learnings 追記

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | PR diff に `FEEDBACK.md` の追記 | Uniswap 統合の摩擦が具体例とともに 1 セクション |
| 異常 | プレースホルダのみ | review で reject |

### AC-8: 失敗ケースで UX が壊れない

| 種別 | シナリオ | 期待結果 |
|------|----------|----------|
| 正常 | 3 ステップ全失敗 | エージェント birth 自体は完了、4 行とも「failed: <reason>」、再試行 CTA |
| 異常 | wallet 未接続のまま game over | step 全部 skip、`Connect wallet to materialize on-chain proof` 表示 |
| 異常 | wallet が突然 disconnect (実行中) | 進行中の tx は取り消されるが UI は破綻しない |
| 境界 | tab を裏に回したまま forge 完走 | requestAnimationFrame 停止下でも `await` 系は動く、戻ったら反映済 |

---

## E2E スクリプト (game → mint → ens → swap)

前提:

- ブラウザに MetaMask、Sepolia ETH 残高あり、Sepolia WETH 残高あり (≥0.001)。
- `gradiusweb3.eth` の Sepolia parent 名を controller として MetaMask アカウントが保有しているか、controller wallet が wagmi で接続できる状態。
- 0G Galileo testnet (chainId 16601) RPC が `wagmi/chains` 拡張に登録済 (現状未登録 — 実装側で追加必要)。
- 0G testnet faucet で gas 残高を持つこと。

手順:

1. `bun install && bun run dev` で frontend を起動。`http://localhost:5173` を開く。
2. ヘッダの `CONNECT WALLET` で MetaMask を接続。`STATUS_BAR` に `SEPOLIA` が表示されることを確認。
3. ARCADE セクションへスクロール。プレイヤー名を `Kotetsu` のまま START。
4. 60 秒間プレイ。最低 3 機 KILL、capsule を 1 つ commit する (有意な playLog を作るため)。
5. game over でフォージが自動起動。**期待**: `Promise.allSettled` が並行して 3 ステップを発火し、AgentDashboard が表示される。
6. AgentDashboard の `ON-CHAIN PROOF` セクションを確認:
   - **0G iNFT** 行: 「pending」 → MetaMask に 0G Galileo への chain switch ポップアップ → 承認 → mint tx 確認 → tokenId と explorer link が表示される。
   - **0G STORAGE** 行: 「pending」 → CID が表示される。失敗時はエラー文。
   - **ENS** 行: subname 発行 → `kotetsu.gradiusweb3.eth` が表示される (Sepolia に switch を求めるはず)。
7. sepolia.app.ens.domains で `kotetsu.gradiusweb3.eth` を resolve、text records に `combat-power` / `archetype` / `design-hash` の 3 件があることを確認。
8. 0G Galileo explorer (例 `https://chainscan-galileo.0g.ai/address/<contract>`) で iNFT contract の Transfer event と tokenURI を確認。data URI を base64 decode し、JSON 内に `storageCID` が含まれることを確認。
9. AgentDashboard の `INSERT COIN FOR FIRST TRADE` ボタンをクリック。
   - **期待**: chain が Sepolia でなければ自動で switch 要求 → 承認。WETH→USDC swap 1 件が走る。
10. MetaMask で swap tx を承認。完了後 UNISWAP TX 行に etherscan link が表示される。
11. Sepolia Etherscan で tx を開き、`SwapRouter02.exactInputSingle` ログを確認。
12. ページを reload。AgentDashboard が再表示され、4 リンクが永続化されていることを確認 (localStorage で保持される設計の場合)。

ネガティブ E2E:

- N-1: 手順 5 で MetaMask の chain switch を **Reject** → mint 失敗、ENS / Storage は継続。UI ハングなし。
- N-2: 手順 9 で WETH 残高ゼロのアカウントで swap → revert、エラー文が日本語/英語で表示。
- N-3: 0G Galileo RPC を `chrome://net-internals` でブロック → mint pending → timeout → failed 表示、ボタンが復帰。

---

## OWASP Web3 / Smart Contract セキュリティチェックリスト

本 PR 固有のリスクに絞る。

### S-1: signature phishing risk on the swap button

- **状態**: 中リスク。
- **詳細**: `INSERT COIN FOR FIRST TRADE` は user gesture を経るが、現仕様にはトランザクション内容のプリビュー (送金 token / 受取 token / amount / minimumAmountOut / 期限) が UI に表示される旨が書かれていない。MetaMask のポップアップだけが頼りの状態。
- **要求**: ボタン押下前に「これから WETH 0.0001 → USDC を Uniswap v3 で swap します。slippage 0.5%」を UI に表示し、確認チェックを入れる。EIP-712 message ではなく `eth_sendTransaction` だが、ユーザー教育として必須。
- **要求**: `permit2` 等の off-chain signature を使う実装に変えた場合は **追加で** EIP-712 domain separator を UI に表示すること。

### S-2: chain-spoofing (wrong chain at write time)

- **状態**: 高リスク。
- **詳細**: wagmi の現状 (`packages/frontend/src/lib/wagmi.ts`) は Sepolia / Base Sepolia / OP Sepolia / Arbitrum Sepolia の 4 chain のみ登録。**0G Galileo (chainId 16601) は未登録**。implementation では `chains.ts` に追加する仕様だが、`writeContract` 時に `chain` 引数を明示しないと wagmi は「現在接続中の chain で署名」して結果として 0G mint tx が Sepolia router に送られる、もしくは逆 が起こる。
- **要求**: 各 `writeContract` 呼び出しで `chain: galileo` / `chain: sepolia` を明示し、wagmi の `useSwitchChain` で switch 完了を `await` してから書き込む。
- **要求**: switch 後に `useChainId()` で再確認してから `writeContract` を呼ぶガードを入れる。switch を user reject されたら fail-fast。

### S-3: replay risk — deterministic tokenId による griefing

- **状態**: 高リスク。**致命的トップ 3**。
- **詳細**: 仕様 32 行「tokenId を `keccak(playLogHash)` から導出」。playLog は `events[]` + `durationMs` + `finalScore`。これらは公開可能 (将来的にリプレイ機能等で URL 共有も想定)。攻撃者が他人の playLog を入手 → 自分の wallet で先に mint → 元のプレイヤーが mint しようとすると tokenId 衝突で revert。
- **要求**: tokenId を `keccak(playLogHash, msg.sender)` に変える。または `keccak(playLogHash, ownerAddress)` を hash に含める。これにより同 playLog でも owner ごとに異なる tokenId になり、griefing 不可。
- **要求**: 仕様の冪等性条項 (同じ wallet が同じ playLog で再 mint しても重複しない) は維持される。

### S-4: 秘密鍵漏洩 — deterministic wallet from play log

- **状態**: 中-高リスク。**致命的トップ 3**。
- **詳細**: `packages/shared/src/wallet.ts` の `deriveWalletFromPlayLog` は `privateKey` を SHA-256 で生成しブラウザ JS の string として保持する。仕様 27 行は「表示用 placeholder として残すが、tx 署名はブラウザウォレットに委譲」と明記。だが現在の `App.tsx:225-232` は `draft.agent.walletAddress` を `ownerAddress` で上書きするのみで、`derivedWallet.privateKey` は `birth.agent.seed` 等として **shared types 経由でメモリ・localStorage に流れている可能性**がある (`StoredAgentBirth` は draft をそのまま継承)。
- **要求**: 実装側 (#15) で `forge-onchain.ts` 内に `if (privateKey)` 分岐や `viem.privateKeyToAccount(privateKey)` を **絶対に呼ばないこと**。grep で `privateKeyToAccount` / `mnemonicToAccount` / `signTransaction(playLog` の検出をゲートに入れる。
- **要求**: `ForgedAgent` から `seed` を最終的に削除する (別 PR で OK)、もしくは `seed` は cosmetic identity 表示のみと明示するコメントを残す。
- **要求**: localStorage に書き込む場合は `privateKey` フィールドを必ず除去 (storage scrubber を実装)。

### S-5: approve race — unlimited token approve before swap

- **状態**: 高リスク。**致命的トップ 3**。
- **詳細**: Sepolia の testnet swap でも `ERC20.approve(router, MaxUint256)` を撃つ実装が一般的だが、これを agent born 直後にユーザーへ「無断で」要求するとフィッシング誘発耐性が低下する (本物 mainnet UX で同じパターンに慣れさせるのは有害)。さらに 2 つ目のリスク: SwapRouter02 の旧バージョンには「approve 後 swap が pending のまま放置 → 別 tx で再 approve」の race があり、既存 approve の上書き挙動 (USDT 系で 0 戻し必要) を考慮していないと revert する。
- **要求**: approve は `exactInputSingle.amountIn` ぴったり (FINITE) に制限する。`MaxUint256` 禁止。
- **要求**: もし testnet トークンが OpenZeppelin standard ERC20 で approve race の影響を受けない場合でも、コードコメントで意図を明記。
- **要求**: approve を Permit2 + signature ベースに置き換える場合は別 ADR を作成 (今 PR スコープ外でも可)。

### S-6 (追加): tokenURI に PII / large data を埋め込みすぎないか

- 現仕様の data URI には `archetype` / `combat-power` / `playLogHash` / `storageCID` のみ。OK。playLog 全体や user handle を tokenURI に直接 base64 化しないこと (gas 爆発)。

### S-7 (追加): NameWrapper / Resolver の write 権限

- ENS の `setSubnodeRecord` は parent owner (or controller) のみ可能。controller wallet の private key を frontend に持たせることは絶対禁止。**parent owner = ユーザーの connected wallet** とする運用にすること。controller を hackathon org 側で持ちたいならば backend が必須になり、本 PR の「backend 完全削除」前提と衝突する。**実装方針の確認が必要**。

---

## パフォーマンス

### post-game `Promise.allSettled` は UI を block するか

- **想定**: ゲーム本体 (60fps) は終了済 (`onComplete` 呼び出し時点で BirthArcade の rAF ループは止まっている想定) なので main thread の競合は最小。
- **リスク**: しかし `await createAgentBirthDraft` (既存の同期的 hash 計算) と `Promise.allSettled([0gPut, mint, ens])` の **両方が** `handleComplete` 内で順次 `await` されると、最初の forge が遅延した分だけ Web3 ステップ開始が遅れる。仕様 64 行の図では `forge → allSettled` の順で OK。
- **要求**: `setBirth(stored)` を allSettled より **前** に呼んで AgentDashboard を即時表示し、各 step は `pending` 状態で render されること。allSettled の resolve に応じて individual state を更新。これにより「画面が真っ暗で待たされる」を回避する。
- **要求**: `setSubmitting(true)` 中は ARCADE 部分のみ disable、Dashboard はインタラクティブにする。

### ON-CHAIN PROOF パネルは reactive か

- 各 step を **独立した state** で持ち、`setStorageState({status: 'pending'})` → `setStorageState({status: 'success', cid})` のように個別更新する設計が必要。`Promise.allSettled` の結果を最後に一括 setState するとリアクティブにならない。
- **要求**: `useOnChainForge` 等のカスタム hook で 4 つの state を独立に持つ。各 step の resolve / reject ハンドラから個別に setState する (allSettled でラップしつつ内部で個別 then/catch を使う)。

---

## 既知のリグレッションリスク (AgentForgeINFT 書き換え影響)

既存 `AgentForgeINFT.sol` (1-41 行) は `forge(owner, ensName, playLogHash, policyBlob) → tokenId (uint256, monotonic)` のシグネチャ。これを ERC-721 + deterministic tokenId に書き換える。

| リスク箇所 | 現状 | 書き換え後 | 影響 |
|------------|------|------------|------|
| `_nextTokenId` 単調増加 | tokenId = 1, 2, 3 ... | tokenId = `keccak(...)` (uint256) | UI の `birth.agent.tokenId` 表示は string 化必要 (既に string)、`AgentDashboard.tsx:71` の `dd>{birth.agent.tokenId}` は OK |
| `forge` 関数名 | `forge(...)` | spec では `mintINft` 想定 (zerog-mint.ts) | 既存テスト (foundry test 未存在) なし。`Deploy.s.sol` は `new AgentForgeINFT()` のみなので OK |
| `embedPolicy` | 別 tx で policy 上書き可 | tokenURI に埋め込む設計に変わる場合は失われる | UI 影響なし。仕様外なので削除 OK |
| `AgentForgeSubnameRegistry.sol` 削除 | `Deploy.s.sol:6,24,33` で参照 | 削除後はコンパイルエラー | **`Deploy.s.sol` も同時に修正必須**。Developer #14 の DoD に明記する |
| `ForgedAgent.tokenId` の値域 | `string` (任意) | uint256 max のため `bigint.toString()` | 既存表示は string なので OK だが、`shortAddress` 等で誤って 16 進数にしないよう注意 |

UI 側で「旧コントラクト shape を仮定している」コードは現状ほぼ無い (フロントが `forge` を直接呼んでいないため)。だが PR には旧 `AgentForgeSubnameRegistry` 削除と `Deploy.s.sol` の修正が連動しないと **ビルド破綻** するので、Developer 統合時にチェック必須。

---

## 致命的所見トップ 3 (マージ前修正必須)

1. **deterministic tokenId の griefing 経路** (S-3)
   tokenId が `keccak(playLogHash)` のみだと、他人の playLog を入手した攻撃者が先に mint して target の forge を永久に塞げる。`tokenId = keccak(playLogHash, msg.sender)` に変更すること。冪等性 (同 wallet・同 playLog → 同 tokenId) は維持される。**Issue #14 (contracts) で対応**。

2. **deterministic wallet からの秘密鍵が UI / storage に漏れている可能性** (S-4)
   `wallet.ts` の `derivedWallet.privateKey` が `StoredAgentBirth` 経由でメモリ・localStorage に流れる経路がある。実装側で `privateKeyToAccount(privateKey)` を **絶対に呼ばない** ガードを置き、`StoredAgentBirth` 永続化前に `privateKey` フィールドを scrub する。**Issue #15 (frontend) で対応**。

3. **chain-spoofing と Uniswap unlimited approve** (S-2 / S-5)
   wagmi で chain switch を `await` せずに `writeContract` するとユーザー接続中の chain に書き込まれて事故る。各 `writeContract` で `chain:` 明示、switch 完了を待つガード必須。さらに Uniswap の approve は `MaxUint256` 禁止、`amountIn` ジャストに制限すること。**Issue #15 (frontend) で対応**。

---

## 実装後 QA 再実行チェックリスト

Developer の PR が push されたら以下を再走:

- [ ] 本書のテストマトリクス全 50 行を消化、結果を本書末尾に追記
- [ ] E2E スクリプト 12 ステップを Playwright / Chrome DevTools MCP で記録、`docs/specs/2026-04-27-web3-wiring-qa-evidence/` に screenshot 保存
- [ ] OWASP セクションの 5 リスク (S-1 ~ S-5) について実装で対処されていることを diff で確認
- [ ] `make before-commit` の各ゲート結果を貼る
- [ ] `bun scripts/architecture-harness.ts --staged --fail-on=error` の結果を貼る
- [ ] critical 3 件が解消されたら verdict を `ship` に更新
