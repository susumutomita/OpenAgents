# Agent 安全アテステーション (3 段重ね) — User Feedback (Persona Walkthroughs)

**対象仕様**: [`2026-04-29-agent-safety-attestation.md`](./2026-04-29-agent-safety-attestation.md)
**レビュー視点**: User-perspective reviewer (PM / Designer / Developer / QA とは別役割)
**日付**: 2026-04-29
**前回 UF レビュー**: [`2026-04-27-web3-wiring-user-feedback.md`](./2026-04-27-web3-wiring-user-feedback.md) (書式雛形)

本ドキュメントは、仕様書 / README / `BirthArcade.tsx` / `AgentDashboard.tsx` を 3 つのペルソナ視点で歩き直し、demo 提出直前に潰すべき UX 課題を抽出するためのものである。プレイ → 終了 → AgentDashboard → ENS 解決 (sepolia.app.ens.domains) までの一連の動線を 1 ループずつ通し、具体に書く。スコアは「現仕様どおり実装された場合」の暫定値。

---

## Persona X — Agent 安全に詳しくない一般プレイヤー

**プロフィール**: 30 代エンジニア。Web3 は MetaMask を 1 度入れた程度。AI 関連は ChatGPT を業務で使う程度で、「Agent 安全研究」「misalignment」「sycophancy」「reward hacking」は今回が初見。Twitter で「60 秒で AI agent 作れるレトロアーケード、しかも Agent 安全の用語が学べる」というポストを見て live URL を踏んだ。

### 動線シミュレーション

1. LP を開く → `▸ CLEARED FOR TAKEOFF` を押す。
2. ゲーム開始。HUD 上部に "AGENT: pilot42.gradiusweb3.eth" が出る。**「pilot42 って何?」と一瞬止まる**。が、ゲームの動きに気を取られてそのまま遊ぶ。
3. shield 持ちの敵を撃つ → 画面右下に "PROMPT INJECTION ◇ approve all 系の指示注入" のような toast が 2 秒だけ出る。**読みきれない**。次の敵がもう来ているので、目線を戻すと toast は消えている。
4. 60 秒経過 → game over → AgentDashboard へ自動スクロール。「AGENT SAFETY ATTESTATION」セクションの大見出しに "82 / 100" が出る。下に breakdown 棒グラフ。さらに下に misalignment encounter リスト。
5. 各 encounter 行のラベル (`prompt_injection` / `reward_hacking` / `goal_misgen` / `sycophancy`) を見る。**「英語のままだ。意味は分かったような気もするが、言える気はしない」**。
6. ENS リンクを押す → sepolia.app.ens.domains で `pilot42.gradiusweb3.eth` が開く。`agent.safety.score = "82"` は分かる。`agent.misalignment.detected = {"prompt_injection":3,"reward_hacking":1,"goal_misgen":2,"sycophancy":0}` は **JSON 文字列のままで読みにくい**。

### 具体フィードバック

1. **misalignment toast の 2 秒は短すぎる、初見ラベルの読了に最低 4 秒は要る**。仕様 19 行目「2 秒 toast」は経験者向けの数字。初見プレイヤー視点では `tAt` に紐付けて、ゲーム終了後に「あなたが遭遇した misalignment」一覧を再表示するセクションを必ず置くべき (= AgentDashboard の encounter リスト)。toast 自体の延長より、**事後参照可能性**の確保のほうが重要。
2. **ラベルが英 snake_case のまま AgentDashboard に並ぶのは記憶定着しない**。`prompt_injection` の隣に **「指示注入: approve all のような攻撃指示を鵜呑み」** のような 1 行日本語を併記すべき。仕様の `MisalignmentCard.description` (140 文字) と `example` を toast でしか使っていないが、AgentDashboard の encounter 行でも同じ description を「ホバーで全文・常時で先頭 30 文字」のように表示する仕様を追加。
3. **score 100 点満点の breakdown が直感で分からない**。仕様 122-124 行の式 `clearTimeBonus = clamp(50 - missCount * 2, 0, 50)` は内部式であって、UI 上は「早クリア +30 / 誤射ペナルティ -8 / ベース +50 = 72」のような **加減算の伝票形式** で見せないと、棒グラフだけでは「なぜこの点数か」が伝わらない。breakdown 棒グラフのラベルに `clearTimeBonus` ではなく **「早クリアボーナス」「誤射ペナルティ」「ベース」** の和文を載せる。
4. **HUD の "pilot42.gradiusweb3.eth" が説明なし**。プレイ中はゲームに集中するから問題ないが、game over 直後の AgentDashboard 冒頭に **「あなたの Agent はこの ENS 名で名乗っています。クリックすると ENS 解決ページが開きます」** の 1 行マイクロコピーが要る。仕様の受け入れ基準には「HUD 上部に表示」しかないが、UF 視点では「意味の説明」がないと cosmetic 扱いされる。
5. **ENS リンク先の JSON 文字列 `agent.misalignment.detected` が生 JSON のまま**。一般プレイヤーは sepolia.app.ens.domains で `{"prompt_injection":3,...}` を見ても何も感じない。AgentDashboard 側で **「ENS にこう書きました」プレビュー** を JSON ではなく表形式で先に見せ、「これと同じ内容が ENS に登録されています → 検証はこちら」とリンクする順にすると、ENS が「動的に書ける場所」と理解できる。

