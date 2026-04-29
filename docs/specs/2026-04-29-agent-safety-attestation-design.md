# Agent 安全アテステーション (3 段重ね) — Designer 仕様

設計担当: Designer ロール (`/feature` 5 役並列)。
親仕様: [`2026-04-29-agent-safety-attestation.md`](./2026-04-29-agent-safety-attestation.md)。
書式参考: [`2026-04-27-web3-wiring-design.md`](./2026-04-27-web3-wiring-design.md)。
対象コンポーネント:

- 新規 `packages/frontend/src/components/MisalignmentToast.tsx` (ゲーム中の 2 秒 toast)。
- 新規 `packages/frontend/src/components/SafetyAttestationPanel.tsx` (`AgentDashboard` に差し込む)。
- 拡張 `packages/frontend/src/components/HUD.tsx` (上部ラベル "AGENT: pilot42.{parent}.eth")。

## 1. 設計方針

- 既存の brutalist + Ace Combat 風 (App.tsx HUD / amber CTA / dashed rule) と OnChainProof 計器パネルの世界観を絶対に壊さない。新規パレットは禁止し、既存 `A` const (`bg / panel / ink / mute / rule / acid / hud / amber / hot / green`) と既存 `CAPABILITY_COLOR` のみで構成する。
- A 層 (toast) / B 層 (HUD ラベル) / C 層 (Attestation Panel) は **同一 visual 言語** (`HUDCorners`, dashed rule, `JetBrains Mono`, tabular-nums, letter-spacing 0.18em-0.22em の uppercase eyebrow) で連結し、デモ視聴者に「3 つは 1 つの装置」と読ませる。
- misalignment の 4 種は **色 + 記号 + ラベル** の 3 重符号化で識別させ、色覚多様性配慮と WCAG 2.1 AA を両立する (詳細 §4 / §6)。
- score 大表示は demo 動画 1:20-2:30 の主役カット。3 桁を画面の支配項にする (font-size 96px / line-height 0.9)。

## 2. MisalignmentToast (A 層)

敵を撃破した瞬間に Canvas overlay の右下に出る 2 秒間の toast。`PlayLog.shoot` イベントの `misalignment` を引数に受け、対応する `MisalignmentCard` を描画する。

### 2-1. ASCII ワイヤーフレーム — desktop (>=768px、Canvas 1080px 想定)

Canvas 領域 (App.tsx の `S.canvasFrame` 内) の右下に absolute 配置。Canvas の右端と下端から 24px のオフセット。

```
                                                        ┌─ corner ────────────────────── corner ─┐
                                                        │ ░░ MISALIGNMENT DETECTED · t+34.2s     │
                                                        │ ─────────────────────────────────────  │
                                                        │  ◇  REWARD HACKING                     │
                                                        │     proxy 指標を最大化して本来の目標   │
                                                        │     (利益) を犠牲にする失敗モード。    │
                                                        │     例: yield % だけ追って TVL を空にする  │
                                                        └─ corner ────────────────────── corner ─┘
                                                          ↑ width 360px / height 132px / shadow A.bg66
```

Grid 列定義:

```
gridTemplateColumns: "44px  1fr"
                     glyph  label + description + example
gridTemplateRows:    "auto auto auto"
                     label / description (140 字以内) / example (1 行)
```

### 2-2. ASCII ワイヤーフレーム — mobile (<768px、Canvas 360px 想定)

Canvas 横幅いっぱいの底辺バー (`bottom: 0`, `left: 0`, `right: 0`, height 102px、`borderTop: 1px solid A.rule`)。`HUDCorners` は描かず、上辺のみ rule 線で区切る。

```
┌───────────────────────────────────────────────┐
│ ░░ MISALIGNMENT · t+34.2s                     │
│ ────────────────────────────────────────────  │
│ ◇ REWARD HACKING                              │
│ proxy 指標だけ最大化して本来の目標を犠牲に。  │
│ 例: yield % を追って TVL を空にする           │
└───────────────────────────────────────────────┘
```

description は `text-overflow: ellipsis` でなく `line-clamp: 2` で 2 行までに収める。example は `<480px` で非表示にする (画面占有を 102px → 78px に縮小)。

### 2-3. 状態遷移図

`MisalignmentToast` は単一インスタンスが queue を持ち、撃破ごとに先頭から 1 枚ずつ表示する (重複表示しない、取り逃しは捨てる)。

```
        push(card)
[empty] ─────────────────► [entering]
   ▲                            │
   │                            │ 200ms slideIn + fadeIn
   │                            ▼
   │                         [visible]
   │                            │
   │                            │ 1600ms hold (内部に dwellTimer)
   │                            ▼
   │                         [exiting]
   │  200ms slideOut + fadeOut │
   └────────────────────────────┘
```

