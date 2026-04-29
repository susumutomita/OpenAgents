# Agent 安全アテステーション (3 段重ね) QA レビュー

> 担当: QA / 対象仕様 [`2026-04-29-agent-safety-attestation.md`](./2026-04-29-agent-safety-attestation.md) / 対象ブランチ `feat/safety-tutorial`

## 判定 (3 行)

- HOLD — Developer agent が並列で実装中のため、本レビューは仕様書ベースの先回り QA。コードが land したら本書のテストマトリクスを再走させて verdict を更新する。
- 仕様レベルで致命的合意不足が 4 件ある (subname handle 衝突時の retry 挙動、score 式の monotonicity 保証、text record 上書きの race、wallet 切断時のスコア確定タイミング)。実装前に確定すること。
- 前回 Web3 Wiring の振り返り (`Plan.md`「振り返り」: tokenId に msg.sender を bind し忘れた件) と同レベルの griefing / replay 経路を仕様内に最低 1 件以上発見した。Developer に共有する。

---

## Security 4 軸レビュー

仕様 222-230 行の Security 表は最低限カバーされているが、本機能特有の攻撃面が薄い。前回の tokenId griefing バグ級の指摘を 4 軸 + 追加 1 軸で掘る。

### Replay

- この機能特有のリスク
  - `AgentSafetyAttestation` を 0G Storage に put した CID は content-addressed のため、同じ JSON は同じ CID を返す。攻撃者が他人の attestation JSON を入手すれば、自分の wallet で同 JSON を 0G Storage に再 put し、自分の subname の `agent.safety.attestation` text record にその CID を書ける。スコアの偽装そのものは subname owner = 自分なので「自分が高スコアを名乗る」だけだが、第三者が同 JSON を quote した場合に「同じ CID を 2 人が指している」誤情報が成立する。
  - `sessionId` は仕様で生成方式が未定義。`Date.now()` ベースだと簡単に予測可能で、replay 検証時に collision する。
- 仕様書の現状対策
  - 222 行の表は「subname のオーナー = msg.sender バインドで担保」とあるが、これは subname の write 権限の話で、attestation JSON 自体の origin を担保していない。
- 十分か / 追加要件
  - 不十分。`AgentSafetyAttestation` JSON に `walletAddress` フィールドが既にあるので、JSON を put する際に「`walletAddress` が現在の `walletClient.account.address` と一致する」を assert する。CID を ENS に書く前にもう一度 verify する。
  - `sessionId` は `crypto.randomUUID()` (16 byte) を使用すること。仕様書にこのレベルで明記する。
  - 受け入れ基準に「他人の attestation CID を自分の text record に書こうとした場合、UI が `walletAddress` mismatch を検出して reject する」を追加する。

### Griefing (前回 tokenId 級の指摘ポイント)

- この機能特有のリスク
  - **subname handle 衝突時の retry が別ユーザーの subname を上書きする経路** (本書最重要指摘)。仕様 21 行は `pilot{2 桁ランダム}` と書いており、衝突空間は 100 通りしかない。`pilot42.{parent}.eth` が既に他ユーザー A の subname として発行済の状態で、ユーザー B が同じ handle (pilot42) を引き当てて NameWrapper.setSubnodeRecord を呼ぶと、parent owner = demoer wallet なので「parent owner 権限で B の指定通りに subnode owner と resolver を上書き」してしまう。NameWrapper の `setSubnodeRecord` は既存 subnode に対する上書き動作なので、これは UI の出来不出来でなく ENS 仕様レベルで成立する。前回の tokenId griefing と完全に同じ構造 (handle が衝突空間に対して短すぎ、かつ parent owner が write 権限を握っている)。
  - 仕様 36 行の冪等性条項「同じ sessionId + handle + walletAddress で 2 回 attestation を発行しても、subname の text record が上書き更新されるだけで失敗しない」は、handle が衝突した場合の挙動を「上書き OK」と読める。ここを「他者が先取りした handle なら新 handle を引き直す」に明確化しないと事故る。
- 仕様書の現状対策
  - 226 行「handle は session 内ランダム (例: `pilot{2 桁}`) で衝突時は再生成」と一行ある。だが「衝突 = 第三者が既に保有」を検出する手順が書かれていない。
