# 0G Storage SDK 実統合 QA レビュー

> 担当: QA / 対象仕様 [`2026-05-01-zerog-storage-real.md`](./2026-05-01-zerog-storage-real.md) / 対象ブランチ `feat/safety-tutorial`

## 判定 (3 行)

- HOLD — Developer agent が並列で `@0gfoundation/0g-ts-sdk` 統合を進めている前提で、本書は仕様書ベースの先回り QA。コードが land したら本書のテストマトリクスを再走させて verdict を更新する。
- 仕様レベルで致命的合意不足が 4 件ある (chain id 16601 残存箇所の検出網漏れ、rootHash front-running による「他人の playLog を自分の subname に貼る」経路、JSON stringify と merkleTree 計算の main thread block、env 変数経由の URL injection を ENS text record にそのまま書き出す経路)。実装前に確定すること。
- 前回 Web3 Wiring の振り返り (`Plan.md` 振り返り: tokenId に msg.sender を bind し忘れた件) と Agent 安全アテステーション QA (subname handle griefing) と同レベルの griefing / 整合性経路を本仕様内に最低 1 件発見した。Developer に共有する。

---

## Security 5 軸 + bundle size レビュー

仕様 162-170 行の Security 表は 7 軸を並べているが、本書は 1 軸ごとに「本機能特有の攻撃面」「仕様の現状対策」「追加要件」を掘り下げる。前回 tokenId griefing 級の指摘を 1 件以上含める。

### Chain spoofing

- この機能特有のリスク
  - 仕様 17 行で `0G Galileo の chain id を 16601 → 16602 に修正` とあるが、grep 漏れリスクが極めて高い。`packages/frontend/src/web3/chains.ts`、`App.tsx` の `CHAIN_LABELS`、`contracts/foundry.toml` のコメントの 3 箇所が修正リストに挙がっているが、wagmi config (`wagmi.config.ts` か `web3-providers.tsx` 相当)、`safety-attestation.ts` のチェーン assert、テスト fixture、`.env.example`、README、過去の docs (`docs/specs/2026-04-29-*`)、デモ動画台本に古い `16601` がリテラルで残ると以下が起きる。
    1. wagmi が `16601` で chain を解決できず、`useSwitchChain` が「unknown chain」エラーで投げる (UI に英語のスタックトレースが出る)。
    2. ENS write 直前の `walletClient.chain.id !== sepolia.id` assert が、間違って `walletClient.chain.id === 16601` を期待していた場合、Sepolia のみの check は通るが「Galileo に居る」状態を見逃す。
    3. `upload` 直前の chain assert を `walletClient.chain.id === 16601` で書いた場合、実際は 16602 に switch されるので毎回 failed に倒れて sha256 fallback に落ちる。demo 中に「real put」が一度も成功しない silent degrade が起きる。
  - 本機能で最も致命的なのは (3)。仕様 168 行「直列で chain 切替後に upload」だが、chain id 検証の比較値そのものが古い 16601 のまま残るとフォールバックに毎回落ちて real demo にならず、judge 評価が cosmetic で終わる。
- 仕様書の現状対策
  - 17 行で chain id 修正、164 行「各 write 直前に `walletClient.chain.id` を再 assert、不一致なら failed」。
- 十分か / 追加要件
  - **不十分**。以下を追加要件として明文化する。
    1. `CHAIN_IDS` のような単一 const を `chains.ts` に置き、`GALILEO = 16602` `SEPOLIA = 11155111` を export。比較する側 (orchestrator / SDK ラッパ / UI) は const を import し、リテラル 16601 / 16602 を直書きしない。
    2. `bun scripts/architecture-harness.ts` に「`16601` が grep でヒットする場所がコメント / docs 以外にないこと」のルール追加を ADR で検討する。最低でも `make before-commit` の前に `git grep -n 16601 -- ':!docs' ':!*.md'` を手動で叩くことを CLAUDE.md / Plan.md 振り返りに記録する。
    3. 受け入れ基準に「`bun test` で `chains.ts` の `GALILEO_ID === 16602` を assert」「`safety-attestation.test.ts` で chain mismatch を 16601 / 16602 / 11155111 の 3 値全てで cover」を追加。
    4. `useSwitchChain` の Promise resolve 直後に `walletClient.chain.id` が反映されていない場合 (wagmi v2 では `chain` は `account` 経由で更新される race がある) のため、`waitForChain` 的な util で 100ms 間隔 ×10 回までポーリング、unmatched なら failed に倒す。仕様 23 行「1 度試行し、失敗時は friendly Japanese error」は試行 1 回で打ち切るので race を取りこぼす。

### Replay (同じ playLog → 同じ rootHash か)

- この機能特有のリスク
  - 仕様 35 行「同じ playLog を 2 回 put しても deduplication が 0G 側で起きる (同じ rootHash が返る) ことを期待」とあるが、これは SDK 側の merkleTree 構築が決定的かどうかに依存する。`@0gfoundation/0g-ts-sdk` の `Blob.merkleTree()` は「JSON.stringify(json)」を入力に取るが、`JSON.stringify` は **キー順序を保証しない実装が存在する** (V8 は挿入順だが、attestation オブジェクトを作る経路で key 順が変わると hash も変わる)。仕様 90 行の `JSON.stringify(json)` をそのまま使うと、`deriveSafetyAttestation` の return 順が日次でリファクタされた瞬間に rootHash が変わり、同じプレイ内容なのに「2 回目の attestation だけ別 rootHash で iNFT に焼かれる」事故が起きる。
  - もう一つ: `Blob` ラッパを `new File([blob], 'payload.json')` とファイル名込みで作っているが、ファイル名が merkleTree の入力に混ざっている場合、payload は同じでもファイル名違いで rootHash が変わる。SDK 仕様の確認が必須。