### 受け入れ基準で「実は満たせていない」項目 (User 視点)

- 受け入れ基準 19 行目 (敵撃破時の 2 秒 toast): **2 秒では初見ラベルを読みきれない**。「toast 表示 + game over 後 dashboard で再表示」を two-fold で両方満たさないと「学習」にはならない。仕様の表現を「toast (即時) + Dashboard (事後参照)」の両立に書き換える必要。
- 受け入れ基準 21 行目 (handle が "AGENT: pilot42.{parent}.eth" として表示): **「表示される」だけでは意味が立たない**。一般プレイヤーは pilot42 が何を意味するか分からないので、表示だけでなく **「この名前で名乗っています」のラベル** をセットで仕様に入れるべき。
- 受け入れ基準 26 行目 (AgentDashboard の SafetyAttestationPanel): **encounter 一覧の表示形式が未定**。「misalignment encounter 一覧」とだけ書かれていて、ラベルが英 snake_case のままになる懸念。**「日本語ラベル併記必須」を受け入れ基準に追加** すべき。
- 受け入れ基準 25 行目 (ENS text record `agent.misalignment.detected` が JSON 文字列): **「JSON 文字列で書く」とまでは決まっているが、UI 側でそれをどう見せるかが未規定**。User 視点では「JSON が ENS に書かれた」だけでは価値が伝わらず、UI 上に decode 済み表で先見せしないと cosmetic 寄りになる。

### README / landing page で更新が必要な箇所

- **README 52-58 行 "What you get in 60 seconds of play"**: 既存 4 項目に **「Agent safety attestation — 4 種の典型 misalignment にどう反応したかが 100 点満点でスコア化される」** を 1 行追加。これがないと「Agent 安全」が機能の主役だとプレイヤーに伝わらない。
- **README 78-108 行 Architecture 図**: 現状は Browser → forge → ENS / Gensyn / 0G / Uniswap で、misalignment / safety attestation がどこにも描かれていない。**`safety-attestation.ts` orchestrator を別ボックスで足す** か、ENS の隣に "(safety credential)" を注記する。
- **README 213-222 行 "Differentiation vs. traditional agent design"**: 「traditional approach は black box」と書いているが、Agent 安全の文脈では **「未知の misalignment が混入していても気付けない」** こそが black box の本質。1 行 "Agent safety: 一切可視化されない" 列を追加し、「Gr@diusWeb3: 4 種の misalignment が play 中に名前付きで現れ、attestation 化される」と対比させる。
- **README 64-73 行 How it plays**: 現状 「赤 = RISK」しか書いていない。ここに **「敵の capability ごとに misalignment 種別が紐付いていて、撃破するたびに教科書のカードが出る」** を 1 行入れないと、ゲームと Agent 安全のつながりが LP 段階で見えない。

### Score they'd give

- **5.5 / 10** (現仕様まま、ラベル英文・JSON 生表示・toast 2 秒)
- **8.0 / 10** (日本語ラベル併記 + dashboard で encounter 再表示 + breakdown を加減算伝票化 + LP に safety 列追加)

---

## Persona Y — ハッカソン審査員 (3 分動画でジャッジ)

**プロフィール**: ETHGlobal の generalist track 審査員。1 件 15 分。3 分 demo 動画 → live URL → README → contract addr → 賞ごとの該当箇所、の順で見る。今回の仕様は 3 段重ね (A: misalignment / B: ENS / C: attestation) を一度に見せる構造なので、**「3 段が個別ピースなのか、一本の線なのか」** を 3 分で判定する。

### 動線シミュレーション (3 分動画ベース)

仕様 233-239 行のタイムコード:

- 0:00-0:15 — landing page、Agent 安全 default のメタファ説明
- 0:15-1:05 — 50 秒ゲームプレイ、misalignment カードが出る (A 層)
- 1:05-1:20 — HUD 上の "AGENT: pilot42.{parent}.eth" 強調 (B 層)
- 1:20-2:30 — game over → AgentDashboard 安全スコア → breakdown → encounter → ENS / 0G CID リンク (C 層)
- 2:30-3:00 — sepolia.app.ens.domains で text record 解決

審査員はこの 3 分で **「A → B → C が一本の line で繋がっているか」** を判定する。

### 具体フィードバック

1. **0:15-1:05 (50 秒) の中で 4 種 misalignment 全部に遭遇できる保証がない**。仕様 102-108 行の capability マッピングは shield/option/laser/missile の 4 つに紐付くが、speed のみの敵が連続で来る seed だと misalignment が一切表示されない 50 秒もあり得る。**demo 動画用に「4 種すべて出る seed」を `?seed=demo` クエリで強制できる仕様** を追加すべき。さもないと審査員が見る個体で A 層が空振りする。
2. **3 段の橋渡しが UI 上に明示されていない**。仕様の AgentDashboard SafetyAttestationPanel は score / breakdown / encounter / ENS link / 0G CID を「並べる」だけ。審査員は「これとあれが繋がっている」を 3 分で読み取れない。**「play log → safety score → 0G に保存 → ENS に hash で参照」を 1 本の矢印図 (Mermaid 風) で Panel 内に置く** べき。仕様のファイル構成 174-194 行に `SafetyAttestationPipelineDiagram.tsx` のような視覚化コンポーネントが追加で要る。
3. **「これがなぜ Agent 安全と関係するのか」の橋渡しが LP / Dashboard どちらにも欠けている**。「敵を撃つ = misalignment を抑制」「敵を見送る = misalignment を許容」の対応が、現仕様 (capability ↔ misalignment 1:1 マッピング) では形式的に張られているだけで、UI 上に **「あなたは prompt_injection 持ちの敵を 3 体倒しました = 指示注入耐性ありの Agent として attest されています」** のような **意味の翻訳行** がない。SafetyAttestationPanel に encounter ごとの「あなたの行動 → Agent 性質」の 1 行翻訳を必ず置く。
4. **動画 1:05-1:20 で B 層を 15 秒だけ強調する設計が、demo 視聴者に「ENS subname は何のため?」を残したまま C 層に入る**。仕様 233-239 行は B 層の意味付け尺が短すぎる。**B 層の 15 秒で「この pilot42 という名前のもとに、後で安全 credential が紐付きます」と先出し** する音声 / テロップが要る。さもないと「pilot42 という名前が表示されている」だけで終わる。
5. **2:30-3:00 の sepolia.app.ens.domains 解決カットで、3 つの text record (`agent.safety.score` / `agent.safety.attestation` / `agent.misalignment.detected`) を全部映す尺が確保できていない**。30 秒で 3 record + 0G CID + JSON プレビューはタイト。**`agent.safety.score` を最大文字で映す → `agent.safety.attestation` の hash を 1 秒映す → `agent.misalignment.detected` の JSON プレビューを 5 秒** のように、record ごとの強調ショットを 30 秒台本に明文化すべき。

### 受け入れ基準で「実は満たせていない」項目 (Judge 視点)

- 受け入れ基準 26 行目 (AgentDashboard SafetyAttestationPanel): **「視覚化された 3 段の橋渡し」が要件に含まれていない**。現在の仕様は score / breakdown / encounter / ENS / 0G CID を「並べる」までしか規定していないので、判定基準として「A→B→C の連結を視覚化する」を追加するのが望ましい。
- 受け入れ基準 19 行目 (2 秒 toast): **demo 動画用に misalignment 4 種すべて確実に表示する仕組み** が受け入れ基準に入っていない。`?seed=demo` のような強制 seed 機構を受け入れ基準に追加し、QA で検証する。
- 受け入れ基準 22 行目 (subname を NameWrapper.setSubnodeRecord で発行): **動画で映る確率が 100% でない**。テストネット遅延で発行が 30 秒かかると 1:05-1:20 の B 層尺で「pending」のまま終わる懸念。**「ゲーム開始時に発行 → ゲーム中に確定」を 60 秒以内で完了する SLO** を受け入れ基準に追加する。
- Prize Targets 表 (仕様 209-218 行): **0G Storage = 3 と書いているが、SHA-256 stub のままだと審査員が「実 SDK 呼び出しゼロ」で 1 まで落とす可能性**。前回 UF レビュー 91 行目で同じ指摘がされており、今回も解消されていない。**「demo 動画では実 SDK でアップロード成功させる」を受け入れ基準に追加** すべき。