- 十分か / 追加要件
  - 不十分。以下を追加要件として実装側に渡す。
    1. handle 決定時に NameWrapper の `ownerOf(namehash(`{handle}.{parent}`))` を `publicClient.readContract` で先読みする。owner が `0x0` でなく、かつ自分の wallet 以外なら handle を再生成 (最大 5 回) する。
    2. 衝突空間を `pilot{2 桁}` (100) → `pilot{4 桁 hex}` (65,536) に拡張する。Designer / PM と要相談。
    3. NameWrapper.setSubnodeRecord 呼び出し直前に再度 ownerOf を確認する (TOCTOU を 1 回まで縮める。完全には防げないが UX 的にはこれで十分)。
    4. `safety-attestation.test.ts` に「他者保有の subname を上書きしようとしたら例外を投げる」ケースを必須にする。
  - 仕様書 222 行の表に「Griefing — handle pre-claim による上書き — pre-flight ownerOf チェック + 衝突時 retry + 4 桁 handle」を加筆する。

### Front-running

- この機能特有のリスク
  - parent owner の demoer wallet が常にゲーム終了瞬間に setSubnodeRecord + setText (×3) を順次撃つ。攻撃者が mempool を観察し、`agent.safety.score` の値を読んで「先に同じ handle を別 wallet で claim する」ことは parent owner 制限により不可。だが、`agent.misalignment.detected` の JSON 文字列をプリコンピュートして「ゲーム結果のネタバレ」を Twitter に流すような soft attack は可能。これは Web3 spec というより demo runner の世界観への影響なので priority は低い。
  - もう一つの front-running: 0G Storage への put (CID 取得) と ENS text record write を `Promise.allSettled` で並列起動した場合、ENS write が先に成功して CID が `null` のまま `agent.safety.attestation` に書かれるケースがあり得る。仕様 144 行は「attestation JSON を put → ENS text record にその CID/hash を書く順序で wiring する」と直列指定しているので OK だが、テストでこの順序を強制する必要がある。
- 仕様書の現状対策
  - 直列順序は記述あり。228 行で「resolver.setText の owner check は ENS 仕様で担保」。
- 十分か / 追加要件
  - 並列化されないことを保証するテストを `safety-attestation.test.ts` に必須化する (CID が undefined の段階で setText が呼ばれないことを spy で検証)。
  - mempool レベルの front-running は本機能の脅威モデルで対象外と仕様書に明記する。

### Chain spoofing

- この機能特有のリスク
  - 前回 (Web3 Wiring) と同じく、wagmi の `walletClient.chain` が Sepolia 以外 (例: 0G Galileo / mainnet / arbitrum sepolia) のときに ENS / 0G Storage の writeContract を撃つと、別 chain に書き込まれる事故がある。本機能は B 層 (ENS subname 発行) が Sepolia 固定、C 層 (0G Storage stub) は chain 非依存なので、危険なのは ENS。
  - 仕様 229 行「viem の `walletClient.chain` を Sepolia に固定、`switchChain` を強制」とあるが、switchChain の完了を `await` しないと race る。前回も同じ書き方で Developer が `await` を漏らした実績あり。
- 仕様書の現状対策
  - chain 固定の方針はある。だが switchChain の完了 await と、再確認 (useChainId で post-check) のステップが欠落。
- 十分か / 追加要件
  - 受け入れ基準に「ENS の write 直前に `useChainId() === sepolia.id` を assert し、不一致なら switchChain を await し、それでも一致しなければ failed 状態に遷移」を追加する。
  - 受け入れ基準に「ユーザーが現在 Sepolia 以外に接続している状態で game over した場合、AgentDashboard 上で `agent.safety.score` のローカル表示は出すが ENS 行は `chain mismatch — Sepolia に切り替えてください` と日本語表示」を追加する。
  - QA E2E に N-X として「Sepolia 以外で game over → ENS 行が日本語で chain mismatch を表示」を追加。

### 追加軸: Privacy / Off-chain integrity

- この機能特有のリスク
  - `agent.misalignment.detected` text record は JSON 文字列で「kind ごとの hit / pass カウント」を公開する。これ自体は PII ではないが、wallet address に紐づく行動指紋になる (どの kind を見落としやすいかの傾向が分かる)。本デモではゲームなので OK だが、prize 審査員が読む文書では「現状は cosmetic、将来 sealed inference に置き換える」と明記して脅威モデルの境界を出す。
  - もう一つ: `playLog` を 0G Storage に put しているが (既存)、本機能で攻撃者が攻撃用 playLog を構築 (`misalignment_kind` を任意に詰める) してそのまま attestation を発行できる。`MisalignmentEncounter[]` は Game runtime で生成されるべきで、攻撃者が手動で JSON を構築して `deriveSafetyAttestation` に渡す経路を spec 上で禁止する。orchestrator は `playLog` のみを入力として encounter を再構成すること、を仕様書に明記する。
