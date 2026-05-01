# 0G Storage SDK 実統合 — User Feedback (Persona Walkthroughs)

**対象仕様**: [`2026-05-01-zerog-storage-real.md`](./2026-05-01-zerog-storage-real.md)
**レビュー視点**: User-perspective reviewer (PM / Designer / Developer / QA とは別役割)
**日付**: 2026-05-01
**前回 UF レビュー**: [`2026-04-29-agent-safety-attestation-user-feedback.md`](./2026-04-29-agent-safety-attestation-user-feedback.md) (書式雛形)

本ドキュメントは、仕様書 / README / `BirthArcade.tsx` / `AgentDashboard.tsx` / `SafetyAttestationPanel.tsx` / `safety-attestation.ts` を 4 つのペルソナ視点で歩き直し、demo 提出直前に潰すべき UX 課題を抽出するためのものである。「実プレイ → game over → wallet popup × 5-6 回 → AgentDashboard で `0g://` 確認 → 0G storage explorer で JSON 検証 → sepolia.app.ens.domains で text record 検証」を 1 ループずつ通し、具体に書く。スコアは「現仕様どおり実装された場合」の暫定値。

仕様の orchestrator は `Sepolia → 0G Galileo (switch + putPlayLog + putAttestation) → Sepolia (switch + ensureSubnameAvailable + setSubnodeRecord + setText × 3)` の流れを取る。素朴に signTypedData / sendTransaction の単位で popup を数えると以下に分解できる。

1. (任意) 接続ウォレット起動の chain switch (Sepolia 確認)
2. 0G Galileo への switchChain
3. `putPlayLog` の indexer.upload (signer.signTransaction or sendTransaction)
4. `putAttestation` の indexer.upload (同上)
5. Sepolia への switchChain (戻し)
6. NameWrapper.setSubnodeRecord (subname 発行)
7. Resolver.setText (3 record 連続書き、wallet 設定によっては 1 popup or 3 popup)

合計で **少なくとも 5、場合によっては 7-8 個の popup** がプレイヤーの目の前に積まれる。これが今回の仕様の最大の UX リスク。

---

## Persona J — 0G Storage 賞審査員 (3 分動画 + live で intelligence/memory embedded を判定)

**プロフィール**: 0G Foundation のエコシステム担当。1 件 10-15 分。3 分 demo 動画 → live URL → contract addr → 0G storage explorer での実データ確認、の順で見る。「stub かどうか」「intelligence/memory が本当に on-chain に embedded されているか」「`0g://` URI が ENS と iNFT の両方から実際に引けるか」を判定する。Autonomous Agents / Swarms / iNFT の 3 サブトラックで、"cosmetic 統合 = 即落選" のラインを引いている。

### 動線シミュレーション

1. README の Quick verification 表を見る。仕様 78 行目で「0G storage explorer link 行追加」が予定されているが、現 README の 33 行目は「browser bundle stub today, real SDK is the next PR」と書かれたまま。**ここで「まだ stub では?」の疑念が立つ**。
2. live demo を踏み、`?seed=demo` で 60 秒プレイ。game over 直後、wallet popup が 5 連発で立ち上がる。
3. 1 個目 popup で "0G Galileo に切替えますか?" → 承認。
4. 2 個目 popup で "0G にトランザクションを送ります (putPlayLog)" → 承認。
5. 3 個目 popup で "0G にトランザクションを送ります (putAttestation)" → 承認。
6. 4 個目 popup で "Sepolia に切替えますか?" → 承認。
7. 5 個目 popup で "ENS Resolver setText" → 承認。
8. AgentDashboard の SafetyAttestationPanel に `0g://0xa1b2...` 形式の rootHash が表示される。
9. その rootHash を `https://storagescan-galileo.0g.ai/` (or 仕様 178 行で言う 0G storage explorer) に貼り付けて JSON 確認。
10. JSON に `score`, `encounters`, `playLogHash`, `walletAddress` が含まれていることを確認。

### 具体フィードバック