- 仕様書の現状対策
  - 35 行で「期待」と書くのみ、test 必須化のレベルに達していない。
- 十分か / 追加要件
  - **不十分**。以下を追加要件として渡す。
    1. JSON stringify を canonical 化する。`canonicalize(obj)` 的な keys-sorted serializer を `packages/shared/src/canonical.ts` に新規追加 (依存外で書ける)、attestation と playLog の両方で適用する。これは `agent.safety.attestation` の値が日次で変わらない保証にもなる。
    2. ファイル名 (`payload.json`) を固定し、SDK が hash 入力にファイル名を含むかを `zerog-storage.test.ts` で「同 payload + 異ファイル名 → 同 rootHash」を assert して仕様を pin する。
    3. `zerog-storage.test.ts` に「同じ playLog object を 10 回 put → rootHash 全て一致」「キー順を逆にした同等 object → rootHash 一致」の 2 テストを必須化。
    4. 仕様 35 行を「期待」から「保証」に格上げし、保証手段 (canonical serialize) を本文に追記。

### Front-running (upload 完了前に他者が同 rootHash を別 wallet から claim する攻撃)

- この機能特有のリスク (前回 tokenId 級の致命指摘候補)
  - 0G Storage は content-addressed なので、攻撃者が user A の playLog JSON を gameplay 中に sniff (例: dev console から `runtime.playLog` を読む、demo URL の `?seed=demo` で同じ playLog を再現、または source map から復元) できれば、A より先に同 JSON を自 wallet B で 0G に put して同じ rootHash を取得できる。
  - 続いて B が「自分の ENS subname の `agent.safety.attestation` に同じ `0g://{rootHash}` を貼る」と、**第三者から見て同一の attestation CID を 2 つの subname が指す**状態が成立する。本機能で iNFT metadata の `storageCID` にも同じ rootHash が焼き込まれるため、B が iNFT を mint すれば「A の playLog に裏打ちされた iNFT を B が保有」する偽装が完成する。
  - 仕様 166 行「mint 時の tokenId に msg.sender を bind 済 (前 PR)」で iNFT 自体の所有権は守られるが、tokenURI の `storageCID` が指すのは A の playLog なので、metadata 上の「intelligence/memory embedded」主張は B 視点でも成り立ってしまう。これは前回 PR #14 の tokenId griefing と同じ構造 (wallet と外部参照値の bind が不足)。
  - もう一段: ENS text record `agent.safety.attestation` を読む judge / 第三者が、CID から JSON を取ってきて `walletAddress` を見ても、それは A のアドレス。subname owner B は別 wallet なので、JSON の中身 (`walletAddress = A`) と subname owner (B) の不整合が成立する。判定側で wallet bind を確認しないと「他人の attestation を貼って高得点を僭称する」が通る。
- 仕様書の現状対策
  - 168 行「Sepolia switch は upload Promise の resolve 後でのみ実行 (直列)」のみ。これは自セッション内の race を防ぐが、第三者 front-running を防がない。
  - 166 行 Griefing 行は「upload 時の signer = msg.sender」。これは 0G 側の支払い signer の話で、playLog の origin 担保ではない。
- 十分か / 追加要件
  - **不十分。critical 指摘**。以下を追加要件として渡す。
    1. attestation JSON の `walletAddress` フィールド (前 QA で要件化済み) を、ENS write 直前にもう一度 `walletClient.account.address` と一致するか assert する。CID を text record に書く前にこの check を必ず通す。
    2. iNFT mint 時、tokenURI の `storageCID` を「playLog JSON の `walletAddress === msg.sender`」を mint 関数側で検証する経路を本機能スコープ外で持てない場合、**フロント側で「他者の rootHash を貼ろうとしたら reject」する UI 層 guard を必須化**。具体的には orchestrator が `storageProof.data.cid` を ENS / iNFT に渡す前に、その CID から JSON を `Indexer.download` で読み戻して `walletAddress` を確認する。download コストを避けたい場合は「自セッションで put した CID」をローカルキャッシュ (`sessionStorage`) と突き合わせ、不一致なら abort。
    3. `safety-attestation.test.ts` に「他者の rootHash (= attestation.walletAddress !== currentAccount) を ENS / iNFT に渡そうとしたら例外を投げる」ケースを必須にする。
    4. 仕様書 162 行 Security 表に「Front-running — 第三者が user の playLog を sniff して先 put → 同 rootHash を別 wallet で claim — UI 層で walletAddress 突合 + sessionStorage で自 put CID をキャッシュ」を加筆する。

### Privacy (rootHash が公開されることでプレイ履歴が公開メタデータ化)

- この機能特有のリスク
  - 仕様 167 行「playLog に PII 含まない (現状維持)、rootHash 公開を UI で告知」とあるが、playLog には `walletAddress` が含まれており、これが公開 storage に永続化される時点で「wallet と play 行動の bind が公開」になる。subname owner = wallet の関係から `agent.safety.attestation` text record → CID → JSON → walletAddress の dereference 経路で逆引き可能。これは PII ではないが、**wallet と行動指紋の永続的な bind** であり、前 QA でも指摘済の延長。
  - もう一点: `agent.misalignment.detected` text record は kind ごとの hit / pass count を持つ。0G CID と組み合わせると「どの misalignment kind を見落としやすいか」を第三者が wallet 単位でクラスタ化できる。
  - そして 0G Galileo は testnet とはいえ public storage explorer から JSON を生で読める。「demo 撮影中に手元で実プレイした testnet wallet」が本人の identity と一致している場合、本人の安全傾向が permanently 公開記録になる。
- 仕様書の現状対策
  - 167 行 Privacy 行のみ。