- 仕様書の現状対策
  - 230 行 Privacy 行は「playLog は session ID + 入力イベントのみ、PII 含まない (現状維持)」のみ。
- 十分か / 追加要件
  - `safety-attestation.ts` orchestrator のシグネチャを「playLog only を受け取る」に固定し、外部から `encounters[]` を直接注入できない API にする。
  - `agent.misalignment.detected` の値が 1KB を超えないことを ENS write 前に assert する (仕様 33 行は値あたり 1KB 上限を書いているが unit test 必須)。

### Security 軸まとめ

| 軸 | 重大度 | 仕様の対策 | 追加要求 |
|----|--------|------------|----------|
| Replay | 中 | subname owner = msg.sender bind | sessionId は `crypto.randomUUID()`、attestation の `walletAddress` を put 直前に verify |
| Griefing | **高** (前回 tokenId 級) | handle 衝突時 regenerate の一行のみ | pre-flight `ownerOf` 確認、handle を 4 桁 hex に拡張、orchestrator test で他者保有 subname の上書きを reject |
| Front-running | 低 | 直列指定済 | CID 未取得状態で setText が呼ばれないことの test spy を必須化 |
| Chain spoofing | 中 | chain 固定の方針あり | switchChain await + post-check (`useChainId` 再確認) を受け入れ基準に明文化 |
| Privacy / Off-chain integrity | 低 | PII 除外のみ | orchestrator API を `playLog only` に固定、encounter 直接注入を不可にする |

---

## `computeSafetyScore` 境界値テスト要望

仕様 119-126 行で式が暫定 (`total = clamp(50 + clearTimeBonus(0..50) + missPenalty(-50..0), 0, 100)`)。実装フェーズで純関数 BDD で確定する前に、QA として以下のケースを `packages/shared/src/safety.test.ts` で必須化する。括弧内は期待 SafetyScoreBreakdown。

### B-1: 0 点ケース (全 shoot かつ全誤射)

- input shape

  ```ts
  {
    sessionId: "test-zero",
    durationMs: 60_000,
    finalScore: 0,
    events: [
      { kind: 'shoot', t: 1000, enemyId: 'e1', tradeoffLabel: 'shield', misalignment: 'prompt_injection' },
      { kind: 'shoot', t: 2000, enemyId: 'e2', tradeoffLabel: 'option',  misalignment: 'reward_hacking' },
      { kind: 'shoot', t: 3000, enemyId: 'e3', tradeoffLabel: 'laser',   misalignment: 'goal_misgen' },
      { kind: 'shoot', t: 4000, enemyId: 'e4', tradeoffLabel: 'missile', misalignment: 'sycophancy' },
      // ... 25 件全て shoot 扱いで誤射換算
    ]
  }
  ```

- 期待 SafetyScoreBreakdown
  - `clearTimeBonus = 0` (ペナルティで上限が下がる)
  - `missPenalty = -50` (clamp 下限)
  - `total = 0`

- 検証ポイント
  - missPenalty が `-50` を超えて `-100` に達しても total は 0 で clamp される (負値が出ない)。
  - `breakdown.total === total` の整合 (二重計算されない)。

### B-2: 50 点ケース (全 pass かつクリア)

- input shape: `events` 全件が `kind: 'pass'`、`durationMs: 60_000`。

  ```ts
  {
    sessionId: "test-half",
    durationMs: 60_000,
    finalScore: 0,
    events: Array.from({length: 20}, (_, i) => ({
      kind: 'pass', t: i * 3000, enemyId: `e${i}`, tradeoffLabel: 'shield',
      misalignment: 'prompt_injection',
    }))
  }
  ```

- 期待 SafetyScoreBreakdown
  - `clearTimeBonus = 0` (素通り、ボーナスの根拠なし)
  - `missPenalty = 0` (誤射でないため減点なし。ただし pass も miss として数えるなら別、要 spec 確定)
  - `total = 50` (ベース 50 がそのまま)

- 検証ポイント
  - 仕様 128 行「全部見送り → 50 付近」の条件を満たす。
  - 「pass を miss にカウントするかどうか」を spec が確定すること。本書では「pass はカウントしない」前提で書いた。していない場合は B-1 と区別がつかなくなる。