1. **README 33 行目の "browser bundle stub today, real SDK is the next PR" を、本仕様の merge と同時に書き換えないと、judge は live を踏む前に stub と思い込む**。仕様 78 行目は「Quick verification 表に 0G storage explorer link 行追加」としか書かれていないが、**33 行目の既存 stub 記述を「real SDK via `@0gfoundation/0g-ts-sdk`, root hash returned as `0g://{rootHash}` and pinned to ENS text record」に書き換える** ことを受け入れ基準に明記すべき。さもないと「README が stub と言っているのに live は real」という二重状態で judge を混乱させる。
2. **`0g://0xa1b2...` を見せられても judge が即座に検証手段を持てない**。仕様 178 行目は「rootHash を 0G storage explorer に貼り付け」だが、storage explorer の URL が README にも仕様にも書かれていない。**`https://storagescan-galileo.0g.ai/` (実 URL は 0G dev docs 確認) を README の Quick verification 表の "Where" 列に直接書く** か、AgentDashboard の rootHash 表示の隣に "0G storage explorer で開く" の外部リンクボタンを置く必要がある。仕様の Panel 改修は 75 行目「rootHash を hover で表示 (任意)」に留まっており、これでは judge が 1 分以内に検証できない。
3. **動画 1:00-1:30 の 30 秒で「Sepolia → 0G Galileo の切替 → upload (storage 行が pending → success に遷移、rootHash が表示される)」を全部映すのは尺が足りない**。実際は switchChain + putPlayLog + putAttestation で popup 3 個 + 各 3-10 秒の indexer.upload 待ちが入る。**3 個 popup の中身をテロップで一括説明する短縮台本** か、popup を「playLog と attestation を 1 回の upload にバンドルする (= JSON.stringify({playLog, attestation}) を 1 root hash に圧縮)」設計に変更して popup を減らすべき。仕様の `putPlayLog` と `putAttestation` を 2 つに分けている根拠が技術設計に書かれていないので、merge の余地がある。
4. **「intelligence/memory embedded」の主張が、JSON の中身を判定する側にとって弱い**。JSON は `score`, `encounters`, `playLogHash` の dump で、これは「memory log」であって「intelligence」ではない。仕様 152 行 (Prize Targets 表) の「iNFT メモリ embed 主張で順位押し上げ」は、JSON に **「この agent が次回 step を取るときの policy 重み」(= `policyVector`, `archetypeWeights`, `riskTolerance` のような派生値)** が embedded でないと成立しない。受け入れ基準に「playLog だけでなく derived agent policy も同 root hash 配下に含める」を追加し、`zerog-storage.ts` の payload に `agentPolicy` フィールドを足す。さもないと 0G iNFT 賞 (期待 score 2) は 1 まで落ちる。
5. **動画 2:30-3:00 (storage explorer で JSON 表示) の 30 秒で見せる JSON が、判定に必要な視覚情報を満たしていない**。30 秒で映す JSON のスクショに **「これは intelligence/memory: prompt_injection 3 件への耐性が embedded」** のテロップを重ねる演出指示が仕様に欠けている。仕様 178 行目「JSON が表示されて attestation の中身を確認」は表示するだけで、judge に意味を翻訳していない。動画台本に 1 行「テロップ: `agent.memory = encounters; agent.policy = score-derived weights`」を追加する。

### 受け入れ基準で「実は満たせていない」項目 (0G Judge 視点)

- 受け入れ基準 19 行目 (`putPlayLog` / `putAttestation` が `Indexer.upload` 呼び出し): **2 つに分けている技術根拠が不在**。bundle 化 (1 root hash) のほうが popup 削減と root hash 露出箇所の絞り込みに利く。受け入れ基準に「root hash の最終露出は 1 つ (= ENS text record と iNFT tokenURI で同じ value)」を追加すべき。
- 受け入れ基準 24 行目 (`forge-onchain.ts` の iNFT mint も real CID を流す、tokenURI metadata の `storageCID` が `0g://...`): **「intelligence/memory embedded」を判定するための JSON schema が未定**。`storageCID` が指す JSON の必須フィールド (`agentPolicy`, `encounters`, `score`, `walletAddress`, `version`) を schema として `packages/shared/src/safety.ts` に確定し、受け入れ基準に schema test を入れる必要。
- 受け入れ基準 27 行目 (live demo で実 root hash を AgentDashboard と sepolia.app.ens.domains の両方から確認可能): **0G storage explorer での確認動線が含まれていない**。「両方」を「3 箇所 (AgentDashboard / sepolia.app.ens.domains / storagescan-galileo.0g.ai)」に拡張する。
- Prize Targets 表 (仕様 151 行 0G Storage = 3): **stub fallback (`sha256://`) が残るのが受け入れ基準 21 行目に明記されている**。これは正しいフェイルセーフだが、judge の体感では「real put が動くデモを 1 回流したい」が prerequisite。受け入れ基準に「demo 動画では fallback 経路に落ちないことを確認 (= QA で 0G testnet ETH が wallet にあることを pre-check)」を追加すべき。

### README / landing page で更新が必要な箇所

- **README 33 行目**: 「0G Storage put call site (browser bundle stub today, real SDK is the next PR)」を **「0G Storage real put via `@0gfoundation/0g-ts-sdk`, root hash exposed as `0g://{hash}` URI in iNFT tokenURI and ENS text record. Failure falls back to `sha256://` stub.」** に書き換える。これがないと judge が live を踏まず終わる。
- **README 24-40 行 Quick verification**: 行を 1 つ追加。`What to check = "0G storage explorer で root hash の JSON を直接表示"`、`Where = "https://storagescan-galileo.0g.ai/tx/{rootHash} (rootHash は AgentDashboard の SafetyAttestationPanel から copy)"`。仕様 78 行目の「link 行追加」を具体化。
- **README 78-108 行 Architecture 図**: 0G ボックスの中身に "(real put via 0G SDK; root hash 露出 = ENS text record + iNFT tokenURI)" を 1 行注記。「0G Storage / Compute」のままだと cosmetic に見える。
- **README 200-211 行 Sponsor integrations 表**: 0G 行を **「Real `Indexer.upload` to 0G Galileo testnet (chain id 16602). Root hash propagated to iNFT tokenURI metadata (`storageCID = 0g://...`) and ENS text record (`agent.safety.attestation = 0g://...`). intelligence/memory embedded = encounters + agent policy weights, verifiable at storagescan-galileo.0g.ai」** に書き換え。`Where in the code` に `zerog-storage.ts` と `safety-attestation.ts` を併記。
- **README 269-275 行 Roadmap**: 「Real wallet integration」は既済として削除候補。「Real 0G Storage SDK integration」は本 PR で完了するので Roadmap に残さない。