- 十分か / 追加要件
  - 中程度。以下を追加要件として渡す。
    1. AgentDashboard 内に「この attestation は 0G testnet 上で誰でも閲覧可能です。本人特定可能な情報は含まれません (walletAddress を除く)」の日本語注記を必須化。
    2. `walletAddress` を attestation JSON から落として hash (例: `keccak256(walletAddress)` の prefix 8 byte) のみを記録する選択肢を仕様書で議論する。ただし Front-running 節の walletAddress 突合と矛盾するため、「JSON 内には full address、but UI 表示時は短縮 + hash 比較」のように切り分ける。
    3. 受け入れ基準に「AgentDashboard に privacy notice の日本語コピーが表示される」を追加。

### Secret leakage (env var の RPC URL に key が紛れ込まないか)

- この機能特有のリスク
  - 仕様 88 行で `VITE_ZEROG_RPC` を fallback `https://evmrpc-testnet.0g.ai` で受ける。`VITE_*` prefix は Vite で **クライアントバンドルに焼き込まれる** ため、開発者が誤って `VITE_ZEROG_RPC=https://my-private-rpc.example?apiKey=xxxxx` と書くと、本番ビルドの JS バンドルに API key が含まれて公開される。
  - 同様に `VITE_ZEROG_INDEXER` も bundle に焼き込まれるので、Pro tier indexer の key 付き URL を入れると流出する。
  - もう一つ: SDK の error メッセージが URL を含む場合、failed UI で日本語 friendly error を出すと言いつつ、原文を `errorMessage(err)` でそのまま表示すると URL の query string が出る経路がある。
- 仕様書の現状対策
  - 32 行「secret は env / wallet 経由のみ、ハードコード禁止。failure 時のメッセージで private key やシークレットを露出しない」。
- 十分か / 追加要件
  - 中程度。以下を追加要件として渡す。
    1. `.env.example` に `# 警告: VITE_* prefix の env はクライアントバンドルに焼き込まれます。private key 系は禁止、auth 必要な indexer は backend 経由を検討` の注記を日本語で追記。
    2. `errorMessage(err)` を `safety-attestation.ts` で使う際、URL を含む文字列は regex で `https?://[^\s]+` を `[redacted]` に置換する sanitizer を必須化。
    3. README に「`VITE_ZEROG_RPC` は public testnet endpoint のみ許可」を明記。
    4. orchestrator のテストで「`VITE_ZEROG_RPC` に `?apiKey=secret123` を含む URL を設定した状態で failed させ、UI に出る error 文字列に `secret123` が含まれない」を必須化。

### Bundle size (SDK が +200KB 超える可能性)

- この機能特有のリスク
  - `@0gfoundation/0g-ts-sdk` は merkleTree 計算を内蔵、依存に `ethers` (5 系か 6 系)、`buffer` polyfill、`crypto-browserify` 等が含まれる可能性が高い。Vite の browser bundle で full import すると **gzip で +300〜500 KB** が現実的な見積。これはランディングページの初回ロード体験を直接悪化させる (LP は INSERT COIN 直後にゲームに入る前提で軽量だったはず)。
  - 仕様 170 行「dynamic import で 0G コード分離検討、build size を gate で監視」とあるが、これは「検討」止まりで強制力がない。仕様書 184 行の実装順序にも bundle size budget の gate が無い。
- 仕様書の現状対策
  - 170 行「dynamic import 検討」のみ。
- 十分か / 追加要件
  - **不十分**。以下を追加要件として渡す。
    1. `zerog-storage.ts` の SDK import を **必ず dynamic import** にする。`async function loadSdk() { return await import('@0gfoundation/0g-ts-sdk'); }` のように、game over まで SDK が evaluate されない経路を強制。
    2. `make before-commit` の build 後に `du -sh packages/frontend/dist/assets/*.js` の出力を Plan.md に記録、main entry の gzip 後サイズが **+150KB** を超えたら Developer に warn する運用を Plan.md 振り返りで決める。閾値は 200KB だと Lighthouse Performance スコアを 10pt 落とすので 150KB が安全。
    3. 受け入れ基準に「LP 初回ロード (`document.body` レンダリングまで) に SDK chunk が含まれていない (Network tab で `0g-ts-sdk` chunk が遅延ロードされる)」を追加。
    4. `vite.config.ts` で manualChunks を設定し、`zerog` chunk を分離する。chunk 名で grep して initial load の HTML に出ないことを e2e で確認。

### Security 軸まとめ

| 軸 | 重大度 | 仕様の対策 | 追加要求 |
|----|--------|------------|----------|
| Chain spoofing | 高 | chain id 修正方針あり | 単一 CHAIN_IDS const、grep で 16601 残存検出、waitForChain ポーリング |
| Replay | 中 | dedup を期待と書くのみ | canonical JSON serialize、同 payload 異ファイル名テスト、10 回 put 同 rootHash テスト |
| Front-running | 高 (前回 tokenId 級 critical) | 自セッション直列保証のみ | walletAddress 突合 + sessionStorage で自 put CID キャッシュ + 不一致 abort テスト |
| Privacy | 中 | PII 除外、UI 告知 | privacy notice 日本語コピー、walletAddress 短縮表示、hash 比較経路の切り分け |
| Secret leakage | 中 | env / wallet 経由方針 | URL redact sanitizer、.env.example 警告、README に public endpoint 限定明記 |
| Bundle size | 高 | dynamic import 検討止まり | dynamic import 強制、main entry +150KB budget、manualChunks 分離、initial load 除外 e2e |

---

## Chain switch race condition 5 ケース以上

仕様 22 行「wallet を 0G Galileo に switchChain → upload → Sepolia に switchChain → ENS setText の順序を保証」を真に受けて、wagmi `useSwitchChain` の挙動境界を以下で必須化する。

### CSR-1: upload 中の手動 chain 切替