### B-3: 100 点ケース (ノーミス完走 + 全 misalignment shoot down)

- input shape

  ```ts
  {
    sessionId: "test-perfect",
    durationMs: 30_000,           // 早クリア
    finalScore: 9999,
    events: [
      { kind: 'shoot', t: 100, enemyId: 'e1', tradeoffLabel: 'shield',  misalignment: 'prompt_injection' },
      { kind: 'shoot', t: 200, enemyId: 'e2', tradeoffLabel: 'option',  misalignment: 'reward_hacking' },
      { kind: 'shoot', t: 300, enemyId: 'e3', tradeoffLabel: 'laser',   misalignment: 'goal_misgen' },
      { kind: 'shoot', t: 400, enemyId: 'e4', tradeoffLabel: 'missile', misalignment: 'sycophancy' },
      { kind: 'shoot', t: 500, enemyId: 'e5', tradeoffLabel: 'speed' },  // misalignment なし
    ]
  }
  ```

- 期待 SafetyScoreBreakdown
  - `clearTimeBonus = 50` (上限)
  - `missPenalty = 0`
  - `total = 100`

- 検証ポイント
  - 早クリア (30s) でも `clearTimeBonus` が 50 で clamp、それを超えない。
  - 最後のイベントは misalignment 未紐付 (`speed`) で、score 計算で `undefined` を NaN として扱わない。

### B-4: 負値混入リスク (敵対的 input)

- input shape

  ```ts
  {
    sessionId: "test-negative",
    durationMs: -5000,        // 不正な負の duration
    finalScore: -1,
    events: [
      { kind: 'shoot', t: -100, enemyId: 'evil', tradeoffLabel: 'shield', misalignment: 'prompt_injection' },
    ]
  }
  ```

- 期待 SafetyScoreBreakdown
  - `clearTimeBonus = 0` (clamp 下限)
  - `missPenalty = 0`
  - `total = 50` または defensive に `0` で reject (どちらかを spec 確定)

- 検証ポイント
  - 純関数が input を信用せず、`Math.max(0, durationMs)` 等の defensive guard を持つ。
  - throw しない (UI 側で attestation 表示が止まると C 層が破綻するため)。
  - もしくは throw する場合は orchestrator が catch して `failed` 状態に遷移する経路を担保。

### B-5: オーバーフロー (events 配列が膨大)

- input shape

  ```ts
  {
    sessionId: "test-overflow",
    durationMs: 60_000,
    finalScore: 0,
    events: Array.from({length: 100_000}, (_, i) => ({
      kind: 'shoot', t: i, enemyId: `e${i}`, tradeoffLabel: 'shield',
      misalignment: 'prompt_injection',
    }))
  }
  ```

- 期待 SafetyScoreBreakdown
  - `clearTimeBonus = 0`
  - `missPenalty = -50` (clamp 下限、`-200_000` にはならない)
  - `total = 0`

- 検証ポイント
  - 計算時間が 100ms 以下 (UI block しない目安)。`bun test` 内で `performance.now()` で計測。
  - メモリリークなし (大量 array の reduce で string concat していない等)。
  - clamp が正常に下限で止まる。

### B-6: empty playLog

- input shape

  ```ts
  { sessionId: "test-empty", durationMs: 0, finalScore: 0, events: [] }
  ```

- 期待 SafetyScoreBreakdown
  - `clearTimeBonus = 0`
  - `missPenalty = 0`
  - `total = 50` (ベースのみ)

- 検証ポイント
  - 空配列で reduce が initial value で止まる、NaN にならない。
  - 仕様 27 行「ウォレット未接続でも attestation までの計算とローカル表示は完了する」のため、ゲームを 1 度もプレイしていない状態でも `computeSafetyScore` が動くこと。

### B-7: 全 pass ケース (B-2 のサブケース、misalignment 種類分散)

- input shape: 4 種 misalignment それぞれ 1 件ずつ pass。
- 期待: `total = 50`、`encounters[].kind` が 4 種揃う。
- 検証ポイント: `agent.misalignment.detected` の JSON 化で全 kind が key に並ぶ (count が 0 の kind を含めるかは spec 確定要)。

### B-8: 全 shoot ケース (B-1 と異なり「全部撃ち落とした = 全 hit」を意図)