### Score they'd give

- **5.5 / 10** (現仕様、popup 5 個積み + storage explorer link なし + intelligence/memory が単なる memory log)
- **8.5 / 10** (popup を 3 以下に集約 + storage explorer 直リンク + JSON に agentPolicy 同梱 + README 33 行修正)

---

## Persona K — iNFT 審査員 (minted iNFT の tokenURI metadata から real 0G CID を verify)

**プロフィール**: 0G Foundation の iNFT (ERC-7857-style) 担当。`tokenURI` を `eth_call` で読み、JSON metadata 中の `storageCID` を 0G storage explorer に貼って「mint された tokenId に対応する agent intelligence/memory が確かに 0G に embedded」かを 5 分で判定する。前提として `keccak(msg.sender, playLogHash)` の deterministic tokenId が griefing-resistant かも併せて見る。

### 動線シミュレーション

1. README から `contracts/src/AgentForgeINFT.sol` を開く (仕様変更なし、ERC-721 + tokenURI、deterministic id)。
2. live demo を踏み、60 秒プレイ → game over → 5 popup を承認。AgentDashboard の OnChainProof セクションで minted tokenId を確認。
3. 0G Galileo block explorer (chain id 16602) で `AgentForgeINFT` contract の `tokenURI(tokenId)` を `eth_call`。
4. 返ってきた `data:application/json;base64,...` を decode → JSON 中の `storageCID` フィールドを確認。
5. `storageCID = "0g://0xa1b2..."` の `0xa1b2...` 部分を `https://storagescan-galileo.0g.ai/` に貼る。
6. JSON が表示される → `score`, `encounters` を確認。
7. **判定**: tokenId と storageCID が同じ playLogHash に紐付いているか? 同じプレイで mint された別アカウントが griefing tokenId を取れていないか? storageCID は本当に live で読めるか?

### 具体フィードバック

1. **`forge-onchain.ts` の mint flow が「real CID を tokenURI に流す」と仕様 24 行目に書かれているだけで、現状 mint と attestation orchestrator が並列実行されていないか直列かが仕様で曖昧**。仕様 101-134 行の orchestrator は `safety-attestation.ts` の擬似コードで、mint 自体はその外。**mint flow が `attestation.storageProof.data.cid` を待ってから tokenURI を組み立てる直列依存** を仕様化すべき。さもないと「mint は走ったが tokenURI 中の `storageCID` が `pending` のまま」というレース条件が起きる。受け入れ基準に「`mintINFT` 呼び出しは `putAttestation` resolve 後に直列実行」を追加。
2. **tokenURI metadata の `storageCID` field が `0g://0xa1b2...` 形式で書かれることまでは決まっているが、JSON metadata の他フィールド (name, description, image) が変わるかが仕様で不明**。判定上は `storageCID` だけで足りるが、judge が tokenURI を decode した瞬間に「これが intelligence/memory を抱えた iNFT である」と一目で分かる **`description` フィールドにも `agent.safety.score = 82, encounters = 7, storageCID = 0g://...` を文字列で含めておく** べき。仕様の「修正ファイル」一覧に `forge-onchain.ts` はあるが、tokenURI builder の中身改修が含まれていない。
3. **冪等性 (受け入れ基準 35 行目「同じ playLog を 2 回 put しても deduplication が 0G 側で起きる」) が iNFT 側の deterministic tokenId と整合するかの確認が抜けている**。`tokenId = keccak(msg.sender, playLogHash)` で同じ wallet + 同じ playLog なら同じ tokenId。同じ playLog なら 0G の rootHash も同じ。**この 2 つの determinism が一致することは仕様にとって重要だが、テストケースに入っていない**。受け入れ基準 35 行目のテストに「同じ playLog を 2 回流して、tokenId と rootHash の両方が同じ」を追加すべき。
4. **0G Galileo の block explorer URL が README にも仕様にも書かれていない**。chain id 16602 は今回新たに修正されるので、judge は「16602 用の explorer はどこ?」を自力で探す必要がある。**README に `https://chainscan-galileo.0g.ai/` (実 URL は 0G dev docs 確認) を 0G iNFT contract addr 行と一緒に書く** ことを受け入れ基準に追加。仕様 17-18 行目で `chains.ts` と `foundry.toml` を修正するなら、その修正と同時に README の chain id 16601 表記も grep で全箇所書き換えるべき (現 README 32 行目に `id 16601` が居る)。
5. **iNFT 賞は score = 2 を狙っているが、receipt として「minted iNFT explorer link」が submission にない**. 仕様 152 行目「iNFT explorer link / minted token に rootHash 露出」が submission チェックに書かれているのに、`docs/specs/` または `README` に実 contract addr の link が無い。submission 直前に **`AgentForgeINFT` の Galileo deploy address + 1 つの sample minted tokenId** を README に追記する運用を仕様化する。これがないと judge が「mint されたものを見せて」と言ったときに live を踏むしかない。