### README / landing page で更新が必要な箇所

- **README 24-40 行 "Quick verification for prize judges"**: 表に **「Agent safety attestation」行を追加**。What to check = "AgentDashboard `AGENT SAFETY ATTESTATION` section + sepolia.app.ens.domains text records"、Where = `packages/frontend/src/web3/safety-attestation.ts`, `packages/frontend/src/components/SafetyAttestationPanel.tsx`, `packages/shared/src/safety.ts`。これがないと判定動線が「0G/ENS/Uniswap の 3 行のみ」のまま、新機能が判定対象になっていない状態になる。
- **README 197-209 行 Sponsor integrations 表**: ENS 行を **「Auto-issued subname + verifiable safety credential text records (`agent.safety.score` / `agent.safety.attestation` / `agent.misalignment.detected`)」** に書き換える。前回 UF レビューで指摘された通り「現状の text records (`combat-power`, `archetype`, `design-hash`) のまま」だと新仕様と整合しない。`Where in the code` に `safety-attestation.ts` も追加。
- **README 266-272 行 Roadmap**: 「Agent safety attestation」を **shipped 側に書き出す**。ロードマップ未来形のままだと審査員が「未実装」と読む。
- **README 5 行 ヒーローキャッチ**: 現状 "Kill the tradeoffs. Play to design your AI agent." は良いが、Agent 安全との接続は読み取れない。**サブヘッダで "Each shot is a vote against a misalignment. The result is a verifiable on-chain agent safety credential." を 1 行足す** と、3 分動画 0:00-0:15 で読み上げる原稿になる。

### Score they'd give

- **6.0 / 10** (現仕様、3 段の橋渡し未視覚化、demo seed 未保証、SHA-256 stub のまま)
- **8.5 / 10** (Pipeline diagram 追加 + demo seed 強制 + 実 SDK アップロード + README Quick verification 行追加)

---

## Persona Z — ENS 賞審査員 (sepolia.app.ens.domains で text record 確認)

**プロフィール**: ENS 賞 (Identity / Creative の 2 トラック) を担当。30+ サブミッションを 30 秒〜2 分で「meaningful か cosmetic か」判定する。`docs/prizes/ens-*` に基づき、`subname × text records が functional credential として動作しているか` を見る。subname 発行だけ・hard-coded text records・Resolver から値が引けない、のどれかで cosmetic 判定に倒す。

### 動線シミュレーション (30 秒〜2 分)

1. README の `Quick verification` 表を見る。ENS 行から `packages/frontend/src/web3/ens-register.ts` に飛び、`setSubnodeRecord` + `setText` の実呼び出しコードを確認 (ここまで 30 秒)。
2. live demo を踏み、60 秒プレイ → AgentDashboard の SafetyAttestationPanel で `pilot42.gradiusweb3.eth` のリンクを発見。
3. リンクを踏む → sepolia.app.ens.domains の `pilot42.gradiusweb3.eth` のページを開く。**Records タブで `agent.safety.score` / `agent.safety.attestation` / `agent.misalignment.detected` の 3 件と、既存 `combat-power` / `archetype` / `design-hash` の 3 件、合計 6 件を確認**。
4. それぞれの値が「動的に書かれた credential」として読めるかを判定。score = 整数、attestation = `0g://{cid}` または `sha256://{hex}`、misalignment.detected = JSON 文字列。

### 具体フィードバック