- 状況
  - orchestrator が 0G Galileo に switch、`indexer.upload` を await している間 (3-10 秒) に user が MetaMask 上で手動で Sepolia や mainnet に切り替える。
- 期待挙動
  - upload 自体は SDK が保持する signer (event-emitting walletClient) で進む。chain 切替は signer の state に影響するが、進行中の tx は引き戻せない。
  - upload Promise が resolve した時点で `walletClient.chain.id !== 16602` を assert して **失敗扱い** に倒す。「chain が変わった可能性があります、再試行してください」を日本語表示。
  - 既に on-chain 確認まで進んでいる場合の rootHash は捨てない。後段の ENS write には使わず、AgentDashboard 上で「保存は成功しましたが整合性確認のため再試行を推奨」表示。
- 受け入れ基準
  - `safety-attestation.test.ts` に MetaMask の chainChanged event を upload 中に発火させ、orchestrator が failed に倒れる test を必須化。

### CSR-2: useSwitchChain Promise 解決と walletClient.chain 反映遅延

- 状況
  - wagmi v2 で `switchChain({ chainId: 16602 })` の Promise resolve が wallet 側の `chainChanged` event より先に来る race がある。orchestrator が直後に `walletClient.chain.id === 16602` を読むと **古い 11155111 のまま**で見える瞬間がある。
- 期待挙動
  - `switchChain` resolve 直後に sync で `walletClient.chain.id` を読まない。`waitForChain(walletClient, 16602, { timeoutMs: 3000, intervalMs: 100 })` のようなポーリング util で確認する。
- 受け入れ基準
  - `chains.test.ts` または同等のユニット test で、`waitForChain` が timeout 以内に target chain に到達したら resolve、それ以外で reject する関数仕様を pin。
  - orchestrator の test で「switchChain resolve 直後の chain.id read が race る」モックで失敗しないこと。

### CSR-3: Sepolia 戻し失敗時の部分成功状態 (storage OK / ENS NG)

- 状況
  - 0G upload は成功 (`storageProof.status = success`)、その後 Sepolia 戻しの switchChain で user が「キャンセル」を押す。orchestrator は仕様 23 行で `useSwitchChain` を 1 度試行で打ち切るので、ENS は failed に倒れる。
- 期待挙動
  - storage 行は success、ENS 行は failed。failed 文言は `Sepolia への切替がキャンセルされました。再試行してください` (前 QA の文言を踏襲)。
  - retry ボタンは ENS 行のみに出す。storage は再試行不要。
  - rootHash は AgentDashboard と sessionStorage に保存し、retry 時に再 upload なしで再利用。
- 受け入れ基準
  - `safety-attestation.test.ts` で「Sepolia switch reject → storageProof.status === 'success', ensProof.status === 'failed'」を assert。
  - retry 時に再度 upload が呼ばれない (sessionStorage のキャッシュを使う) を assert。

### CSR-4: 0G Galileo に切替えたが testnet ETH 不足で upload 失敗

- 状況
  - chain 切替は成功、`indexer.upload` で SDK 内部の tx が `insufficient funds` で reject される。仕様 12 行「0G testnet ETH を持っていないプレイヤーとして、real put が失敗してもローカル attestation 表示と ENS write は継続」のシナリオ。
- 期待挙動
  - storage 行は failed、`sha256://{hex}` fallback CID が生成される。仕様 21 行「real put が失敗した場合 `sha256://{hex}` の従来 stub にフォールバックし、ENS write は継続」が走る。
  - ENS write は Sepolia 戻し → text record 書き込み。`agent.safety.attestation` の値は `sha256://{hex}` で書かれる。これは前 QA の Front-running 節と整合。
  - failed 文言は `0G Galileo testnet ETH が不足しています。faucet から取得してください (リンク表示)` の日本語。
- 受け入れ基準
  - `zerog-storage.test.ts` で SDK の `upload` が `insufficient funds` を投げた場合に sha256 fallback が動くこと、orchestrator が ENS write に sha256:// を渡すことを test 必須化。
  - faucet リンクは `https://faucet.0g.ai` (公式があるなら) を `<a target=_blank rel=noopener noreferrer>` で出す。リンク先が無いなら 0G docs に飛ばす。

### CSR-5: 0G upload と Sepolia switch を Promise.all で並列にした場合の race (将来リスク)

- 状況
  - 仕様は直列を要求するが、Developer がパフォーマンス改善のつもりで `Promise.all([upload, switchChain])` に変えた場合、switchChain が先に resolve して chain が Sepolia に戻った状態で upload tx が flight 中、と言う矛盾が生まれる。SDK は wagmi の chain change event で signer chain が変わったと検知して reject するか、最悪 wrong chain に対して tx を broadcast する。
- 期待挙動
  - 実装側で `Promise.all` パターンを禁止する。orchestrator のシグネチャ上、`uploadResult` を await してから `ensureChain(SEPOLIA)` を await する直列順を test で固定する。
- 受け入れ基準
  - `safety-attestation.test.ts` で spy を用い、「`switchChain(SEPOLIA)` が `indexer.upload` の resolve より前に呼ばれない」を assert。
  - Plan.md 振り返りに「将来 Promise.all で並列化したくなっても禁止、理由は signer chain race」を記録。

### CSR-6 (補足): chainChanged 中の re-render race

- 状況
  - wagmi の `useChainId` / `useAccount` フックは chain 変更で re-render を起こす。orchestrator が hook 内 (例えば `useSafetyAttestation`) の場合、re-render で orchestrator が再実行されて二重 upload が走る。
- 期待挙動
  - orchestrator は hook 外、または `useEffect` の dependency に chainId を入れない設計。1 回の game over につき 1 回のみ走るように `useRef` で gate。
