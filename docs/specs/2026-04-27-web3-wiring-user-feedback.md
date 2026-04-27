# Web3 Wiring — User Feedback (Persona Walkthroughs)

**対象仕様**: [`2026-04-27-web3-wiring.md`](./2026-04-27-web3-wiring.md)
**レビュー視点**: User-perspective reviewer (PM/Designer/Developer/QA とは別役割)
**日付**: 2026-04-27

本ドキュメントは、仕様書 / README / `App.tsx` を 3 つのペルソナ視点で歩き直し、Submission 直前に潰すべき UX 課題を抽出するためのものである。スコアは「現仕様どおり実装された場合」の暫定値。

---

## Persona A — ETHGlobal 審査員 (Hacker Judge)

**プロフィール**: 1 サブミッションあたり 15 分。1 日に 30〜50 件捌く。3 分 demo 動画 → live demo URL → GitHub README → contract address → 賞ごとの該当箇所、の順で見ていく。ルーブリック (technical depth / originality / wow factor / sponsor alignment) を脳内で回している。

### First impression (0:00-0:30)

- README の冒頭ヒーローはきれい。「Kill the tradeoffs. Play to design your AI agent.」のキャッチが立っており、`▶ Play live demo` ボタンが目に入る。**ここまでは好印象**。
- しかし `Sponsor integrations` 表で **`AgentForgeSubnameRegistry.sol`** と **`packages/shared/src/forge.ts`** が「ENS の場所」として列挙されている一方、本仕様 (`2026-04-27-web3-wiring.md`) では `AgentForgeSubnameRegistry.sol` を **削除** する設計になっている。**README と仕様の整合が崩れたまま提出すると、審査員は「どっちが本当?」で 30 秒消費する**。これは致命的。
- README の「Roadmap」に "Real wallet integration (wagmi + RainbowKit) so the iNFT mints to the player's actual wallet" が **未チェック** で残っている。本仕様で実体化するならこのチェックを外しておくか、Roadmap から消す必要がある。「未来の話」と読まれた瞬間、Web3 部分は cosmetic 判定される。

### What works

- `Architecture` 図が ASCII で明快。Browser → shared/forge.ts → ENS / Gensyn / 0G / Uniswap の依存関係が一目で分かる。
- `Sponsor integrations` テーブルが「Where in the code」列を持っているのは大きい。審査員は GitHub に飛んで該当ファイルを 1 クリックで開ける。
- `App.tsx` の `FORGE_FLOW` (Step 01-07) が UI 上に出る設計は、demo 動画で「いま何が on-chain で起きているか」を可視化するのに有効。`STEP_05/06/07` が `critical` ステータスで赤マーカー化されているのは「ここが本気の統合ポイントです」と審査員に伝わる。
- 仕様書の **Prize Targets** テーブルが「Score」「NG リスク」「提出物チェック」列を持つのは異例で、審査員側の採点ロジックを内部化している証拠。これは審査員に好印象。

### What confuses / breaks

1. **README と仕様の不整合 (致命)**: 上述。`AgentForgeSubnameRegistry.sol` 削除 / 本物 ENS 化を README に反映していない。
2. **`AgentDashboard` の OnChainProof セクションが App.tsx に未実装**: 仕様書には書かれているが、現 `App.tsx` の `DashboardSection` は `<AgentDashboard birth={birth} archetype={archetype} />` を呼ぶだけ。実装が間に合わずダッシュボードに explorer link が出ないと、demo 動画の 1:20-2:30 (一番の山場) が空振りする。
3. **`StatusBar` の `CHAIN: SEPOLIA` ハードコード**: `App.tsx` 320 行目。実際には 0G Galileo + Sepolia の 2 チェーンに同時に書いている。「いま 0G 上で何が起きたのか」が StatusBar からは見えず、審査員は「結局 Sepolia しか触ってないのでは?」と疑う。
4. **`SPONSOR_PAYLOAD` の数字 ($15K / $5K / $5K = $25K)** と仕様書の **「現実値 $8〜12K」** に乖離がある。LP では target を強気に出しつつ、内部見積りは控えめ。これは健全だが、審査員に「LP の数字は何の根拠?」と聞かれた時の答えを `FEEDBACK.md` 等で用意しておかないと突っ込まれる。
5. **3 分 demo 動画の脚本** (仕様書) で `1:20-2:00 — 自動的に Promise.allSettled で 3 並列 on-chain action` とあるが、実際には wallet の署名プロンプトが 3 連発で出る可能性がある。MetaMask の confirm を 3 回連打している映像は「自動」と謳いにくい。**動画では事前に承認済みの demo wallet を使うか、batched/silent flow を検討すべき**。