- ここで「shoot = 誤射」として扱うか「shoot = 撃ち落とし」として扱うかが仕様で曖昧。
- 仕様 19 行は「敵を倒した瞬間に misalignment kind カードが出る」とあり、shoot = 撃ち落とし、つまり misalignment を防御した側に読める。
- 一方 119 行のスコアコメントは「missPenalty = -2 per miss (誤射 + 取り逃しの合算)」とあり、shoot を miss として扱う読み方もできる。
- input shape: 全 shoot で全 misalignment 紐付。
- 期待 (Developer に確定要請): どちらの読みでも純関数の振る舞いを 1 つに固定すること。本書は「shoot = 撃ち落とし = 安全 (penalty なし)」「pass = 取り逃し = penalty あり」の解釈を推奨する (Agent 安全のメタファに合致)。
- 検証ポイント
  - 仕様書 119 行のコメントを Developer agent と Designer agent で確定し、test に一本化された解釈を固定する。
  - **これが定まらない限り、純関数のテストは書けない**。最優先で確定。

### B-9: shoot + pass 混在 (現実的ケース)

- input shape: 10 shoot + 5 pass、misalignment は均等に分散。
- 期待: total が 0 < total < 100 の範囲。具体値は B-8 の解釈確定後に算出。
- 検証ポイント
  - breakdown.clearTimeBonus + breakdown.missPenalty + 50 = breakdown.total (clamp 適用前) のセルフ整合。
  - clamp 適用後の total は仕様 79 行「0-100 にクリップ」の通りで、整数 (`number` だが `Number.isInteger(total)` を assert)。

---

## OnChain failed 状態のレビュー

仕様 38 行「各 OnChain ステップに idle / pending / success / failed の表示を持たせ、failed 時は短い理由を日本語で表示」を真に受けて、文字列レベルで以下を必須化する。Designer と擦り合わせ要。

### ENS subname 発行失敗時の表示文字列 (日本語)

- 失敗 sub-cause ごとに分岐:
  - parent name 未保有: `ENS 親ドメイン未保有のため subname を発行できません (.env.local の VITE_ENS_PARENT を確認)`
  - 他者が同 handle を先取り: `handle pilot42 は他のユーザーが取得済みです。再生成して再試行してください` + retry ボタン
  - chain mismatch: `Sepolia に切り替えてから再試行してください` + chain switch ボタン
  - user reject: `ウォレットで署名がキャンセルされました`
  - resolver setText 失敗 (subname 発行は成功した部分失敗): `subname は発行されましたが text record の書き込みに失敗しました` + 「text record だけ retry」ボタン
- 受け入れ基準
  - 各文字列が Toast / Panel 内で改行せず 1 行に収まる (日本語 40 文字以内目安)。
  - failed 状態でも `agent.safety.score` のローカル表示は止めない (仕様 27 行の精神)。
- E2E 検証
  - parent name を持たない wallet で game over → ENS 行に `ENS 親ドメイン未保有...` が表示される。
  - handle を意図的に既存 subname と衝突させる test fixture を `safety-attestation.test.ts` に置く。

### 0G Storage put 失敗時の表示文字列

- 失敗 sub-cause:
  - SDK の network error: `0G Storage への保存に失敗しました (ネットワーク)` + retry ボタン
  - SHA-256 stub のため実 storage 未統合: `0G Storage は現在 SHA-256 stub です (CID は hash プレフィックス sha256:// 形式)` を pending ではなく `info` 状態として表示 — 失敗ではないが審査員に明示する。
  - JSON が 0G の上限超: `attestation JSON が大きすぎます (XX KB)` + 縮約 retry
- 受け入れ基準
  - 0G が失敗でも ENS の text record は `agent.safety.attestation = sha256://{hex}` の fallback で書く。仕様 137 行「0G Storage stub 中は後者」がこの fallback を意味することを実装に明記。
  - `Promise.allSettled` で並列化されている場合でも、ENS write は 0G の resolve を待ってから走る (本書 Front-running 節で既述)。
- E2E 検証
  - `zerog-storage.ts` を一時的に `throw new Error('network')` させて、UI が 0G 行は failed、ENS 行は SHA-256 fallback で続行することを確認。

### ウォレット切断時の挙動 (UI が止まらないか)

- ケース 1: ゲーム開始時から wallet 未接続
  - 期待: handle はローカルで生成、HUD 上に `AGENT: pilot42.{parent}.eth (offline)` のように offline 表記。ENS 行と 0G 行は `idle — ウォレットを接続してください`。
  - score は計算され AgentDashboard で表示される。仕様 27 行を満たす。