1. **6 件の text records が同じ flat key 空間に並ぶと、新旧の関係性が見えない**。`combat-power` / `archetype` / `design-hash` (既存) と `agent.safety.*` / `agent.misalignment.*` (新規) は **意味の層が違う** が、Resolver 側では区別がない。**`agent.*` に prefix 統一する方針を decision として README + 仕様に明記** するか、既存 3 件も `agent.combat.power` / `agent.archetype` / `agent.design.hash` にリネームする。さもないと審査員は「ENS records がただの dump 場」に見える。
2. **`agent.safety.attestation` の値 schema が仕様で揺れている**。仕様 25 行目「CID もしくは hash」、136 行目「`0g://{cid}` もしくは `sha256://{hex}`」。**`{scheme}://{value}` の URI 形式に固定** することを受け入れ基準に明記。さもないと審査員が parser で読めない。スキーム判定で 0G Storage stub なのか実 SDK CID なのかも一目で分かる。
3. **subname `pilot42` がランダム生成 = 同じ wallet で 2 回プレイすると別 subname が生える**。仕様 21 行目「`pilot{2 桁ランダム}`」+ 36 行目「nonce ベース handle」。これは griefing 回避には正しいが、ENS 審査員視点では **「同じ Agent が安定した名前を持つ」** が credential の前提。`pilot42` が 1 回限りの使い捨てだと「name = identity」が成立しない。**「同じ wallet なら同じ subname を返す」 deterministic mode と nonce mode を切替可能にする** か、`pilot42` を 1 度発行したら sticky にする運用を仕様化すべき。
4. **functional な credential であることを示す「再現実験」が demo 側に用意されていない**。審査員は「ENS から読み出せるか」を自分で `viem` の `getEnsText` 等で叩きたい。README の Quick verification 表に **`bun scripts/verify-ens-credential.ts pilot42.gradiusweb3.eth` のような確認スクリプト** を 1 つ用意し、stdout で 3 record 全部を decode して見せる。これがあると 30 秒で「動く」判定になる。
5. **ENS 名と中身の credential の対応が AgentDashboard 上で一目で分からない**。SafetyAttestationPanel に `pilot42.gradiusweb3.eth` のリンクと、その下に書かれた 3 record の table を **「← この 3 件が上記 ENS 名に紐付いています」** と矢印で結ぶ視覚化が要る。仕様の Panel 設計には「ENS resolver link」しかない。

### 受け入れ基準で「実は満たせていない」項目 (ENS Judge 視点)

- 受け入れ基準 25 行目 (text record 3 件): **value schema 未固定**。`agent.safety.attestation` を `{scheme}://{value}` の URI 形式で書くことを受け入れ基準に明文化する必要。
- 受け入れ基準 22 行目 (subname を NameWrapper.setSubnodeRecord で発行): **同じ wallet で 2 回目以降の subname 戦略が未決**。「nonce ベース handle = 毎回別 subname」だと credential 安定性が損なわれる。「2 回目以降は既存 subname の text record を上書き更新」の運用を受け入れ基準に追加すべき。仕様 37 行目「冪等性: 同じ sessionId + handle + walletAddress で 2 回 attestation を発行しても、subname の text record が上書き更新される」と書かれているが、handle 自体がランダムだと `同じ handle` が 2 回目に発生する保証がない。**handle 決定論を walletAddress 由来にする** か、「初回発行で sticky、2 回目以降は同じ subname に上書き」の動作を明文化する。
- 受け入れ基準 26 行目 (AgentDashboard SafetyAttestationPanel): **「ENS 名 ↔ 3 record の対応視覚化」が要件に入っていない**。Panel 設計に「ENS resolver link」しかなく、credential の対応が読み取れない。
- Prize Targets 表 (仕様 217 行 ENS Creative = 3): **subname-as-attestation-receipt の発想は強い** が、3 record + JSON value のみでは「depth 評価」が読めない。**4 件目以降の record (例: `agent.safety.version` schema、`agent.safety.issued-at` ISO 8601、`agent.safety.encounters-count` 数値)** を増やして depth を厚くする方が ENS Creative で 3 を確定させやすい。

### README / landing page で更新が必要な箇所

- **README 24-40 行 Quick verification**: ENS 行を **「`pilot{nn}.gradiusweb3.eth` の text records を sepolia.app.ens.domains で確認 (`agent.safety.score` / `agent.safety.attestation` / `agent.misalignment.detected`)」** に拡張。verify スクリプト行 (`bun scripts/verify-ens-credential.ts <subname>`) を 1 行追加。
- **README 204 行 ENS 行 (Sponsor integrations 表)**: 現状 "(`combat-power`, `archetype`, `design-hash`)" のみ。これを **"(verifiable safety credential records: `agent.safety.score`, `agent.safety.attestation`, `agent.misalignment.detected`, plus legacy `combat-power` / `archetype` / `design-hash`)"** に書き換える。`Where in the code` に `safety-attestation.ts` を追加。
- **README 197 行 Sponsor integrations 見出しの直前**: **「ENS subnames are functional safety credentials, not cosmetic labels」** の 1 文サブヘッダを足す。これがないと flat key の records dump に見える。
- **README 78-108 行 Architecture 図**: ENS ボックスの中身に "(safety credential text records)" を 1 行注記。さもないと「ENS = handle 表示用」のままに見える。
- **新規ファイル / `docs/prizes/ens-self-mapping.md` 検討**: 前回 UF レビュー 105-106 行で「0G 単独 self-mapping」が推奨されたのと同様、ENS も `docs/prizes/` 配下に self-mapping を置くと top-tier 入賞に効く。本仕様の Prize Targets 表をベースに 1 ファイル化。