### Score they'd give

**6.5 / 10** (現仕様どおり、README 不整合が残ったまま提出した場合)
**8.0 / 10** (README/Roadmap を仕様に合わせ、OnChainProof セクションが demo 動画で映る場合)

---

## Persona B — 初プレイの非エンジニア (First-time Player, No Web3 BG)

**プロフィール**: Twitter で「60 秒で AI エージェント作れるアーケードゲームらしい」というポストを見て、live URL を踏んだ。MetaMask は入れていない。Web3 用語は ENS も iNFT も知らない。

### First impression (0:00-0:30)

- LP の見た目は「カッコいい戦闘機 / レトロアーケード」。`▸ CLEARED FOR TAKEOFF` ボタンを押すと arcade セクションに飛ぶ。プレイヤー名 `Kotetsu` がデフォで入っているのは親切。
- ただし `StatusBar` の `ICAO: GNSH / HDG: 027° / CHAIN: SEPOLIA / OP: ETHGLOBAL_TOKYO` は **完全に意味不明**。「ICAO って何? チェーンって? 東京のイベント?」となる。**カッコよさのために情報を捨てている領域**。プレイヤーには無害だが、後段の OnChainProof で同種の用語が並ぶと脱落する伏線になる。
- Connect Wallet ボタンが nav にある。クリックすると wagmi の wallet 選択モーダルが開くが、**MetaMask 未インストールの人は「何これ? 必要なの?」で離脱する可能性が高い**。「Wallet なしでもプレイできます」のマイクロコピーが必要。

### What works

- 60 秒ゲームは指示なしで遊べる。矢印キー / WASD で動き、自動射撃。Mario 1-1 の哲学が効いている。
- 色 = archetype の対応がプレイ中の敵色から学習できる (CYAN/YELLOW/RED の 3 色)。「赤を撃ったら RISK」は直感的。
- ゲーム終了 → ダッシュボードに自動スクロール (`App.tsx` 248-253 行) は親切。「終わった、で、何?」を防いでいる。

### What confuses / breaks

1. **wallet 接続なしでプレイした場合の挙動が仕様書に書かれていない**:
   - `App.tsx` の `handleComplete` は `ownerAddress` がなければ `draft.agent` の deterministic wallet を使う設計 (228-231 行)。
   - だが新仕様では mint / ENS / swap がすべて `wagmi の connected wallet で署名` となっている (非機能要件)。**wallet 未接続のプレイヤーは on-chain 部分が一切走らない** はず。これは UX として「ゲーム終わったけどダッシュボードに何も on-chain っぽいものが出ない」となる。
   - **Fix**: ゲーム開始前に「Wallet を繋ぐと iNFT がもらえます。繋がなくても遊べます」のオプトイン UI が必要。あるいは、未接続なら OnChainProof セクションで「Connect wallet to mint your iNFT」ボタンを出す。
2. **「ENS subname」「iNFT」「0G Storage CID」の用語が説明なしに OnChainProof に並ぶ**: 仕様書 UI 設計 100-109 行。プレイヤーは「subname って何? ドメイン?」「CID って何?」となる。**ホバーで日本語/英語の 1 行説明 (tooltip) が必須**。
3. **Sepolia / 0G Galileo の testnet 概念が不明**: 「ETH 持ってないと使えない?」という疑問。**「これは testnet です。本物のお金は要りません」のバッジが必要**。
4. **署名プロンプトが 3 連発 (mint / ENS / swap)**: 仕様の `Promise.allSettled` で並列に走らせる設計だと、wallet モーダルが連続で開く。非エンジニアは 1 回目で「???」、2 回目で「怖い」、3 回目で離脱。**順次・確認ステップ付き UX が必要**。または「全部まとめて承認しますか?」のメタ確認画面。
5. **「INSERT COIN FOR FIRST TRADE」ボタン**: 仕様 UI 設計 107 行。これは「もう一回コイン入れろ」の意味なのか、「初取引するためのトリガー」なのか曖昧。プレイヤーは「もう 1 回ゲームするの?」と誤解する。**ラベルを `▶ EXECUTE FIRST SWAP` 等の動詞に**。
6. **エラーメッセージ**: 仕様の非機能要件で「日本語/英語で読める」とあるが、`viem` が吐く生エラー (`ContractFunctionExecutionError: ...`) をそのまま見せると非エンジニアには無価値。**翻訳レイヤーが必要 (例: "RPC が混んでいます。少し待ってから再試行してください")**。