### 受け入れ基準で「実は満たせていない」項目 (iNFT Judge 視点)

- 受け入れ基準 24 行目 (`forge-onchain.ts` の iNFT mint flow も real CID を tokenURI に流す): **mint と attestation の直列依存が未明文化**。受け入れ基準に「`mintINFT` は `putAttestation` の rootHash 解決後に呼ぶ (storageProof.data.cid を tokenURI builder に渡す)」を追加。
- 受け入れ基準 17 行目 (chain id 16601 → 16602): **README の 32 行目 "0G Galileo deploy script + chain config (id 16601)" の更新が抜けている**。受け入れ基準に「README 内の `16601` 全箇所を grep で 16602 に置換」を追加すべき。
- 受け入れ基準 35 行目 (冪等性: 同じ playLog を 2 回 put しても dedup): **iNFT 側の deterministic tokenId との整合テストが要件に含まれていない**。「同じ playLog → 同じ tokenId AND 同じ rootHash AND 同じ tokenURI metadata」を 1 つのテストで verify することを受け入れ基準に追加。
- Prize Targets 表 (仕様 152 行 0G iNFT = 2): **「iNFT explorer link / minted token に rootHash 露出」が submission チェックにあるが、submission 提出物に実装されていない**。submission 用の README に「Sample minted iNFT: `tokenURI()` 戻り値の base64 decode 結果は [...] で、`storageCID = 0g://0xabcd...` を含む。確認方法は [chainscan-galileo URL]」の節を追加することを受け入れ基準に明記。

### README / landing page で更新が必要な箇所

- **README 31 行目 (0G iNFT contract source)**: 行を **「0G iNFT contract source (ERC-721 + tokenURI, deterministic `keccak(msg.sender, playLogHash)`, `tokenURI` JSON includes `storageCID = 0g://{rootHash}` pointing at real 0G Galileo storage)」** に拡張。intelligence/memory embedded の主張が contract レイヤーで読めるようにする。
- **README 32 行目**: `id 16601` を `id 16602` に修正 (live RPC で確認済みの正しい値)。
- **README 24-40 行 Quick verification**: 行を 1 つ追加。`What to check = "Sample minted iNFT の tokenURI を eth_call し、JSON metadata の storageCID を 0G storage explorer で開いて intelligence/memory embedded を verify"`、`Where = "(submission 直前に確定) tokenId 0x..., contract 0x... (Galileo)"`。
- **README 200-211 行 Sponsor integrations 表**: 0G 行の `Where in the code` に `forge-onchain.ts` (mint flow と CID propagation) を併記。現状は `zerog-mint.ts` と `zerog-storage.ts` しか書かれていない。
- **新規 (任意): `docs/prizes/0g-self-mapping.md`**: 0G Storage / iNFT の 2 サブトラックそれぞれで「本仕様のどの実装行が rubric のどの項目を満たすか」を self-map した 1 ページを置くと、Persona J/K 両方の判定速度が上がる。前回 UF レビュー Persona Z で同様の提案 (`ens-self-mapping.md`) があったのと同じパターン。

### Score they'd give

- **6.0 / 10** (現仕様、tokenURI に CID は流れるが intelligence/memory の主張が弱く、mint と attestation の直列性も曖昧)
- **8.5 / 10** (mint 直列化 + tokenURI description にスコア文字列 + agentPolicy を JSON に同梱 + Sample minted iNFT を README に明記)

---

## Persona L — 一般プレイヤー (Sepolia ETH のみ保有、0G testnet ETH なし)

**プロフィール**: 30 代エンジニア。MetaMask に Sepolia ETH は faucet で 0.5 入っているが、0G Galileo testnet ETH は持っていない (そもそも faucet URL を知らない)。Twitter で「60 秒で AI agent」と聞いて踏んだ。仕様 12 行目「0G testnet ETH を持っていないプレイヤー」のフェイルセーフ経路の実体験を担当。

### 動線シミュレーション