- ケース 2: ゲーム途中で wallet 切断
  - 期待: ゲームプレイは継続 (Canvas 描画と event log は wallet 非依存)。game over 時に attestation の compute は走るが ENS / 0G は idle のまま。
  - 受け入れ基準に「ゲーム実行中の wallet 切断で frame drop しない」を追加。
- ケース 3: game over 後 (orchestrator 実行中) に wallet 切断
  - 期待: 進行中の tx は wagmi が abort (UserRejectedRequestError 相当)。UI は failed 状態で停止。retry ボタンが出る。
- 受け入れ基準
  - `useAccount().isConnected === false` の状態遷移を AgentDashboard が監視する。
  - 切断 → 再接続 → retry でフローが再開できる。
- E2E 検証
  - MetaMask の Disconnect を game over 直後に押す → UI が hung せず、3 秒以内に failed 表示。

### Chain 不一致 (Sepolia 以外接続) の検出

- 検出タイミング
  - ゲーム開始時 (handle pre-flight): 不一致なら HUD 上に `chain: SEPOLIA に切替えてください` 警告を表示。
  - game over 時 (orchestrator 起動直前): 不一致なら ENS 行を `chain mismatch — Sepolia に切り替えてください` の failed 状態に。
- chain switch の UX
  - `useSwitchChain` を使い、wallet がサポートしている場合は 1 クリックで switch。サポートしていない場合 (古い MetaMask 等) は手動切替ガイドを表示。
- 受け入れ基準
  - mainnet / 0G Galileo / Base Sepolia / Arbitrum Sepolia の 4 chain で繋いだ場合、それぞれ chain mismatch を検出して同一の日本語メッセージを表示。
  - switch を user reject した場合の文言も用意 (`Sepolia への切替がキャンセルされました`)。
- E2E 検証
  - `wagmi.config.ts` に登録されている chain を一つずつ切り替えて game over → ENS 行が常に failed 状態の chain mismatch メッセージ。

---

## a11y 違反 / 観点

仕様 35 行は「色だけでなくテキストラベルでも識別可能、記号 (◉ ◇ ▲ ☓) を併記する」と書いているが、これだけでは a11y を満たしきれない。以下を最低 1 件以上実装に反映する。

### a11y-1: 色のみ依存の禁止 (現状仕様で部分対応)

- リスク
  - `MisalignmentCard.color` が glyph と同じ意味を二重で運ぶ場合、色覚多様性ユーザーには glyph で識別できるが、色とテキストラベルが矛盾するなら混乱する。
- 要求
  - WCAG 2.1 1.4.1「色だけで意味を伝えない」を満たすため、テキストラベル (label / description) を必ず Toast / Panel に表示する。glyph はあくまで補助。
  - SafetyAttestationPanel の breakdown 棒グラフ (clearTimeBonus / missPenalty) は色 + 数値 + ラベル 3 重で表現する。色のみの bar は不可。

### a11y-2: aria-label 不足 (実装で発生する確度高)

- リスク
  - HUD 上 `AGENT: pilot42.{parent}.eth` がただの `<div>` になっていると screen reader は読み上げない / 意味づけがない。
  - SafetyAttestationPanel の ENS link / 0G CID が `<a>` の text content だけだと「リンク先が何か」が分からない (e.g., `0g://bafy...`)。
- 要求
  - HUD ラベルは `<output aria-live="polite" aria-label="エージェント識別子: pilot42.gradiusweb3.eth">` として live region 化する。
  - ENS link は `aria-label="Sepolia ENS resolver で pilot42.{parent}.eth の text record を確認"`、0G CID link は `aria-label="0G Storage で attestation JSON を確認 (CID: bafy...)"`、target=_blank に `rel="noopener noreferrer"` 必須。
  - MisalignmentToast の close ボタン (もしあれば) は `aria-label="misalignment カードを閉じる"`。

### a11y-3: focus order

- リスク
  - game over → AgentDashboard 表示時に focus がページ最上部に飛ぶと、screen reader ユーザーは「何が起きたか」を把握できない。
- 要求
  - game over 直後に `<h2>AGENT SAFETY ATTESTATION</h2>` に programmatic focus (`ref.current.focus()`、`tabIndex={-1}` 付きで)。
  - Tab 順は: Score 大表示 → Breakdown → Encounter list → ENS link → 0G CID link → Retry buttons (failed 状態時のみ) の順で意味的に並べる。
  - INSERT COIN ボタンを Dashboard 内に置く場合、最後の tab 位置に。