### Score they'd give

**5.0 / 10** (ゲーム自体は楽しいが、後段の Web3 部分で確実に脱落する)
**7.5 / 10** (wallet オプトイン + tooltip + sequential signing + エラー翻訳が入った場合)

---

## Persona C — 0G Prize Sponsor 審査員

**プロフィール**: 50+ サブミッションを 0G 賞のために横並び比較する。1 件あたり 30 秒〜2 分で「meaningful か cosmetic か」を判断する。`docs/prizes/0g-*` を熟知している。「intelligence embedded」「ERC-7857」「Storage SDK 実呼び出し」「Compute での sealed inference」の 4 キーワードで篩にかける。

### First impression (0:00-0:30)

- README の `Sponsor integrations` テーブルで **0G** が筆頭。「iNFT (ERC-7857) for the agent body, Storage for the play log + memory, Compute for sealed inference」と書かれている → **「Compute まで使ってるの?!」と一瞬期待する**。
- しかし仕様書の Prize Targets を見ると `0G Compute: 0 (範囲外)`。**README と仕様で食い違っている**。これは Persona A と同じ問題だが、0G 審査員は特に Compute を見ているので**減点が大きい**。
- contract address が README に記載されていない。**explorer link を 30 秒で踏めないと篩から落ちる可能性がある**。`.env.example` に書く設計だが、README にも `0G Galileo deployment: 0x...` を書くべき。

### What they need to verify in 30 seconds

1. **0G Galileo explorer の minted iNFT**: `tokenId`, `tokenURI` が見えるか。`tokenURI` の中身に `archetype`, `combat-power`, `playLogHash`, `storageCID`, `design-hash` が入っているか (これが「intelligence embedded」の証拠)。
2. **0G Storage SDK の実呼び出しコード**: `packages/frontend/src/web3/zerog-storage.ts` (新規) に `@0glabs/0g-ts-sdk` の `put` 呼び出しが本当に書かれているか、`btoa(JSON.stringify(...))` でお茶を濁していないか。
3. **CID と iNFT の紐付け**: minted iNFT の `tokenURI` に `storageCID` が embed されているか。**ここが切れていると「Storage と iNFT は別々に使っただけ」判定で減点**。

### What disqualifies

- **`tokenURI` が単なる static IPFS pin / data URI で `playLogHash` を含まない**: 「intelligence embedded」を主張できなくなる。
- **0G Storage が data URI fallback で動いている (実 SDK 呼び出しゼロ)**: 仕様の「リスク対策」で fallback を許容しているが、demo 環境でこれが起きていると即失格。**demo 動画では必ず実 SDK でのアップロードを成功させる**こと。
- **iNFT が ERC-721 ベースなのに「ERC-7857-style」と主張**: 仕様で正直に「ERC-721 + tokenURI で ERC-7857-style」と書いているのは良いが、demo 動画で「ERC-7857 です」と言い切ると審査員が `IERC7857.sol` interface 確認で落とす可能性。**「ERC-7857 inspired」「ERC-7857-compatible metadata schema」等の慎重な表現を**。
- **mint が deterministic でない**: 仕様の冪等性要件 (`tokenId = keccak(playLogHash)`) は良い。これがコードで担保されていないと「同じ play log で 2 個 mint された」が起きて減点。

### What earns top-tier ranking

- **3 分 demo 動画にタイムスタンプ付きの 0G 章**: 例 `1:30-2:00 — 0G Galileo iNFT mint (explorer URL: https://...)` 。審査員はこの 30 秒だけ見たい。
- **`tokenURI` metadata の README 内サンプル**: README または `docs/specs/` に「実際に mint された iNFT の tokenURI JSON」を 1 例貼る。`design-hash`, `archetype`, `combat-power`, `storageCID` が並んでいることを審査員が GitHub 上で確認できる。
- **Storage に put した play log JSON の例**: 同じく公開しておく。「これが Storage に保存されてます (CID: 0x...)」を審査員が `0g storage download` 等で再現できれば top tier。
- **`docs/prizes/0g-*.md` への self-mapping**: 「0G 賞要件のこの項目に、本プロジェクトのこの実装が対応します」を表形式で書く。**Prize Targets テーブルがすでに近いが、0G 単独で別ファイル化すると効く**。