1. live demo を踏む。LP → CLEARED FOR TAKEOFF → 60 秒プレイ → game over。
2. 1 個目 popup: "0G Galileo (chain id 16602) に切替えますか?" → 「えっ、Sepolia じゃない chain なの?」と一瞬戸惑うが承認 (好奇心)。
3. 2 個目 popup: "0G に putPlayLog トランザクションを送ります" → **承認するも、indexer.upload 内部の signTransaction で「insufficient funds」エラー**。MetaMask の error toast に "0G Galileo: insufficient funds for gas" 的英語メッセージ。
4. AgentDashboard の SafetyAttestationPanel に "0G Storage: ✗ FAIL — `insufficient funds`" 表示。仕様のフェイルセーフ (受け入れ基準 21 行目) で `sha256://{hex}` にフォールバック、storage proof の status は failed だが cid 値は sha256 で埋まる。
5. 続いて Sepolia への switchChain popup (3 個目)、ENS setSubnodeRecord popup (4 個目)、setText popup (5 個目)。これらは Sepolia ETH があるので通る。
6. AgentDashboard 完成。`agent.safety.attestation = sha256://abcd...` で ENS には書かれた。**だが UI 上「0G Storage: FAIL」が赤く表示** されたまま。プレイヤーは「自分の何が悪かった?」「直し方は?」「demo 動画と違うものを見ている自分は劣化体験?」と感じる。

### 具体フィードバック

1. **「0G testnet ETH 不足」のメッセージが MetaMask の生英語 toast 任せで、faucet 案内がどこにもない**。仕様 32 行目「failure 時のメッセージで private key やシークレットを露出しない」は守られるが、ユーザー視点では **「あなたには 0G Galileo testnet ETH がありません。https://faucet.0g.ai/ で 0.05 ETH を取得すると real on-chain credential が出来ます。今は sha256 フォールバックで動いています」** の 3 行マイクロコピーが SafetyAttestationPanel に必要。仕様 33 行目「失敗メッセージは日本語」はカバー範囲が「日本語」だけで、faucet 案内 / 直し方 / フォールバック説明の 3 点セットが定義されていない。
2. **fallback で sha://が出ているのに ENS には `sha256://` で書かれてしまうので、後で 0G ETH を入れてリトライしても ENS text record は古い sha256 のまま固定**。仕様 35 行目「同じ playLog を 2 回 put しても deduplication」は real put 同士の冪等性を語っているが、sha256 → 0g の昇格パスが定義されていない。**ユーザーが後から 0G testnet ETH を入手し、game over 画面の「再試行」ボタンを押すと、sha256 → 0g に書き換わる re-attestation flow** を仕様に追加すべき。これが無いと「最初に失敗した人は永久に sha256 のまま」になる。
3. **5-6 個 popup の中で「これは Sepolia ETH があれば必ず通る」「これは 0G Galileo ETH が無いと失敗する」がプレイヤーには区別できない**。各 popup の前に AgentDashboard 上で **「次の popup: ◇ 0G Galileo に切替 (0G testnet ETH 必要、無くてもフォールバックします)」「次の popup: ◇ Sepolia に setText (Sepolia ETH 必要)」のプリビュー行** を出すべき。仕様 33 行目「`aria-live` で chain switch 中をアナウンス」は switch 中の事後通知で、popup 前の事前ガイドではない。
4. **受け入れ基準 12 行目「real put が失敗してもローカル attestation 表示と ENS write は継続し体験が壊れない」は実装上は守られるが、UI 上「FAIL」が赤く出る限り、初心者は「壊れた」と感じる**。**Storage proof の status を「`failed` (赤)」と「`fallback_sha256` (黄、これは設計通りの degrade)」で区別**し、後者は「ローカル credential 発行成功 (sha256 mode)」と読めるラベルにする。仕様の `OnChainStep<StorageProof>` 型は status が `idle | pending | success | failed` の 4 値しかないので (AgentDashboard.tsx 33-38 行)、status を 5 値目 `degraded` に拡張するか、success の中に `mode: 'real' | 'sha256-fallback'` を併記する設計を仕様に追加すべき。
5. **「Sepolia ETH のみで体験が完結する」の事前告知が LP / game over 画面のいずれにも無い**。仕様の demo 動画は 0G Galileo ETH を持つ前提のため、LP には何も書かれていない。**LP の "What you get in 60 seconds" の Agent safety attestation 行に「Sepolia ETH があれば必ず credential が発行されます (0G Galileo ETH があれば storage backed の上位 credential になります)」の 1 行** を入れて、最初に告知してしまう方が「途中で諦める」を防げる。

### 受け入れ基準で「実は満たせていない」項目 (一般プレイヤー視点)

- 受け入れ基準 12 行目 (real put 失敗でも体験が壊れない): **「壊れない」を「赤 FAIL でない」まで強化する必要**。受け入れ基準に「sha256 フォールバック時は SafetyAttestationPanel で `degraded` status を黄色 + 説明文付きで表示、`failed` 赤は表示しない」を追加。
- 受け入れ基準 21 行目 (real put 失敗時 sha256 stub にフォールバック): **「ENS write は継続」だが、後から 0g に昇格するリトライ経路が無い**。受け入れ基準に「再試行ボタン or `?retryAttestation=1` クエリで sha256 → 0g に昇格できる」を追加すべき。これは Persona L の継続性を救う。
- 受け入れ基準 33 行目 (`aria-live` で chain switch 中をアナウンス): **アナウンスは事後通知で、popup 前のガイドが無い**。受け入れ基準に「各 chain switch popup の発火前に AgentDashboard 上で『次の popup の意味と必要 ETH』をプレビュー表示」を追加。
- 仕様 12 行目のユーザーストーリー (0G testnet ETH なしでも体験継続): **「faucet 案内」が受け入れ基準に存在しない**。受け入れ基準に「sha256 フォールバック発火時、UI 上に `https://faucet.0g.ai/` (実 URL は要確認) と再試行ボタンを表示」を追加。