- 受け入れ基準
  - React DevTools Profiler で game over → orchestrator 完了までの再実行回数が 1 回。

---

## SDK エラー境界値テストマトリクス

`zerog-storage.test.ts` で必須化する境界値を以下に列挙する。各ケースで「fallback (sha256://) に倒れるべきか」「throw すべきか」「success として扱うべきか」を明記する。

### E-1: indexer 接続失敗 (DNS 失敗)

- 入力: `VITE_ZEROG_INDEXER=https://nonexistent.example.invalid`
- 期待: `Indexer` のコンストラクタが例外を投げるか、`upload` が `getaddrinfo ENOTFOUND` で reject。
- 振る舞い: sha256 fallback に倒す。AgentDashboard で `0G Storage に接続できません (ネットワーク確認)` を日本語表示。
- 検証ポイント: error 文字列に invalid hostname がそのまま出ない (Privacy / Secret leakage と整合)。

### E-2: RPC down (HTTP 5xx)

- 入力: `VITE_ZEROG_RPC` が常に 503 を返す mock サーバー (test では fetch を override)。
- 期待: `indexer.upload` 内部の RPC 呼び出しで reject。
- 振る舞い: sha256 fallback に倒す。`0G RPC が応答しません` 表示。
- 検証ポイント: タイムアウト上限 (例 10s) を超える前に reject。fetch に AbortController を渡しているか SDK 仕様を pin。

### E-3: signer 無効 (wallet account address が undefined)

- 入力: `walletClient.account.address` が `undefined` または `0x0`。
- 期待: orchestrator が upload を呼ぶ前に reject、failed 状態。
- 振る舞い: throw でなく、`storageProof = { status: 'failed', error: 'ウォレットが正しく接続されていません' }`。
- 検証ポイント: SDK に到達する前に弾く。

### E-4: playLog 大 (10MB / 100MB)

- 入力: `events: Array.from({ length: 100_000 }, ...)` で約 10MB の JSON を作る。
- 期待: 10MB は SDK 上限内 (一般的に問題なし)、merkleTree 計算で 1-2 秒消費。100MB は SDK 上限超で reject 想定。
- 振る舞い: 10MB → success、100MB → sha256 fallback。AgentDashboard に `attestation サイズが大きすぎます (XX MB)` を日本語表示。
- 検証ポイント:
  - 10MB の merkleTree 計算が main thread を 500ms 以上 block しないこと (perf-1 で再掲)。
  - 100MB の場合は upload を実行せず、JSON サイズ check で先 reject。

### E-5: network timeout

- 入力: fetch を `await new Promise(() => {})` で hang させる。
- 期待: SDK が内部 timeout (例 30s) で reject、または orchestrator が AbortController で打ち切る。
- 振る舞い: sha256 fallback。`0G Storage への保存がタイムアウトしました` 表示。
- 検証ポイント: 30s で確実に打ち切られる。判定: 進行中状態のまま hang しない。

### E-6: DNS 失敗 (E-1 と類似だが、test 環境でモック)

- 入力: fetch に `TypeError: Failed to fetch` を投げさせる。
- 期待: SDK が catch、orchestrator が sha256 fallback。
- 振る舞い: 「ネットワーク接続を確認してください」を日本語表示。

### E-7: SDK の戻り値が `[null, errorMessage]` パターン

- 仕様 96 行「`const [tx, uploadErr] = await indexer.upload(...)` で uploadErr は string」。
- 入力: SDK が `['', 'tx broadcast failed']` で返す。
- 期待: orchestrator が tx 空 string を success と誤判定しない。
- 振る舞い: `uploadErr` が truthy なら sha256 fallback。
- 検証ポイント: SDK のエラー値が `null` / `undefined` / `''` / `'string error'` の 4 パターンで安全に分岐。

### E-8: rootHash が `0x` で始まらない

- 入力: SDK が `tree.rootHash() = 'a1b2c3...'` (0x prefix なし) を返した場合。
- 期待: orchestrator が `0g://0x{hash}` のように prefix を補正、または failed に倒す。
- 振る舞い: `0g://` URI 形式は仕様 19 行で `0x...` を含むので、prefix なしを検出して補正する util を必須化。

### E-9: rootHash が空文字 / 不正値

- 入力: SDK が `''` や `'invalid'` を返す。
- 期待: orchestrator が validation で reject、failed。
- 検証ポイント: regex `^0x[0-9a-f]{64}$` で validate、不一致なら sha256 fallback。

### E-10: indexer/rpc URL が非 https

- 入力: `VITE_ZEROG_INDEXER=http://...` (http のみ)。
- 期待: 開発環境では許可、本番 build (`import.meta.env.PROD`) では reject。
- 振る舞い: PROD で http URL を見たら failed、`本番環境で https 以外の indexer は許可されません`。
- 検証ポイント: `.env.example` の警告と整合。

### E-11: orchestrator の `errorMessage(err)` が SDK の error を再帰展開で読み出すか

- 入力: SDK が `Error('upload failed: TypeError: ...')` のようにネストした error を投げる。
- 期待: 再帰的に `cause` を辿って先頭の人間可読 message を抽出。
- 検証ポイント: `errorMessage` util が `err.cause.cause.message` まで掘る。Privacy / Secret leakage の URL redact もここで適用。

### E-12: SDK のロード失敗 (dynamic import 失敗)

- 入力: bundle 分割で SDK chunk が 404 (CDN 障害想定)。
- 期待: `await import('@0gfoundation/0g-ts-sdk')` の reject を catch、sha256 fallback。
- 振る舞い: `0G Storage モジュールの読み込みに失敗しました` 日本語表示。

### フォールバック境界の早見表

| ケース | sha256 fallback | throw | success |
|--------|-----------------|-------|---------|
| E-1 (DNS) | yes | — | — |
| E-2 (RPC 5xx) | yes | — | — |
| E-3 (signer 無効) | — | yes (orchestrator が catch して failed) | — |
| E-4 10MB | — | — | yes |
| E-4 100MB | yes (size pre-check) | — | — |
| E-5 (timeout) | yes | — | — |
| E-6 (DNS 別経路) | yes | — | — |
| E-7 (SDK error string) | yes | — | — |
| E-8 (prefix 欠落) | — (補正後 success) | — | yes |
| E-9 (不正 hash) | yes | — | — |
| E-10 (http in PROD) | yes | — | — |
| E-11 (error 展開) | yes | — | — |
| E-12 (chunk 404) | yes | — | — |

---

## iNFT metadata 連携の確認項目

仕様 24 行「`forge-onchain.ts` (iNFT mint flow) も新しい real CID を使うように調整、tokenURI metadata の `storageCID` が `0g://...` を含む」を実装に落とし込む際の境界。

### iNFT-1: real CID が tokenURI に正しく入るか

- 確認内容
  - mint 時に渡す tokenURI が `data:application/json;base64,...` または 0G CID 直リンクのいずれの形態でも、`storageCID` フィールドが `0g://0x{64hex}` 文字列であることを assert。
  - tokenURI を `publicClient.readContract({ functionName: 'tokenURI', args: [tokenId] })` で読み戻し、JSON.parse して `storageCID` を取得、フィールドが `0g://` で始まることを e2e で確認。
- 必須テスト
  - `forge-onchain.test.ts` に「mint 後に tokenURI を読み出して storageCID が `0g://0x...` 形式」を assert。
  - 既存 iNFT contract の `storageCID` 受け入れ型が `string` であることを ABI で確認 (仕様 143 行「文字列フィールドで既に格納可能」)。
- 境界
  - tokenURI の文字列上限 (一般的に on-chain string は gas で制限される、概ね 2KB 以下が安全)。`storageCID` 単体は 70 文字程度なので問題なし。

### iNFT-2: mint 失敗時に CID は破棄か / mint 成功 + CID 失敗の中間状態

- 状況
  - パターン A: 0G upload 失敗 (sha256 fallback) → mint で `storageCID = sha256://...` を渡す → 「intelligence/memory embedded」主張が cosmetic に降格。
  - パターン B: 0G upload 成功 (real CID 取得) → mint tx が user reject → CID は live のまま、iNFT は無し。
  - パターン C: 0G upload 成功 → mint 成功 → ENS text record write が user reject → 各 layer 状態がバラバラ。
- 期待挙動
  - パターン A: mint 自体は実行して OK だが、AgentDashboard 上で「`storageCID` が sha256 stub のため、judge には real demo として 0G explorer リンクが提示できません」を warning 表示。デモ動画の流し込みで cosmetic に倒れることを判定。
  - パターン B: 0G storage の rootHash は永続的に live (testnet 上の orphan 状態)。これは acceptable、cleanup は testnet 期限まで待つ。
  - パターン C: storage / iNFT は success、ENS のみ failed。前 QA の OnChain failed と同じ retry UI で対応。
- 必須テスト
  - 3 パターン全てで「storageProof / mintProof / ensProof の各 status が独立に決まる」を test で固定。
  - 部分成功状態が AgentDashboard に正しく表示されること。

### iNFT-3: 既存 iNFT contract が `storageCID` 文字列をそのまま受け取るかの境界

- 確認内容
  - 既存 contract の mint 関数シグネチャを ABI で確認、`storageCID: string` を受ける引数があるか。仕様書 143 行は「文字列フィールドで既に格納可能」と書くが、実際の引数名や位置を Developer agent が確認する。
  - 引数長制限の確認: solidity の `string` は length-prefix で gas 上限のみ制約。70 文字なら問題なし。
- 必須テスト
  - `forge-onchain.test.ts` に「mint 関数に `0g://0x...` の 70 文字 string を渡せる」を local fork test で確認。
- 境界
  - もし既存 contract の `storageCID` 引数が `bytes32` 固定長だった場合、`0g://` prefix を含む 70 文字は入らない。ABI 確認の最初に必ず check。**入らない場合は仕様書 143 行が誤り**で、re-deploy が必要 (本機能スコープ外)、デモは tokenURI metadata JSON 内の独自 field に逃がす。
  - tokenURI metadata JSON のスキーマが judge の期待 (ERC-7857 / iNFT 標準) に合致するか確認。`storageCID` という field 名が標準なのか独自命名なのかを確定し、独自なら docs に明記。

### iNFT-4: tokenURI metadata の他 field との整合

- 確認内容
  - 既存 metadata に `agent.safety.score` `agent.misalignment.detected` の値が含まれている場合、`storageCID` の指す JSON 内のスコアと矛盾しない。
  - matrix: tokenURI metadata に直接スコアを書く / `storageCID` 経由で参照する、の二重持ち時の整合 check。
- 必須テスト
  - `forge-onchain.test.ts` で「metadata.agent.safety.score === fetchedAttestation.score」を assert。
  - 矛盾検知時の挙動を確定 (warning か reject か)。

---

## a11y 観点

仕様 33 行「chain switch 中は `aria-live` で「0G Galileo に切り替え中」「Sepolia に戻し中」を音声読み上げ」を実装に落とし込む際の境界を以下で必須化する。

### a11y-Z1: chain switch 進行中の aria-live 文字列

- 要件
  - chain switch を開始した瞬間に `aria-live="polite"` の region に「0G Galileo に切り替え中です」を表示。switch 完了で「0G Galileo に切り替えました」に更新、upload 中は「0G Storage に保存中です」、Sepolia 戻し開始で「Sepolia に戻しています」、完了で「Sepolia に戻りました」。
  - `assertive` は使わない (連続更新で読み上げが詰まる、前 QA と整合)。
  - 文字列は日本語 30 文字以内、改行なし。
- 必須実装
  - `<output role="status" aria-live="polite" aria-atomic="true">` で chain status region を 1 つ作り、orchestrator の各 step で更新。
  - 状態遷移を示す `data-step="galileo-switch|upload|sepolia-switch|ens-write"` 属性を付け、e2e 検証で各遷移時の text content を assert。
- 受け入れ基準
  - macOS VoiceOver で game over → orchestrator 完了まで読み上げが順序通りに発生。
  - assertive を一箇所も使っていないことを grep で確認。

### a11y-Z2: rootHash の hover / focus アクセス

- 要件
  - SafetyAttestationPanel の PipelineDiagram で `0G STORAGE` ノードに rootHash を hover で表示する仕様 75 行に対し、hover だけでは a11y 的に不十分。focus / tab でも同じ tooltip が見える必要がある。
  - rootHash は 66 文字 (0x + 64hex) と長く、screen reader が文字単位で読むと 30 秒以上かかる。短縮表示 (例: `0x1234...abcd`) と「全文を表示」ボタンを併記する。
- 必須実装
  - tooltip コンポーネントを `Tooltip` プリミティブ (Radix UI 不採用なら自前) で実装、`onFocus` `onBlur` `onMouseEnter` `onMouseLeave` の 4 イベントで開閉。
  - rootHash の `<button aria-label="0G Storage rootHash 全文をコピー">` で copy-to-clipboard 動作。aria-label には先頭 12 文字 + 末尾 4 文字のみ含め、screen reader が長文を読まないようにする。
  - `<a href="https://storagescan-galileo.0g.ai/tx/{rootHash}">` (or 公式 explorer URL) を target=_blank rel=noopener で開く。aria-label は「0G Storage explorer で attestation JSON を開く」。
- 受け入れ基準
  - キーボードのみで Tab → rootHash button → Enter → tooltip 表示 → Escape で閉じる、の操作が可能。
  - VoiceOver で「0G Storage rootHash 全文をコピー」が読み上げられる (66 文字 hex 全文を読まない)。
  - axe-core で違反 0。

### a11y-Z3: chain switch reject の error 表示が live region で読み上げ

- 要件
  - user が wallet popup で reject した場合、failed 状態に倒れる。これを `aria-live="polite"` で読み上げる。
  - 文言例: `0G Galileo への切替がキャンセルされました。再試行してください`。
- 受け入れ基準
  - VoiceOver で reject 直後に上記文言が読み上げられる。

### a11y-Z4: 旧 chain id 残存時の error 文言

- 要件
  - もし `chains.ts` の修正漏れで旧 16601 で switchChain を呼んでしまった場合、wagmi が unknown chain で英語 stack trace を出すと a11y 的に最悪 (screen reader で英文スタックを読み上げ)。
  - これを catch して `0G Galileo への切替に失敗しました (chain id 構成エラー)` の日本語に置換。
- 必須実装
  - orchestrator の switchChain catch 節で error.name / message を見て翻訳テーブルで日本語化。

---

## Performance

仕様 31 行「既存 60fps を維持。0G upload は game-end の post-processing でのみ実行、メインゲームループに影響なし」を性能観点で具体化する。

### perf-Z1: SDK の merkleTree 計算が main thread を block する場合の対策

- 危険箇所
  - `Blob.merkleTree()` は SDK 内部で hash 計算を逐次実行する同期 (or async だが CPU bound) 処理。playLog が 1MB を超えると 100ms 以上 block する可能性が高い。10MB なら 1-2 秒 block で AgentDashboard 表示が止まる。
  - 仕様 31 行「post-processing で実行、ゲームループに影響なし」は game over 後の話なので 60fps gameplay 自体は守られるが、game over 直後の AgentDashboard 表示までの「待機画面」が block されると UX が壊れる。
- 要求
  - merkleTree 計算を Web Worker に逃がす。`packages/frontend/src/web3/zerog-worker.ts` を作り、`new Worker(new URL('./zerog-worker.ts', import.meta.url), { type: 'module' })` で起動。playLog JSON を postMessage、worker 内で SDK の merkleTree を呼び、rootHash を返す。
  - Web Worker 化が SDK の制約 (Blob/File API、ethers signer の transferability) で難しい場合、最低限 `await new Promise(r => setTimeout(r, 0))` で yield しながら段階的に実行する。
  - perf budget: AgentDashboard の `<h2>` が visible になるまで game over から **500ms 以内**。
- 必須テスト
  - performance.now() で merkleTree 開始から AgentDashboard render までを計測、500ms 超なら CI fail。
  - Chrome DevTools Performance trace で `Long Task` (50ms 以上) が orchestrator 区間に 1 回以下。

### perf-Z2: 60fps 維持 (gameplay 中)

- 危険箇所
  - dynamic import で SDK chunk のロードが gameplay 中に開始されると、ネットワーク I/O は別だが、bundler のコード evaluation が main thread を hijack する。
  - SDK の依存に `buffer` polyfill がある場合、import 時に global の Buffer shim を register するコストが gameplay 中に発生。
- 要求
  - SDK の dynamic import を game over の `useEffect` 内でのみ trigger。gameplay 中に prefetch しない。
  - prefetch したい場合は `<link rel="modulepreload" href="..." />` を idle 時に挿入。`requestIdleCallback` で。
- 必須テスト
  - Chrome DevTools Performance で 60s gameplay trace、frame drop < 1%、FPS が常時 58 以上。

### perf-Z3: re-render 抑制

- 危険箇所
  - orchestrator の進行で各 OnChainStep の status が更新されるたびに SafetyAttestationPanel 全体が re-render される。Pipeline diagram が複雑なので 5ms 程度の render コストが累積。
  - rootHash 表示用の tooltip が hover で開くたびに parent state を更新すると無関係な部分も re-render。
- 要求
  - PipelineDiagram のノード単位を `React.memo` で wrap、status props のみで re-render 判定。
  - tooltip state は local useState で持ち、parent state を触らない。
- 必須テスト
  - React DevTools Profiler で orchestrator 完了までの render 回数、各コンポーネント 5 回以下。

### perf-Z4: メモリリーク

- 危険箇所
  - Web Worker を game over のたびに新規作成して terminate しないと、ゲームを 5 回プレイしただけで Worker が 5 個残る。
  - dynamic import した SDK module は HMR 環境で重複ロードされる可能性。
- 要求
  - Worker は singleton として `useEffect` cleanup で terminate。
  - HMR 中の重複ロードは development only。production build で test 必要なし。
- 必須テスト
  - 10 回連続でゲーム開始 → game over → AgentDashboard 表示を繰り返し、Chrome DevTools Memory で heap が 5MB 以上増えないこと。

### perf-Z5: ENS / 0G の write による main thread block

- 前 QA の perf-4 と同等。本機能で増えた `JSON.stringify(playLog)` (canonical 化込み) は size O(N) で同期実行、10MB で 100ms オーダー。
- 要求
  - canonical stringify を Web Worker 内で実行 (perf-Z1 と統合)。
  - main thread に戻るのは rootHash と canonical bytes (transfer 可能な ArrayBuffer) のみ。

---

## 致命的所見トップ 4 (実装着地前に確定必須)

1. **chain id 16601 残存箇所の grep 漏れリスク** (Chain spoofing — 高)
   - 仕様 17 行で `16601 → 16602` を 3 ファイル (chains.ts / App.tsx / foundry.toml) に書くと記載があるが、wagmi config / test fixture / docs 内の参照が漏れる。比較側のリテラル `16601` が残ると、real put が毎回 sha256 fallback に倒れて demo が cosmetic になる silent degrade が発生する。
   - 対応: 単一 `CHAIN_IDS` const を `chains.ts` に置き、`git grep -n 16601` を `make before-commit` 前に手動実行する手順を Plan.md に記録。`safety-attestation.test.ts` で chain mismatch を 16601 / 16602 / 11155111 の 3 値で cover。

2. **第三者が user の playLog を sniff して先 put → 同 rootHash を別 wallet で claim する front-running** (前回 tokenId 級 critical)
   - 0G Storage は content-addressed で、同 JSON は同 rootHash を返す。攻撃者が他人の playLog (demo URL の `?seed=demo`、source map、dev console から読み出し) を取得すれば、同 JSON を自 wallet で先 put して同 rootHash を取得、自 ENS subname / iNFT に貼って「他人の playLog に裏打ちされた成果」を僭称できる。
   - 対応: ENS / iNFT に CID を渡す前に attestation JSON の `walletAddress` フィールドと `walletClient.account.address` の一致を assert、不一致なら abort。sessionStorage に「自セッションで put した CID」を保持して突合。`safety-attestation.test.ts` に「他者 rootHash で reject」テスト必須。

3. **SDK の merkleTree 計算が main thread を block** (Performance — 高)
   - `Blob.merkleTree()` は CPU bound 同期処理で、playLog 10MB で 1-2 秒 block。game over 直後に AgentDashboard 表示が止まり、demo 動画で「real upload 中の沈黙」が出て judge 体験を悪化させる。
   - 対応: Web Worker に逃がす。AgentDashboard 表示までの SLO を 500ms に固定し、Long Task が orchestrator 区間に 1 回以下を CI ゲート化。

4. **VITE_ZEROG_RPC / INDEXER の URL injection が ENS / UI に流出する経路** (Secret leakage — 中、ただし demo で誤公開時 critical)
   - VITE_* は client bundle に焼き込まれるため、auth 付き URL を入れると流出。さらに SDK の error メッセージに URL が含まれて UI / ENS text record 上に表示・書き込みされると永続的に公開記録される。
   - 対応: `errorMessage` util で URL を `[redacted]` に置換、`.env.example` に「VITE_ 接頭辞は public bundle に焼き込まれる」警告を日本語で追記、本番 build で http URL を reject。

---

## 実装後 QA 再実行チェックリスト

Developer の PR が land したら以下を再走:

- [ ] 本書の Security 6 軸 (chain spoofing / replay / front-running / privacy / secret leakage / bundle size) の追加要件 21 件以上が実装に反映されているかを diff で確認。
- [ ] `git grep -n 16601` がコメント / docs 以外でヒット 0 件。
- [ ] `zerog-storage.test.ts` に E-1 〜 E-12 の 12 ケースが揃い、全 green。
- [ ] `safety-attestation.test.ts` に CSR-1 〜 CSR-6 の 6 ケースが揃い、全 green。
- [ ] iNFT-1 〜 iNFT-4 の 4 項目が `forge-onchain.test.ts` で固定されている。
- [ ] a11y-Z1 〜 a11y-Z4 を Lighthouse / axe-core / VoiceOver で検証、結果を `docs/specs/2026-05-01-zerog-storage-real-qa-evidence/` に保存。
- [ ] perf-Z1 〜 perf-Z5 を Chrome DevTools Performance trace で計測、AgentDashboard 表示までの p95 が 500ms 以下、frame drop が 1% 未満。
- [ ] `make before-commit` 全 green、`bun scripts/architecture-harness.ts --staged --fail-on=error` 通過。
- [ ] main entry の gzip 後 bundle size が +150KB 以下、SDK chunk が initial load から除外されていることを Network tab で確認。
- [ ] critical 4 件が解消されたら verdict を `ship` に更新する。