### a11y-4: コントラスト比

- リスク
  - シューティングゲームの背景は通常黒 (Canvas)。MisalignmentToast の文字色とのコントラストが WCAG AA (4.5:1) を満たさない可能性がある。
  - SafetyAttestationPanel の score 大表示が neon green on black だと色覚多様性 + AA 微妙ライン。
- 要求
  - すべてのテキストで WCAG AA 4.5:1 以上、score 大表示などの大型テキスト (24px+) は 3:1 以上を保証。
  - Designer agent と擦り合わせて palette を確定。Lighthouse / axe-core で検証して結果を `-design.md` に貼る。

### a11y-5: 動的更新を screen reader が取得できるか

- リスク
  - MisalignmentToast は 2 秒で消える dynamic content。`aria-live` がないと screen reader が読み上げない。
  - OnChain ステップの状態遷移 (idle → pending → success / failed) も同様。pending → success に変わった瞬間が読み上げられないと UX が片手落ち。
- 要求
  - MisalignmentToast に `role="status"` または `aria-live="polite"` を付ける。`assertive` は使わない (ゲーム中の連続 toast で読み上げが詰まる)。
  - SafetyAttestationPanel の各 step は `aria-live="polite"` の region で囲み、success 時に「ENS subname pilot42.{parent}.eth を発行しました」のように完全文で読み上げる (CID hex を全文読まれないようにラベルを別に出す)。
- E2E 検証
  - macOS VoiceOver で game over → toast → AgentDashboard まで通しで読み上げが破綻しないことを確認 (User feedback agent と分担可)。

---

## 60fps 維持 (性能観点)

仕様 33 行「既存 60fps を維持。misalignment toast は Canvas overlay で 2 秒、CPU 負荷の支配項にしない」を性能観点で具体化する。

### perf-1: CPU 負荷ホットスポット

- 危険箇所
  - `runtime.ts` で敵を倒す瞬間に misalignment kind を lookup する関数 (`CAPABILITY_TO_MISALIGNMENT[capability]`) を毎フレーム呼ぶ実装にしない。倒した瞬間のみ 1 回。
  - PlayLog event の `push` が毎フレーム走る場合、配列再 allocation のコストに注意 (既存通り。本機能では新規 misalignment payload で 1 byte 増えるだけなので影響軽微)。
  - score 計算は game over 時 1 回のみ、毎フレーム計算しない。
- 検証
  - `bun --filter @gradiusweb3/frontend test` 実行時に runtime.ts の hotpath を覆うテストで budget 計測。
  - Chrome DevTools Performance tab で 60s 録画、`scripting` time が 16ms / frame を超えない。仕様 17ms ではなく 16ms (60fps 厳格) で評価。

### perf-2: 不要 re-render

- 危険箇所
  - HUD 上の `AGENT: pilot42...` ラベル を BirthArcade 内 state で持つと、毎 tick の score / time 更新で再 render される。
  - SafetyAttestationPanel が AgentDashboard 内で state を持つと、orchestrator の各 step resolve のたびに全パネル再 render になる。
- 要求
  - handle ラベルは BirthArcade 直下の sibling として独立配置し、`React.memo` でラップ。`pilot42.{parent}.eth` は再 mount するまで不変なので props で固定。
  - SafetyAttestationPanel は ENS / 0G それぞれの state を sub component に分離し、片方の resolve で全体が再 render しないようにする。`useOnChainForge` (前回 Web3 Wiring の振り返り参照) と同パターンを採用する。
- 検証
  - React DevTools Profiler で game over → orchestrator 完了までの render 回数を計測、各コンポーネント 5 回以下を budget。

### perf-3: Canvas vs React overlay の判断 (Designer 確定要)

- 仕様 167 行「Canvas 内に描画でなく React overlay でも OK、実装は Designer agent が決める」とある。QA 視点では:
  - Canvas 描画 (rAF ループ内): GPU 利用、frame budget に直結。toast 数が多いと描画コストが増える。
  - React overlay (DOM): GPU 合成、CSS animation で楽に作れる。ただし主 Canvas が full screen のとき pointer-events / z-index の調整が必要。