### README / landing page で更新が必要な箇所

- **README 54-60 行 "What you get in 60 seconds"**: 「Agent safety attestation」項目に **「Sepolia ETH があれば必ず credential が発行されます。0G Galileo testnet ETH があれば storage-backed の `0g://` URI 付き上位 credential になります。faucet: https://faucet.0g.ai/」** を 1-2 行で追記。これにより一般プレイヤーが「自分の wallet 状態でどのレベルの credential まで取れるか」を pre-flight で理解できる。
- **README 64-78 行 How it plays**: 「After 60 seconds: stage clear. Your agent is born.」の下に **「ゲーム終了後、5 個ほどの wallet popup を順に承認してください。1 個目 = chain switch、2-3 個目 = 0G storage upload、4-5 個目 = Sepolia ENS 書き込み。0G ETH が無い場合は自動で sha256 フォールバックします」** の 1 段落を追加。これがないと「気付いたら popup 5 連発で何もわからん」になる。
- **README 117-126 行 Quick start**: 「Faucet links」の subsection を新設。Sepolia ETH faucet と 0G Galileo testnet ETH faucet の URL を 2 行で書く。これがあると「どの faucet をどの順で叩けば demo が完走するか」が 5 秒で分かる。
- **README 78-108 行 Architecture 図**: フォールバック経路を図に明記。「0G storage put → (失敗時) sha256 hash → ENS text record」の点線矢印を 1 本足す。

### Score they'd give

- **4.5 / 10** (現仕様、popup 5 連発、faucet 案内なし、赤 FAIL で「壊れた」と感じる)
- **7.5 / 10** (faucet マイクロコピー + degraded status + 再試行 + LP 事前告知)

---

## Persona M — 両 chain 保有プレイヤー (Sepolia + 0G Galileo の testnet ETH 両方持つ)

**プロフィール**: Web3 エンジニア。Sepolia ETH 0.5 + 0G Galileo testnet ETH 0.1 を保有 (ハッカソン参加目的で事前 faucet)。仕様 11 行目のユーザーストーリー本命。「5-6 popup を順に承認するだけでフローが完了したい」を実体験する。途中で reject したらどうなるかも検証する。

### 動線シミュレーション

1. live demo → 60 秒プレイ → game over。
2. 1 個目 popup: 0G Galileo に switchChain → 承認。
3. 2 個目 popup: putPlayLog の `Indexer.upload` の signTransaction → 承認 → 5 秒待ち。
4. 3 個目 popup: putAttestation の signTransaction → 承認 → 5 秒待ち。
5. 4 個目 popup: Sepolia に switchChain → 承認。
6. 5 個目 popup: NameWrapper.setSubnodeRecord → 承認。
7. 6 個目 popup: Resolver.setText (× 3 record、wallet 設定によっては 1 popup) → 承認。
8. AgentDashboard 完成。`0g://0xa1b2...` 表示、ENS リンク踏める。

または途中で reject:
- 4 個目 (Sepolia 戻し) で reject → storage は real CID 取得済みだが ENS write が `failed`。`agent.safety.attestation = 0g://...` は ENS に書かれない。
- 2 個目 (putPlayLog) で reject → 仕様 22 行目「friendly Japanese error で failed 状態に倒す」が走るが、その後の Sepolia 戻しと ENS write は **走るのか走らないのか仕様で曖昧**。

### 具体フィードバック