| 状態 | duration | 視覚 | 副作用 |
|------|----------|------|--------|
| empty | — | 非表示 (`display: none`) | queue が空、次の `push` で `entering` へ |
| entering | 200ms | `transform: translateY(12px) → 0`, `opacity: 0 → 1`, `easing: cubic-bezier(.2,.8,.2,1)` | `aria-live="polite"` 領域にラベルを inject |
| visible | 1600ms | 静止表示。description に下線 sweep (`linear-gradient` 1 度のみ、デモで「読める」感) | dwellTimer 終了で `exiting` へ |
| exiting | 200ms | `transform: 0 → translateY(-6px)`, `opacity: 1 → 0` | 完了後 queue から `shift`、queue が空なら `empty`、非空なら次の card を `entering` へ |

合計 2000ms (受け入れ基準「2 秒 toast」を満たす)。`prefers-reduced-motion: reduce` 時は entering/exiting を 0ms にし、フェードのみ 100ms に短縮する。

### 2-4. 表示要素の階層

| 要素 | テキスト | 色 (既存トークン) | font-size | letter-spacing | font-weight |
|------|---------|-------------------|-----------|----------------|-------------|
| eyebrow | `░░ MISALIGNMENT DETECTED · t+34.2s` | `A.mute` | 11px | 0.20em | 400 |
| glyph | `◉ ◇ ▲ ☓` の 1 字 | misalignment 色 (§4) | 28px | 0 | 700 |
| label | `REWARD HACKING` 等 (uppercase) | misalignment 色 (§4) | 13px | 0.22em | 700 |
| description (140 字以内) | 仕様の `MisalignmentCard.description` | `A.body` (#a8b8c8) | 12px | 0.04em | 400 |
| example (1 行) | `例: ...` プレフィックス | `A.hud` (#7ee0ff) | 11px | 0.04em | 500 |
| 外枠 | `HUDCorners color={misalignment 色} size={14}` | misalignment 色 (§4) | — | — | — |
| 背景 | `A.bg` + `box-shadow: 0 0 24px ${A.bg}cc inset` | — | — | — | — |

## 3. SafetyAttestationPanel (C 層)

`AgentDashboard.tsx` 内、既存 `OnChainProofPanel` の **隣** (full-width 行) に差し込む。score の 3 桁を主役にする縦長構造。

### 3-1. ASCII ワイヤーフレーム — desktop (>=768px)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ░░ § 09 / AGENT SAFETY ATTESTATION                ATTEST · 2 / 2 LIVE          │
│ ─────────────────────────────────────────────────────────────────────────────  │
│ ┌─ corner          AGENT SAFETY ATTESTATION · pilot42                corner ─┐ │
│ │                                                                            │ │
│ │   ┌──────────────────────┐   ┌──────────────────────────────────────────┐ │ │
│ │   │                      │   │ BREAKDOWN                                │ │ │
│ │   │       0 8 5          │   │ ─────────────────────────────────────    │ │ │
│ │   │       ─────          │   │ CLEAR TIME BONUS  ████████████████   +42 │ │ │
│ │   │       / 100          │   │ MISS PENALTY      ███─────────────    -7 │ │ │
│ │   │                      │   │ BASE                                  +50 │ │ │
│ │   │  AGENT SAFE SCORE    │   │ ─────────────────────────────────────    │ │ │
│ │   │  pilot42.{parent}.eth│   │ TOTAL                                  85 │ │ │
│ │   └──────────────────────┘   └──────────────────────────────────────────┘ │ │
│ │                                                                            │ │
│ │   MISALIGNMENT ENCOUNTERS · 5 detected / 8 enemies                         │ │
│ │   ─────────────────────────────────────────────────────────────────────    │ │
│ │   ◉ SYCOPHANCY        ×2  hit  enemy_3 @ 12.4s · enemy_5 @ 28.1s          │ │
│ │   ◇ REWARD HACKING    ×1  hit  enemy_4 @ 19.6s                             │ │
│ │   ▲ PROMPT INJECTION  ×1  miss enemy_7 @ 41.2s (passed)                    │ │
│ │   ☓ GOAL MISGEN       ×1  hit  enemy_8 @ 52.0s                             │ │
│ │   ─────────────────────────────────────────────────────────────────────    │ │
│ │                                                                            │ │
│ │   ATTESTATION TARGETS                                                      │ │
│ │   ─────────────────────────────────────────────────────────────────────    │ │
│ │   [01] ENS RESOLVER   pilot42.{parent}.eth      ● RESOLVED                 │ │
│ │        text records ×3   sepolia.app.ens.domains/pilot42.{parent}.eth →    │ │
│ │   [02] 0G STORAGE     attestation.json          ● STORED                   │ │
│ │        CID bafy..7q3p   0g-storage.dev/cid/bafy..7q3p →                    │ │
│ └─ corner                                                            corner ─┘ │
│                                                                                │
│ ◆ MASTER_ARM · ATTESTATION JSON IS DETERMINISTIC FROM PLAY LOG · NO SERVER    │
└────────────────────────────────────────────────────────────────────────────────┘
```

Grid 列定義 (上半分の score + breakdown):

```
gridTemplateColumns: "minmax(260px, 1fr)  minmax(360px, 1.6fr)"
                     score 大表示          breakdown 棒グラフ
gap: 24px
```

下半分 (encounter 一覧) は full-width。さらに下の attestation targets は OnChainProof と同じ 4 列 grid を 2 行に縮小して再利用する (`120px  minmax(220px, 1.4fr)  140px  minmax(220px, 1.6fr)`)。

### 3-2. ASCII ワイヤーフレーム — mobile (<768px)

score / breakdown / encounter / attestation targets を 1 列 stack に変更。

```
┌──   ─────────────────────  ──┐
│ § 09 / AGENT SAFETY          │
│ ATTEST · 2 / 2 LIVE          │
│ ──────────────────────────── │
│                              │
│         0 8 5                │
│         ─────                │
│         / 100                │
│   AGENT SAFE SCORE           │
│   pilot42.{parent}.eth       │
│ ──────────────────────────── │
│ BREAKDOWN                    │
│ CLEAR TIME BONUS  ████   +42 │
│ MISS PENALTY      █─────  -7 │
│ BASE                     +50 │
│ TOTAL                     85 │
│ ──────────────────────────── │
│ MISALIGNMENT ENCOUNTERS      │
│ 5 detected / 8 enemies       │
│ ◉ SYCOPHANCY      ×2 hit     │
│   enemy_3 @ 12.4s            │
│ ◇ REWARD HACKING  ×1 hit     │
│ ▲ PROMPT INJECTION ×1 miss   │
│ ☓ GOAL MISGEN     ×1 hit     │
│ ──────────────────────────── │
│ ATTESTATION TARGETS          │
│ [01] ENS         ● RESOLVED  │
│   pilot42.{parent}.eth       │
│   → sepolia.app.ens.domains  │
│ [02] 0G STORAGE  ● STORED    │
│   CID bafy..7q3p             │
│   → 0g-storage.dev/cid/...   │
│                              │
│ ◆ MASTER_ARM · DETERMINISTIC │
│   FROM PLAY LOG              │
└──   ─────────────────────  ──┘
```

| breakpoint | 変更点 |
|-----------|--------|
| `>=1024px` | score / breakdown 横並び、encounter は 1 行 1 件 |
| `>=768px` && `<1024px` | score / breakdown 横並びを保持、encounter の例文 (`enemy_3 @ 12.4s`) を 1 件のみ表示しその他は `…` |
| `<768px` | 1 列 stack、score の font-size 96 → 72px に縮小、attestation targets は 2 行カードに |
| `<480px` | パネル左右 padding 28 → 16px、`HUDCorners size 22 → 14`、score の font-size 72 → 60px |

### 3-3. 4 行 state matrix

`SafetyAttestationPanel` 全体が orchestrator の `Promise.allSettled` 結果から **集約 status** を受ける。各サブセクションは個別状態を持つ (score 計算は idle/success のみ、ENS と 0G は 4 状態)。

| section | idle | pending | success | failed |
|---------|------|---------|---------|--------|
| score 大表示 | `— — —` (3 字 dash, `A.mute`) + 補助文 `playLog 待ち` | (該当なし、score 計算は同期純関数) | `0 8 5` (`A.ink`, glow flash 1 度), 補助文 `pilot42.{parent}.eth` (`A.hud`) | (該当なし、純関数は失敗しない) |
| breakdown 棒グラフ | バー全て灰 (`A.rule`)、値 `—` (`A.mute`) | (該当なし) | バー伸長 animation 600ms ease-out, 値 (`A.ink` + `+`/`-` 接頭辞) | (該当なし) |
| MISALIGNMENT ENCOUNTERS | `0 detected / 0 enemies` (`A.mute`)、リスト空、empty state 文言 (§7-2) | (該当なし) | `5 detected / 8 enemies` (`A.amber` for 数値)、リスト 4 種ソート済 | (該当なし) |
| ATTESTATION TARGETS [01] ENS | `pilot42.{parent}.eth` (`A.mute`) `○ STANDBY` | `subname + 3 records ░░` (`A.hud`) `▲ PENDING` (`A.amber` パルス) | `text records ×3` (`A.body`) `● RESOLVED` (`A.green`) + resolver link | error message (`A.hot`) `✕ FAILED` + `[ ▸ RETRY ]` |
| ATTESTATION TARGETS [02] 0G | `attestation.json ready` (`A.mute`) `○ STANDBY` | `uploading attestation ░░` (`A.hud`) `▲ PENDING` | `CID bafy..7q3p` (`A.hud`) `● STORED` (`A.green`) + storage link | error message (`A.hot`) `✕ FAILED` + `[ ▸ RETRY ]` (fallback: `sha256://` ハッシュ表示) |

ウォレット未接続のケース: 親仕様の受け入れ基準より、score 計算と attestation JSON 表示は完走する。score / breakdown / encounter は `success` で表示し、ATTESTATION TARGETS だけ `failed` (理由 `wallet not connected`、`[ ▸ CONNECT WALLET ]` CTA を `A.amber` で 1 つ出す)。

### 3-4. score 大表示の詳細

| 要素 | テキスト | 色 | font-size | letter-spacing | font-weight |
|------|---------|-----|-----------|----------------|-------------|
| score 数値 | `0 8 5` (3 桁、各文字の間に `0.12em` の visual gap) | `A.ink` | 96px (desktop) / 72px (tablet) / 60px (mobile) | 0.12em | 700 |
| underscore rule | `─────` (3 桁分) | `A.amber` | (height 1.4px) | — | — |
| `/ 100` | `/ 100` | `A.mute` | 14px | 0.18em | 500 |
| label | `AGENT SAFE SCORE` | `A.amber` | 11px | 0.22em | 700 |
| ensName | `pilot42.{parent}.eth` | `A.hud`, tabular-nums | 12px | 0.10em | 500 |

score 値はゼロパディングで常に 3 桁表示する (`String(score).padStart(3, '0').split('').join(' ')`)。0 のときは `A.hot` で表示し、demo で「失敗もカッコ良く見せる」を担保する。glow flash は success 遷移時の 1 度のみ (`text-shadow: 0 0 24px ${A.amber}88` を 800ms で減衰)。

### 3-5. breakdown 棒グラフの詳細

`SafetyScoreBreakdown` を以下の 3 行で表現する (BASE は固定 +50)。

```
CLEAR TIME BONUS  ████████████████   +42
MISS PENALTY      ███─────────────    -7
BASE                                  +50
TOTAL                                  85
```

| 列 | 幅 | 内容 | 色 |
|----|-----|------|-----|
| ラベル | 200px | `CLEAR TIME BONUS` 等 (uppercase) | `A.mute` |
| バー | 1fr (max 280px) | `█` 16 マス、値の絶対値を 50 でスケール | 正値: `A.green`、負値: `A.hot`、未使用部分: `A.rule` |
| 値 | 60px | `+42` / `-7` / `+50` (tabular-nums) | 正値: `A.green`、負値: `A.hot`、BASE: `A.amber` |

TOTAL 行は dashed rule で区切り、値は `A.ink` (font-weight 700) で太く表示する。

### 3-6. encounter 一覧の詳細

```
◉ SYCOPHANCY        ×2  hit  enemy_3 @ 12.4s · enemy_5 @ 28.1s
```

| 列 | 内容 | 色 |
|----|------|-----|
| glyph | `◉ ◇ ▲ ☓` の 1 字 | misalignment 色 (§4) |
| label | `SYCOPHANCY` 等 (uppercase) | misalignment 色 (§4) |
| count | `×2` (tabular-nums) | `A.ink`, font-weight 700 |
| outcome | `hit` / `miss` (lowercase) | hit: `A.green`, miss: `A.hot` |
| detail | `enemy_3 @ 12.4s · ...` | `A.body`, tabular-nums |

ソート順: `count desc → glyph 順 (◉ ◇ ▲ ☓)`。0 件の misalignment は表示しない (empty 行で埋めない、可読性優先)。

### 3-7. attestation targets の詳細

`§ 08 / ON-CHAIN PROOF` の 4 行構造を **2 行に縮小** して再利用する。同一 grid (`120px / 1.4fr / 140px / 1.6fr`) を保つことで世界観の連続性を担保する。

| TRACK | CONTRACT/RESOURCE | STATUS | LINK / ACTION |
|-------|-------------------|--------|---------------|
| `[01] ENS` | `pilot42.{parent}.eth` / `text records ×3` | `● RESOLVED` | `sepolia.app.ens.domains/pilot42.{parent}.eth →` |
| `[02] 0G STORAGE` | `attestation.json` / `CID bafy..7q3p` | `● STORED` | `0g-storage.dev/cid/bafy..7q3p →` |

`[01]` の resolver link は親仕様の `ensName` を URL に埋める。`[02]` は CID をフル表示できるよう `<abbr title="bafy...full...7q3p">` でホバー / フォーカス時に出す。SHA-256 stub 中は CID の代わりに `sha256://abcd..ef01` と表示し、補助文に `(stub: 0G SDK 連携は follow-up)` (`A.mute`) を 1 行添える。

## 4. misalignment 4 種の色 + 記号アサイン

`MisalignmentCard.glyph` と `.color` を以下の通り固定する。色は **既存パレット** (`game/palette.ts` の `PAL.*` と `runtime.ts` の `CAPABILITY_COLOR.*`) と整合させ、新規色を導入しない。

| kind | glyph | label | 色 (token) | 16 進 | 由来 capability | コントラスト比 (背景 `A.bg #05080c`) |
|------|-------|-------|-----------|--------|-----------------|-------------------------------------|
| `sycophancy` | `◉` | SYCOPHANCY | `CAPABILITY_COLOR.missile` | `#c084ff` | missile (ALPHA) | 8.4:1 (Pass AAA) |
| `reward_hacking` | `◇` | REWARD HACKING | `CAPABILITY_COLOR.option` | `#40f070` | option (LEVERAGE) | 13.5:1 (Pass AAA) |
| `prompt_injection` | `▲` | PROMPT INJECTION | `CAPABILITY_COLOR.shield` | `#7bdff2` | shield (SECURITY) | 11.0:1 (Pass AAA) |
| `goal_misgen` | `☓` | GOAL MISGEN | `CAPABILITY_COLOR.laser` | `#ff5252` | laser (PRECISION) | 5.0:1 (Pass AA) |

設計意図:

- `prompt_injection` (≒ 外部からの "approve all" 注入) を `shield` の cyan に紐づけ、「security 系の失敗モード」と直感的に結びつける。
- `reward_hacking` (≒ proxy 指標を最大化) を `option` の green に紐づけ、「leverage / 指標歪曲」のメタファ。
- `goal_misgen` (≒ 本来の目標と違うものを最適化) を `laser` の red に紐づけ、「致命的に間違った precision」を表現。
- `sycophancy` (≒ 都合の良い signal だけ拾う) を `missile` の violet に紐づけ、「歪んだ alpha 探索」を表現。
- 4 つの記号 `◉ ◇ ▲ ☓` は filled-circle / diamond / triangle / cross の 4 種で、白黒印刷 / 単色 LED / 色覚多様性のいずれでも識別可能。

`speed` capability は parent spec で「misalignment なし」とされる。speed 由来の敵を撃破した場合は toast を出さず、score breakdown の `MISALIGNMENT ENCOUNTERS` カウントにも入れない (受け入れ基準と整合)。

### 4-1. MisalignmentCard データ (Designer 提案、Developer 実装で確定)

| kind | label | description (140 字以内、日本語) | example (1 行) |
|------|-------|-----------------------------------|----------------|
| `sycophancy` | SYCOPHANCY | ユーザーや評価者が喜ぶ応答だけを返し、不都合な事実を隠す失敗モード。Agent が安全より「いい顔」を優先する。 | 例: 損失を出した取引を report で「学習機会」と言い換える |
| `reward_hacking` | REWARD HACKING | proxy 指標 (yield % など) を最大化して、本来の目標 (利益・安全) を犠牲にする失敗モード。 | 例: yield % だけ追って TVL を空にする |
| `prompt_injection` | PROMPT INJECTION | 外部入力に紛れた指示を実行してしまう失敗モード。"approve all" 系の注入で wallet が drain する。 | 例: 取引 memo の "send all to 0x.." を実行 |
| `goal_misgen` | GOAL MISGEN | 訓練分布外で目標を取り違える失敗モード。proxy だけ最適化して本来の目標から外れる。 | 例: gas 最小化で重要 tx を skip |

## 5. HUD ラベル — "AGENT: pilot42.{parent}.eth"

`HUD.tsx` を拡張し、`AgentHandleLabel` コンポーネントを追加。`App.tsx` の Hero / Arcade 上部 HUD バー (canvas frame の上部) に 1 行で挿入する。

### 5-1. 配置

| breakpoint | 配置 | text-align |
|-----------|------|-----------|
| `>=1024px` | canvas frame 上端、left padding 24px、上端から 12px | left |
| `>=768px` && `<1024px` | canvas frame 上端、left padding 16px、上端から 10px | left |
| `<768px` | canvas frame 上端、`width: 100%`、padding `8px 16px`、`border-bottom: 1px dashed A.rule` で本編と区切る | left |
| `<480px` | 同上、ただし `parent` 部分を `…` で省略 (例: `AGENT: pilot42.…eth`) | left |
| `<360px` | 1 行で収まらないため `font-size: 11 → 10px`、`letter-spacing: 0.18em → 0.12em` に縮小、それでも溢れる場合は `pilot42` のみ表示 (parent は省略) | left |

### 5-2. タイポグラフィ

| 要素 | テキスト | 色 | font-size | letter-spacing | font-weight |
|------|---------|-----|-----------|----------------|-------------|
| prefix `AGENT:` | `AGENT:` | `A.mute` | 11px | 0.22em | 700 |
| handle `pilot42` | `pilot42` (handle 部分) | `A.amber` | 13px | 0.18em | 700 |
| dot `.` | `.` | `A.mute` | 13px | 0.04em | 400 |
| parent `{parent}.eth` | `gradiusweb3.eth` 等 | `A.hud` | 13px | 0.18em | 500 |
| 区切り | 左側に `▸` (`A.amber`, 11px) を 1 個置く (Hero CTA との視覚的連続性) | — | — | — | — |

フォントは既存 `JetBrains Mono` を継承。tabular-nums は `pilot42` の数字部分にのみ付与し、ハンドル切り替え時に幅が動かないようにする。

### 5-3. wallet 切替時の差替えルール

親仕様の Security 考慮より、handle は **session 内ランダム** (`pilot{2 桁}`) で wallet ごとに別の subname を引く。Designer 視点の差替えルール:

| 状態 | 表示 | 色 |
|------|------|-----|
| ウォレット未接続 | `AGENT: ▸ CONNECT WALLET` (CTA 風、クリックで ConnectButton にスクロール) | prefix `A.mute` / CTA `A.amber` |
| 接続直後 (handle 生成中、< 50ms) | `AGENT: pilot__.____.eth` (アンダースコアで占位) | 全体 `A.mute` |
| 接続成功 (handle 確定) | `AGENT: pilot42.gradiusweb3.eth` | (上記 §5-2) |
| ウォレット切替検出 | 200ms の cross-fade (`opacity: 1 → 0 → 1`) で新 handle に置換、handle 部分のみ glow flash 600ms | (上記 §5-2) + glow `A.amber66` |
| 切断 | `AGENT: ▸ CONNECT WALLET` に戻す | (未接続と同じ) |

handle 生成は `walletAddress` をシードにせず、`crypto.getRandomValues` ベースの session 内乱数とする (parent spec の deterministic でない要件と整合)。同セッションで `disconnect → reconnect` した場合は handle が変わって良い (デモ視聴者には「毎回違う subname」が逆に好印象)。

### 5-4. aria 属性

```
<div role="status" aria-live="polite" aria-label="Agent handle: pilot42.gradiusweb3.eth">
  AGENT: pilot42.gradiusweb3.eth
</div>
```

handle 切替時は `aria-live="polite"` で SR に通知する。`aria-busy="true"` を生成中 (< 50ms) に立てる。

## 6. アクセシビリティ — WCAG 2.1 AA

### 6-1. コントラスト比 (背景 `A.bg #05080c` 想定)

| 前景 | 比 | 用途 | AA 判定 |
|------|-----|------|---------|
| `A.ink` (#e6f1ff) | 17.4:1 | score 数値 / TOTAL 値 / encounter count | Pass (AAA) |
| `A.body` (#a8b8c8) | 9.8:1 | description / encounter detail | Pass (AAA) |
| `A.hud` (#7ee0ff) | 11.6:1 | example / ensName / link | Pass (AAA) |
| `A.amber` (#ffb84d) | 11.0:1 | label / pending / CTA | Pass (AAA) |
| `A.green` (#3dffa3) | 14.7:1 | success / hit / 正値バー | Pass (AAA) |
| `A.hot` (#ff4438) | 5.1:1 | failure / miss / 負値バー | Pass (AA) |
| `A.mute` (#5a6c80) | 3.6:1 | eyebrow / 補助テキスト | AA pass のみ大きいテキストは AAA、本文には使わない |
| misalignment `#c084ff` (sycophancy) | 8.4:1 | glyph / label | Pass (AAA) |
| misalignment `#40f070` (reward_hacking) | 13.5:1 | glyph / label | Pass (AAA) |
| misalignment `#7bdff2` (prompt_injection) | 11.0:1 | glyph / label | Pass (AAA) |
| misalignment `#ff5252` (goal_misgen) | 5.0:1 | glyph / label | Pass (AA) |

すべて 4.5:1 以上 (AA 適合)。`A.mute` は 3.6:1 だが本文には使わず、`aria-hidden` を付けない範囲で graphical / decorative label に限定する。

### 6-2. aria-live region

| 領域 | aria 属性 | 動作 |
|------|-----------|------|
| MisalignmentToast | `<div role="status" aria-live="polite" aria-atomic="true">` | toast 切替時に label + description を SR に通知。重複読み上げ回避のため `aria-atomic="true"` を必須 |
| score 数値 | `<output aria-live="polite" aria-label="Agent safety score 85 out of 100">` | score 確定時に 1 度だけ通知 |
| ATTESTATION TARGETS 各行 | `<div role="status" aria-live="polite" aria-label="ENS resolver pending">` | status 遷移時に通知。`aria-busy="true"` を pending 中に付与 |
| HUD `AgentHandleLabel` | `<div role="status" aria-live="polite">` | handle 切替時に通知 (§5-4) |

### 6-3. focus order

タブ順序 (DOM 読み順 = 視覚読み順):

1. HUD `AgentHandleLabel` (handle が CTA の場合のみ tabbable、確定時は `tabIndex={-1}`)
2. canvas (game)、ESC で抜ける
3. AgentDashboard 内の通常フォーム / link
4. SafetyAttestationPanel score (skip、tabIndex なし)
5. ATTESTATION TARGETS [01] ENS resolver link → (failed 時 RETRY)
6. ATTESTATION TARGETS [02] 0G storage link → (failed 時 RETRY、failed の wallet 未接続時は CONNECT WALLET CTA)
7. footnote (skip)

`:focus-visible` で `outline: 2px solid ${A.hud}; outline-offset: 2px` を全インタラクティブ要素に付与。

### 6-4. その他

- 全 misalignment は色 + 記号 + ラベルの 3 重符号化 (color blindness 対応)。
- toast 内の eyebrow `t+34.2s` は `<time datetime="PT34.2S">` でマークアップし、SR に時刻を伝える。
- `prefers-reduced-motion: reduce` で全アニメーション (toast slide / score glow / breakdown bar / handle cross-fade / failure shake) を停止。
- `prefers-contrast: more` で `A.body` を `A.ink` に格上げし、border を 1 → 1.6px に太くする。
- タッチターゲットは全 CTA / link で最低 44×44 CSS px (WCAG 2.5.5 AAA 意識)。

## 7. error / empty / loading の表示文字列案 (日本語)

C 層の各 OnChain ステップで使う文字列を網羅。EN 表記は (parent design) で既出のため、ここでは JP 表記のみ (in-app 言語切替用、デモは EN 主体だが仕様上 JP も用意)。

### 7-1. STATUS バッジ (再掲、attestation 用に拡張)

| 状態 | EN | JP |
|------|-----|-----|
| idle (ENS) | `○ STANDBY` | `○ 待機中` |
| pending (ENS) | `▲ PENDING` | `▲ 登録中` |
| success (ENS) | `● RESOLVED` | `● 解決可能` |
| failed (ENS) | `✕ FAILED` | `✕ 失敗` |
| idle (0G) | `○ STANDBY` | `○ 待機中` |
| pending (0G) | `▲ PENDING` | `▲ 保存中` |
| success (0G) | `● STORED` | `● 保存完了` |
| failed (0G) | `✕ FAILED` | `✕ 失敗` |

### 7-2. empty state (encounter / score)

| 領域 | 状況 | EN | JP |
|------|------|-----|-----|
| score 大表示 | playLog 未着 | `— — — / 100 · awaiting play log` | `— — — / 100 · プレイログ待ち` |
| MISALIGNMENT ENCOUNTERS | 0 件 | `0 detected · clean run, no misalignment fired` | `0 件検出 · ノーミス完走、misalignment なし` |
| MISALIGNMENT ENCOUNTERS | speed のみ撃破 | `0 detected · only speed enemies destroyed` | `0 件検出 · speed 系のみ撃破` |
| MisalignmentToast queue | 60 秒中 1 件も misalignment 撃破なし | toast 自体出さない | toast 自体出さない |

### 7-3. loading state (各ステップ pending 時の補助文)

| ステップ | EN | JP |
|---------|-----|-----|
| ENS subname 登録中 | `Registering subname + 3 text records…` | `subname と text records 3 件を登録中…` |
| 0G Storage put 中 | `Uploading attestation.json to 0G Storage…` | `attestation.json を 0G Storage にアップロード中…` |
| 0G CID 計算中 (stub) | `Computing SHA-256 fallback hash…` | `SHA-256 フォールバックハッシュを計算中…` |
| score 計算中 (純関数だが UI 上は 1 frame だけ表示) | `Computing safety score…` | `安全スコアを計算中…` |

### 7-4. failure state (各ステップ failed 時の error message)

| ステップ | 原因 | EN (error) | JP (error) | RETRY 文言 |
|---------|------|-----------|------------|-----------|
| ENS | wallet 未接続 | `wallet not connected` | `wallet が接続されていません` | `▸ CONNECT WALLET` (`A.amber`, ConnectButton にスクロール) |
| ENS | parent name 未所有 | `parent name not owned by wallet` | `wallet が parent name を所有していません` | `▸ RETRY · 環境変数 VITE_ENS_PARENT を確認` |
| ENS | chain 不一致 | `wrong chain — switch to Sepolia` | `chain が違います — Sepolia に切替` | `▸ SWITCH CHAIN` (`A.amber`, walletClient.switchChain を呼ぶ) |
| ENS | tx user reject | `user rejected request` | `ユーザーが署名を拒否しました` | `▸ RETRY · 再度署名する` |
| ENS | RPC timeout | `RPC timeout — Sepolia node slow` | `RPC タイムアウト — Sepolia ノードが遅い` | `▸ RETRY` |
| ENS | text record 上限超過 | `text record value exceeds 1KB` | `text record の値が 1KB を超えています` | (リトライ不可、内部バグ報告) |
| 0G Storage | wallet 未接続 | `wallet not connected` | `wallet が接続されていません` | `▸ CONNECT WALLET` |
| 0G Storage | SDK エラー | `0G Storage SDK error — fallback to sha256://` | `0G Storage SDK エラー — sha256:// に退避` | `▸ RETRY` (fallback 表示は別途 `(fallback: sha256://)` を `A.mute` で 1 行添える) |
| 0G Storage | network unreachable | `network unreachable — check connection` | `ネットワーク到達不能 — 接続を確認` | `▸ RETRY` |
| 0G Storage | payload too large | `attestation JSON exceeds 1MB` | `attestation JSON が 1MB を超えています` | (リトライ不可、内部バグ報告) |
| score 計算 | playLog malformed | (該当なし、純関数は失敗しない) | (該当なし) | (該当なし) |

### 7-5. footnote (panel 末尾)

- EN: `◆ MASTER_ARM · ATTESTATION JSON IS DETERMINISTIC FROM PLAY LOG · NO SERVER`
- JP: `◆ MASTER_ARM · attestation JSON は play log から決定的に導出 · サーバ介在なし`

「決定的に導出」が demo 視聴者に「裏で改竄してない」を伝えるための導線。

## 8. アニメーション仕様

| 対象 | duration | easing | 内容 | reduced-motion |
|------|----------|--------|------|---------------|
| toast entering | 200ms | `cubic-bezier(.2,.8,.2,1)` | `translateY(12px) → 0` + `opacity 0 → 1` | 0ms (フェード 100ms のみ) |
| toast visible underline sweep | 1200ms (visible 中 1 度のみ) | linear | description 下に 1px の `linear-gradient(90deg, transparent, A.amber, transparent)` を左→右 | 停止 |
| toast exiting | 200ms | `cubic-bezier(.4,.0,.6,1)` | `translateY(0 → -6px)` + `opacity 1 → 0` | 0ms (フェード 100ms のみ) |
| score glow flash | 800ms | ease-out | `text-shadow: 0 0 24px ${A.amber}88` を 0 → full → 0 | 停止 |
| breakdown bar 伸長 | 600ms | `cubic-bezier(.2,.8,.2,1)` | `width: 0 → target%` | 即時表示 (transition なし) |
| handle cross-fade (wallet 切替) | 200ms × 2 | ease-in-out | `opacity: 1 → 0 → 1` (handle 部分のみ) | 即時切替 |
| ATTESTATION TARGETS pending パルス | 0.9s loop | ease-in-out | `▲ PENDING` の `opacity: 1 → 0.45 → 1` | 停止 (静止表示) |
| ATTESTATION TARGETS pending loader bar | 1.5s loop | linear | `linear-gradient` 左→右 sweep | 停止 |
| ATTESTATION TARGETS success → glow flash | 600ms | ease-out | `text-shadow: 0 0 12px ${A.green}` を 0 → full → 33% | 停止 |
| ATTESTATION TARGETS failure shake | 200ms | linear | STATUS セルのみ `translateX(-2px → 2px → 0)` 1 ループ | 停止 |

すべての `@keyframes` は `index.css` に追加 (Biome の selector 順序ルールに従う)。新規 `@keyframes` は `safety-toast-slide-in / safety-toast-slide-out / safety-score-glow / safety-bar-grow / safety-handle-fade` の 5 つで、既存 OnChainProof 用 `onchain-pulse / onchain-sweep` は再利用する。

## 9. Developer 引き渡しチェックリスト

- [ ] `MisalignmentToast` を `packages/frontend/src/components/MisalignmentToast.tsx` に新設し、queue 管理は単一インスタンスで `useReducer` 制御 (重複表示なし、取り逃しは捨てる)。
- [ ] `SafetyAttestationPanel` を `packages/frontend/src/components/SafetyAttestationPanel.tsx` に新設し、`AgentDashboard.tsx` の OnChainProofPanel の **直後** に差し込む。
- [ ] `HUD.tsx` に `AgentHandleLabel` コンポーネント (memo) を追加し、`App.tsx` の canvas frame 上部に挿入。
- [ ] `MISALIGNMENT_CARDS` の glyph / color は §4 の表に厳密一致させる (color トークン参照は `runtime.ts` の `CAPABILITY_COLOR.*` を import)。
- [ ] `HUDCorners` を再利用 (新規実装禁止)、`size` のみ panel/toast で個別指定。
- [ ] アニメーションは `@keyframes safety-*` を `index.css` に追加 (5 種)、既存 `onchain-*` は再利用。
- [ ] `prefers-reduced-motion: reduce` で全アニメーション停止。
- [ ] 全状態のスナップショットテストを `bun test` で書く (toast 4 状態 × 4 misalignment、panel 4 セクション × 4 状態 = 計 32 ケース、BDD 日本語 describe)。
- [ ] axe-core / @testing-library/jest-dom の `toHaveAccessibleName` で aria-label を検証。
- [ ] モバイル (375 / 414 / 360 width) で stack レイアウトが崩れないことを Playwright で確認。
- [ ] WCAG 2.1 AA: コントラスト比 4.5:1 以上を全前景色で満たすことを CI で機械検証 (pa11y か axe を `make before-commit` に組み込み、follow-up で OK)。

## 10. Prize Targets 整合チェック

| Prize | このデザインが何を担保するか |
|-------|----------------------------|
| 0G Storage ($X) | `[02] 0G STORAGE` 行で CID をフル表示可能 (`<abbr>` + `aria-label`)、attestation JSON 経由で put される (cosmetic でない) |
| ENS Identity ($X) | HUD 上部の `AgentHandleLabel` で ハンドル + parent.eth が常時可視、demo 視聴者が「pilot42 と名乗る」を 1 秒で理解できる |
| ENS Creative ($X) | `[01] ENS RESOLVER` 行が text records ×3 を強調、resolver link で sepolia.app.ens.domains に飛び「subname-as-credential」を直接見せられる |
| 0G iNFT ($X) | (本機能では拡張せず、OnChainProof 既存の `[01] 0G iNFT` 行が引き続き担保) |
| Uniswap ($X) | (本機能では拡張せず、OnChainProof 既存の `[04] UNISWAP` 行が引き続き担保) |

cosmetic 統合の疑念は、**score 大表示が play log から決定的に算出 → ENS text record と 0G Storage に確実に書く** ことで払拭する。footnote の `MASTER_ARM · DETERMINISTIC FROM PLAY LOG` がこれを口語的に言語化する。

---

設計者ノート: 既存 `AgentDashboard` の class ベース (`index.css`) と inline style の混在は維持する。`.safety-attestation-panel / .safety-score / .safety-breakdown / .safety-encounters / .safety-targets` の 5 クラスを追加し、既存 `.panel` を base にして borderColor のみ inline で `A.rule` に揃える。CSS custom properties (`--c-hud`, `--c-amber`, `--c-green`, `--c-hot`, `--c-mute`, `--c-misalign-sycophancy`, `--c-misalign-reward-hacking`, `--c-misalign-prompt-injection`, `--c-misalign-goal-misgen`) を `index.css` の `:root` に追加し、JSX 側からは custom property を参照する形に揃える (Developer ロールで実装)。