### Score they'd give

**5.5 / 10** (現仕様、README で Compute を主張しつつ実装ゼロ、explorer link 未記載)
**8.5 / 10** (README から Compute 主張を削除 + contract addr 記載 + tokenURI サンプル公開 + demo 動画タイムスタンプ整備)

---

## Top 5 Fixable UX Issues (優先度順)

### 1. README と仕様の整合を取る (致命・全ペルソナ共通)

- `AgentForgeSubnameRegistry.sol` を削除する設計を README の `Sponsor integrations` テーブルと `Repository layout` に反映する。
- `Roadmap` の "Real wallet integration (wagmi + RainbowKit)" のチェックを「実装済み」に更新するか、本項目を削除する。
- `Sponsor integrations` の **0G** 行から `Compute for sealed inference` を削除 (Phase 2 と注記)。**これを残したまま提出すると 0G 審査員から「嘘」判定される**。
- `Where in the code` 列を `packages/frontend/src/web3/zerog-mint.ts` 等の新規ファイルに更新。

### 2. Wallet 未接続プレイヤーの導線を設計する (Persona B)

- ゲーム開始前: 「Wallet を繋ぐと iNFT を mint できます。繋がなくても 60 秒プレイは可能です」のマイクロコピー。
- ゲーム終了後: wallet 未接続なら OnChainProof セクションに `Connect wallet to mint your iNFT` の CTA を出す。
- Connect 後に `handleComplete` の forge を再実行できるよう、`birth` 状態を保持しつつ on-chain step だけ retry できる UI フローを足す。

### 3. OnChainProof セクションの実装と用語解説 (Persona A + B)

- `AgentDashboard` に「ON-CHAIN PROOF」セクションを実装 (仕様書 100-109 行通り)。
- 各リンクに 1 行 tooltip:
  - `0G iNFT` → "Your agent's body, minted as an NFT on 0G Galileo testnet."
  - `0G Storage` → "The replay of your 60 seconds, stored on 0G's decentralized storage."
  - `ENS subname` → "A human-readable name for your agent's wallet, like a username."
  - `Uniswap tx` → "Your agent's first real on-chain trade."
- ステータス表示: `pending` / `success` / `failed` を視覚的に区別 (Persona A の demo 動画映え + Persona B の安心感)。

### 4. Sequential signing UX with explanatory steps (Persona B)

- 仕様の `Promise.allSettled` で並列起動する設計は技術的には正しいが、wallet モーダル 3 連発は非エンジニアを脱落させる。
- 解決策: 各ステップ前に「次に [0G iNFT を mint] します。Wallet で承認してください」の inline ガイドを出し、1 つずつ承認させる。
- 並列実行は内部の async 処理に留め、署名 UX は sequential に見せる。`sendTransaction` の Promise を await しながら UI で「1/3 mint 中... 2/3 ENS subname 登録中... 3/3 swap 実行中」を見せる。

### 5. 0G 賞特化の「30 秒で確認できる」資料を README に追加 (Persona C)

- README に **`## Quick verification for prize judges`** セクションを新設。
  - 0G Galileo iNFT contract address (mainnet 風 0x...)
  - 直近 mint された tokenId のサンプル + tokenURI JSON 全文 (展開表示)
  - 0G Storage に put された play log の CID + ダウンロードコマンド例
  - Sepolia ENS subname の resolver URL (sepolia.app.ens.domains リンク)
  - Uniswap swap tx hash (etherscan link)
- これで審査員は GitHub から 30 秒以内に `この実装は本物だ` と判定できる。**top-tier ランキングの最短ルート**。

---

## 補足: 各ペルソナのスコア集計

| ペルソナ | 現仕様まま | 上記 Top 5 fix 後 | デルタ |
|----------|-----------|-------------------|--------|
| A. ETHGlobal 審査員 | 6.5 | 8.0 | +1.5 |
| B. 初プレイ非エンジニア | 5.0 | 7.5 | +2.5 |
| C. 0G prize 審査員 | 5.5 | 8.5 | +3.0 |

**最大 ROI は Persona C (0G 審査員)**。README の不整合修正と Quick verification セクションの追加だけで 30 分かからずスコアが +3.0 動く。submission 直前の「あと 1 時間あったら何をやる?」の答えは **Top 5 のうち 1 と 5 を 1 時間で潰す**。残り (2/3/4) は実装 PR と並行で取り組む。