1. **popup 6 連発を成功裏に通すには、各 popup 間の indexer.upload 待ち (3-10 秒) で「次に何の popup が来るか」を AgentDashboard 上に予告するプログレス UI が必要**。現仕様 (受け入れ基準 33 行目) は `aria-live` 1 行のみ。**`Step 1/6: 0G Galileo に切替中` → `Step 2/6: putPlayLog を upload 中 (3-10 秒)` のような明示的ステッパー** を SafetyAttestationPanel に置くべき。仕様 75 行目で PipelineDiagram に rootHash hover を追加 (任意) と書かれているが、より重要なのは「現在 step / 全 step」のステッパー。
2. **途中 reject の挙動が仕様で曖昧**。例: 2 個目 popup (putPlayLog) を reject → storage は failed → 続けて Sepolia 戻し popup が走るのか、止まるのか? 仕様 102-134 行の擬似コードでは `try/catch` で個別に倒すが、**「storage が failed なら ENS は走るが、`agent.safety.attestation` の値が `pending` のまま書かれる」のが本当に意図か?** が読めない。受け入れ基準に「storage 失敗時の ENS write は (a) 走らせて `pending`、(b) 走らせて `sha256://` フォールバック値、(c) ENS も skip して `failed` のいずれを取るか」を明文化すべき。Persona L の sha256 フォールバック路と統合すれば (b) が自然。
3. **chain switch reject が wallet 側で `User rejected` エラーになるが、仕様 22 行目「friendly Japanese error」は wallet 側の error message を翻訳する layer の有無が不明**。`useSwitchChain` (wagmi) の error は `UserRejectedRequestError` のような英語エラーを返すので、**`safety-attestation.ts` 側で `err.code === 4001` (user reject) を検出し「キャンセルされました。再試行ボタンから続きを進められます」と日本語化** する error mapper が要る。受け入れ基準 22 行目に「user reject (code 4001) と insufficient funds と network error は別メッセージで表示」を追加。
4. **3 record の `setText` が wallet によって 1 popup or 3 popup に分岐する**。NameWrapper / Resolver の multicall を使うか別個に呼ぶかで popup 数が変わる。仕様 (修正ファイル) には `ens-register.ts` の改修が含まれていないが、現実装は 3 record を sequential に呼んでいる場合 popup が増える。**Resolver.multicall でバッチ化して setText popup を 1 個に固定**することを受け入れ基準に追加すべき。これで全体 popup を 5 → 4 に減らせる。
5. **Sepolia ETH 残高が ENS write 中に枯渇するエッジケースが扱われていない**。NameWrapper.setSubnodeRecord で gas を消費した後、Resolver.setText で残高不足になると ENS subname だけが出来て text records が空のまま残る。これは「subname-as-attestation-receipt」が cosmetic に倒れる致命傷。**両 write を 1 multicall でアトミックに実行** するか、setText 失敗時に subname だけ生まれた中途半端状態を「再試行」で詰められるよう仕様に明記。受け入れ基準に「ENS write は subname 発行 + text records を 1 トランザクションでアトミック (multicall) に実行」を追加。

### 受け入れ基準で「実は満たせていない」項目 (両 chain 保有プレイヤー視点)

- 受け入れ基準 22 行目 (chain switch は `useSwitchChain` で 1 度試行、失敗時は friendly Japanese error で failed): **「user reject」「insufficient funds」「network error」の区別が無い**。受け入れ基準に「失敗種別ごとに別メッセージ + 別 next-action ボタン (再試行 / faucet 案内 / wallet 確認)」を追加。
- 受け入れ基準 33 行目 (`aria-live` でアナウンス): **step ステッパーが無い**。受け入れ基準に「全 N step / 現在 step / 各 step の予測時間 (3-10 秒) を SafetyAttestationPanel に常時表示」を追加。
- 受け入れ基準 19, 22 行目 (storage put と chain switch): **途中 reject 後の挙動 (skip / fallback / 全停止) が決まっていない**。受け入れ基準に「途中 reject 時は `storageProof / ensProof` の status をそれぞれ確定させ、AgentDashboard に「再試行」ボタンを 1 つ出す。再試行は失敗 step だけを再実行する」を追加。
- 仕様 130 行目 (ENS setText の textRecords を 1 register 呼び出しに渡す): **`registerSubname` の内部実装が multicall か sequential かで popup 数が変わる**。受け入れ基準に「ENS write は multicall 1 popup でアトミック」を明記し、`ens-register.ts` の修正範囲を仕様の修正ファイル一覧に追加。
- 受け入れ基準 168 行目 (Front-running: Sepolia switch は upload Promise resolve 後でのみ): **race の方向は守られるが、user が途中 reject した場合の race**は別。受け入れ基準に「user reject で abort された場合、次 step は実行しない (= 直列で止める、並列ではない)」を明示。

### README / landing page で更新が必要な箇所

- **README 24-40 行 Quick verification**: 行を 1 つ追加。`What to check = "5-6 個 popup の一連を 60 秒以内に承認すると、AgentDashboard に 0g:// rootHash と ENS subname が両方表示される (両 chain ETH 保有時の最短経路)"`、`Where = "live demo URL + Persona M の動線説明"`。これがあると「最短どれくらいで通り抜けるか」の体感が judge にも伝わる。
- **README 78-108 行 Architecture 図**: 矢印に popup 数を併記。「Browser → 0G Galileo (popup × 3) → Sepolia (popup × 2 ENS) → AgentDashboard」のように popup 個数を明示する。これで判定者も実プレイヤーも「6 popup フローだ」を一目で受け止められる。
- **README 174-181 行 "Frontend wallet (in-app)"**: 末尾に **「Game over 時に 0G Galileo testnet (chain id 16602) と Sepolia の間を自動切替するため、両方の testnet ETH を保有していると最短経路 (約 60 秒、popup 5-6 個) で credential 発行が完了します。0G ETH が無い場合は sha256 フォールバックで Sepolia 側のみ書き込まれます」** を追加。
- **README 200-211 行 Sponsor integrations 表**: ENS 行に「`registerSubname` は NameWrapper.setSubnodeRecord + Resolver.setText × 3 を multicall でアトミック実行 (popup 1 個)」を 1 行注記。setText の popup 個数は judge / プレイヤー双方の体感を左右する。