### Score they'd give

- **6.5 / 10** (現仕様、3 record 書き込みは動くが schema 揺れ + handle ランダム + 視覚化なし)
- **8.5 / 10** (URI schema 固定 + handle sticky 化 + verify スクリプト + Panel 上に ENS↔records の対応視覚化 + record 件数を 4 以上に拡張)

---

## Top 5 Fixable UX Issues (優先度順)

### 1. encounter ラベルに日本語併記 + dashboard で再表示 (Persona X 致命)

- 仕様の `MisalignmentCard.description` (140 文字) と `example` を toast 表示でしか使わない設計を改め、**AgentDashboard の encounter リストでも常時表示** する。
- 各 encounter 行を `[◇] prompt_injection 指示注入: approve all 系の指示注入 / 例: ...` のように 1 行で読めるレイアウトに。
- 受け入れ基準に「日本語ラベル併記」「事後参照可能性」を追加。

### 2. 3 段 (A→B→C) の橋渡し視覚化 (Persona Y 致命)

- SafetyAttestationPanel の中に **`SafetyAttestationPipelineDiagram`** を新設し、`play log → safety score (computed) → AgentSafetyAttestation JSON → 0G Storage put → ENS text record (CID)` を 1 本の矢印図に。
- 動画 1:20-2:30 (C 層メイン尺) でこの図を 5 秒映すだけで、3 段の連結が判定可能になる。
- 仕様のファイル構成にこのコンポーネントを追加。

### 3. ENS subname の sticky 化 + URI schema 固定 (Persona Z 致命)

- handle を `pilot{walletAddress.lower(0,2)}` のような **walletAddress 由来 deterministic** にし、初回発行で sticky、2 回目以降は同じ subname に text record を上書き。
- `agent.safety.attestation` の値を `{scheme}://{value}` URI 形式に固定 (`sha256://...` または `0g://...`)。
- 受け入れ基準にこの 2 点を明文化。

### 4. demo 用 seed と verify スクリプト (Persona Y + Z)

- `?seed=demo` クエリで「4 種 misalignment 全部出る + 適度な誤射 1 〜 2」が起きる固定 seed を実装。
- `scripts/verify-ens-credential.ts <subname>` を新設。`viem` で `getEnsText` を 3 keys 叩いて stdout に decode 表示。
- README の Quick verification にこの 2 つを行追加。

### 5. README / LP の Agent 安全文脈アップデート (3 ペルソナ共通)

- **README ヒーローサブヘッダ**に「Each shot is a vote against a misalignment. The result is a verifiable on-chain agent safety credential.」を追加。
- **What you get in 60 seconds** に「Agent safety attestation」項目を追加。
- **Sponsor integrations 表**の ENS 行を新 records に書き換え、`Where in the code` に `safety-attestation.ts` を追加。
- **Quick verification 表**に「Agent safety attestation」行と verify スクリプト行を追加。
- **Roadmap** から本機能を取り除く (= shipped 側へ)。

---

## 補足: 各ペルソナのスコア集計

| ペルソナ | 現仕様まま | 上記 Top 5 fix 後 | デルタ |
|----------|-----------|-------------------|--------|
| X. Agent 安全初見プレイヤー | 5.5 | 8.0 | +2.5 |
| Y. ハッカソン審査員 (3 分動画) | 6.0 | 8.5 | +2.5 |
| Z. ENS 賞審査員 | 6.5 | 8.5 | +2.0 |

**最大 ROI は Persona Y (3 分動画ジャッジ)**。3 段の橋渡し視覚化 + demo seed 強制の 2 つだけで判定動線が一直線になり、A/B/C すべてが「線で繋がっている」と読まれるようになる。次点で Persona X の日本語ラベル併記 (これは Designer agent タスクとして並列で潰せる)。Persona Z の sticky 化と URI schema 固定は Developer agent 側で純関数の振る舞いとして仕様確定するだけで実装は軽量。submission 直前の「あと 2 時間あったら何をやる?」の答えは **Top 5 のうち 1 / 2 / 3 を 2 時間で潰す**。残り (4/5) は QA / README PR と並行で取り組む。