- 推奨
  - **React overlay 採用を推奨**。理由: (a) 仕様 35 行の a11y 要件 (記号 + ラベル) を a11y ツリーに乗せられる、(b) アニメーションが CSS `transition` で書ける、(c) Canvas ループのフレーム budget に影響しない。
  - 採用条件: pointer-events: none を root に付け、ゲーム入力を阻害しない。
- 検証
  - 連続 5 体撃破 (toast 5 連発) で frame drop しないこと。Performance trace で `Recalculate Style` / `Layout` の支配率が 30% を超えないこと。

### perf-4: ENS / 0G write による main thread block

- 危険箇所
  - game over 直後に orchestrator が走る。`Promise.allSettled` 内の `await writeContract` は async なので main thread を block しないが、JSON stringify (attestation の hash 計算) は同期。100KB 以上の playLog で block する可能性。
- 要求
  - JSON stringify を `setTimeout(_, 0)` か `requestIdleCallback` で yield して、AgentDashboard 表示を即時にする。
  - 仕様 188 行と整合: `setBirth(stored)` を allSettled より前に呼んで Dashboard を即時表示。本機能の orchestrator も同パターンを踏襲。

### perf-5: メモリリーク

- 危険箇所
  - MisalignmentToast の 2 秒タイマーが unmount 時にクリアされないと、リプレイ時にタイマーが累積する。
  - SafetyAttestationPanel の event listener (chain change / account change) が unmount 時に detach されていない。
- 要求
  - `useEffect` の cleanup 関数で setTimeout / removeEventListener を必ず解除する。
  - test で `unmount → 再 mount → タイマー 1 個` を assert する。

---

## 致命的所見トップ 4 (実装着地前に確定必須)

1. **subname handle 衝突時の retry が他人の subname を上書きする経路** (Griefing — 前回 tokenId 級の指摘)
   - 仕様 21 行の `pilot{2 桁}` は衝突空間 100 で簡単に collision する。NameWrapper.setSubnodeRecord は parent owner 権限で既存 subnode を上書きできるため、UI の衝突 retry が「他者の発行済 subname を奪う」経路を作る。
   - 対応: pre-flight `ownerOf(namehash)` チェック、handle を 4 桁 hex に拡張、orchestrator test で他者保有 subname の上書きを reject。Developer / Designer 両方に共有。

2. **`computeSafetyScore` の shoot / pass 解釈が仕様で曖昧**
   - 仕様 19 行 (敵を倒した瞬間 = shoot を good) と 119 行のコメント (shoot を miss にカウントする読み方) が衝突。これが定まらないと純関数のテストが書けない。
   - 対応: 「shoot = 撃ち落とし = 安全」「pass = 取り逃し = penalty」の Agent 安全メタファに合わせた解釈を Developer / PM で確定し、仕様書の暫定式コメントを書き換える。

3. **chain spoofing の switchChain await 漏れ (前回再発リスク)**
   - 前回 Web3 Wiring で同じ漏れを起こしている (Plan.md 振り返り参照)。本機能でも仕様 229 行に await の明記がない。
   - 対応: 受け入れ基準に「ENS write 直前 `useChainId() === sepolia.id` を assert、switchChain を await、それでも不一致なら failed」を明文化。

4. **0G Storage put → ENS setText の直列保証が test で担保されていない**
   - 仕様 144 行で順序は明記されているが、`Promise.allSettled` 内で並列化されると CID = undefined の状態で setText が走る race がある。
   - 対応: `safety-attestation.test.ts` で「CID resolve 前に setText が呼ばれない」を spy で必須テスト化する。

---

## 実装後 QA 再実行チェックリスト

Developer の PR が land したら以下を再走:

- [ ] 本書の Security 4 軸 + Privacy 軸の追加要件 5 件が実装に反映されているかを diff で確認。
- [ ] `safety.test.ts` に B-1 ~ B-9 の 9 ケースが揃い、全 green。
- [ ] OnChain failed 状態の文字列 4 種 (ENS / 0G / disconnect / chain mismatch) が日本語で UI に出ることを E2E で確認。
- [ ] a11y-1 ~ a11y-5 を Lighthouse / axe-core / VoiceOver で検証、結果スクリーンショットを `docs/specs/2026-04-29-agent-safety-attestation-qa-evidence/` に保存。
- [ ] 60fps を Chrome DevTools Performance trace で 60 秒録画、frame drop が 1% 未満。
- [ ] `make before-commit` 全 green、`bun scripts/architecture-harness.ts --staged --fail-on=error` 通過。
- [ ] critical 4 件が解消されたら verdict を `ship` に更新する。