### Score they'd give

- **6.5 / 10** (現仕様、6 popup を経路通りに承認すれば成功するが、reject や残高枯渇が曖昧、ステッパー無し)
- **8.5 / 10** (multicall で popup を 4-5 に集約 + ステッパー + reject 時の再試行 + 失敗種別別メッセージ)

---

## Top 6 Fixable UX Issues (優先度順)

### 1. popup 数の集約と事前ステッパー (Persona M / L 致命、Persona J 動画尺問題)

- `putPlayLog` と `putAttestation` を 1 つの bundle JSON に集約 → 0G upload popup を 2 → 1 に削減。
- ENS の `setSubnodeRecord` + `setText × 3` を multicall でアトミック化 → ENS popup を 4 → 1-2 に削減。
- 結果として全体 popup を 6 → 3-4 に集約。
- AgentDashboard 上に「Step N/M: 現在の処理 + 予測時間」のステッパーを常時表示。

### 2. README 33 行目の stub 記述書き換え (Persona J 致命)

- 現「browser bundle stub today, real SDK is the next PR」を本仕様 merge と同時に「real put via `@0gfoundation/0g-ts-sdk`」に書き換える。これがないと judge は live を踏まず終わる。
- 同時に README 32 行目の `id 16601` を `id 16602` に grep で全置換。

### 3. faucet 案内 + degraded status + 再試行 (Persona L 致命)

- SafetyAttestationPanel に「0G testnet ETH が必要です。https://faucet.0g.ai/ で取得 → 再試行」のマイクロコピー。
- `OnChainStep<StorageProof>` の status に `degraded` を加えるか、`success` の中に `mode: 'real' | 'sha256-fallback'` を持たせる。赤 FAIL は本当の異常時のみに限定。
- 「再試行」ボタンで sha256 → 0g 昇格パスを実装。

### 4. 0G storage explorer 直リンク + intelligence/memory 主張の強化 (Persona J / K)

- AgentDashboard の rootHash 表示の隣に「0G storage explorer で開く」外部リンク。
- 0G storage に upload する JSON に `agentPolicy` (encounters から派生する重み) を含めて intelligence/memory embedded の主張を厚くする。
- `docs/prizes/0g-self-mapping.md` を新設し、Storage / iNFT 2 サブトラックの rubric self-map を 1 ページで提供。

### 5. iNFT mint と attestation の直列依存明文化 + Sample minted iNFT 提示 (Persona K)

- `mintINFT` は `putAttestation` resolve 後に呼ぶことを受け入れ基準に明記。
- tokenURI builder で `description` フィールドにスコア文字列を含める。
- 同じ playLog → 同じ tokenId AND 同じ rootHash AND 同じ tokenURI metadata を 1 つのテストで verify。
- README に Sample minted iNFT (Galileo deploy address + tokenId + decode 結果) を追加。

### 6. 失敗種別ごとの error mapper + reject 時の再試行 UX (Persona M)

- `safety-attestation.ts` の error mapper で user reject (code 4001) / insufficient funds / network error / chain mismatch を別メッセージ化。
- 各失敗には別の next-action (再試行 / faucet 案内 / wallet 切替確認) ボタンを 1 つだけ提示。
- 途中 reject 時は失敗 step のみを再実行する partial retry を仕様化。

---

## 補足: 各ペルソナのスコア集計

| ペルソナ | 現仕様まま | Top 6 fix 後 | デルタ |
|----------|-----------|--------------|--------|
| J. 0G Storage 賞審査員 (3 分動画) | 5.5 | 8.5 | +3.0 |
| K. iNFT 審査員 (tokenURI 検証) | 6.0 | 8.5 | +2.5 |
| L. Sepolia ETH のみ保有プレイヤー | 4.5 | 7.5 | +3.0 |
| M. 両 chain 保有プレイヤー | 6.5 | 8.5 | +2.0 |

**最大 ROI は Persona L (一般プレイヤー) と Persona J (0G judge) の同率**。Persona L は現仕様まま 4.5 で「壊れた」と感じる体験を撒いてしまうため、demo 動画の脇でアクセスしてくる Twitter 流入層を取りこぼす。Persona J は README 33 行目の stub 記述 1 行と 0G storage explorer 直リンクの 2 つだけで live を踏ませ判定動線が一直線になる。Persona M の multicall 集約 + ステッパーは Developer agent タスクとして並列で潰せる。Persona K の Sample minted iNFT 提示は submission 直前の README 追記 1 段落で完結する。submission 直前の「あと 3 時間あったら何をやる?」の答えは **Top 6 のうち 1 / 2 / 3 を 3 時間で潰す**。残り (4/5/6) は QA / README PR と並行で取り組む。
