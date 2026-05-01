# 0G Storage SDK 実統合 — Designer 仕様

設計担当: Designer ロール (`/feature` 5 役並列)。
親仕様: [`2026-05-01-zerog-storage-real.md`](./2026-05-01-zerog-storage-real.md)。
書式参考: [`2026-04-29-agent-safety-attestation-design.md`](./2026-04-29-agent-safety-attestation-design.md)。
対象コンポーネント:

- 拡張 `packages/frontend/src/components/SafetyAttestationPanel.tsx` (`PipelineDiagram` の `0G STORAGE` ノードに rootHash hover を追加、`BreakdownLedger` 周辺は据え置き)。
- 拡張 `packages/frontend/src/web3/safety-attestation.ts` (orchestrator) — 本仕様は UI 表現の正本であり、実装側に渡す「進捗イベント」インターフェースを定義する。
- 新規補助 UI: `ChainSwitchOverlay` (フルスクリーン non-modal) と `FaucetHelpBox` (AgentDashboard ヘッダ直下のヘルプ枠)。

## 1. 設計方針

- 既存 brutalist + Ace Compat 風の世界観 (`HUDCorners` / dashed rule / `JetBrains Mono` / amber CTA / tabular-nums / `A.*` トークン) を絶対に壊さない。新色は導入せず、既存 `A.bg / A.panel / A.ink / A.body / A.mute / A.rule / A.hud / A.amber / A.hot / A.green` のみで構成する。
- chain switch は demo 視聴者にとって「最も誤解されやすいフロー」(なぜ wallet popup が 3 連続で出るのか) なので、ステートを **常に 1 行のヘッダ + ASCII state diagram のミニ版** で AgentDashboard 上に可視化する。アニメーションではなく文字情報で「今どの chain にいて、次に何が起こるか」を読ませる。
- 失敗ブランチを「全停止する致命的 failure」と「fallback して継続する partial failure」の 2 階層で扱う。後者は文言を `(fallback)` 接頭で添え、UX が壊れない範囲で record を継続する。
- testnet ETH 不足は demo 当日に確実に踏むリスクなので、faucet 誘導を **エラー後に出すのではなく**、ヘッダから常時出せるようにする。

## 2. Chain switch UX — state diagram (ASCII)

orchestrator (`runSafetyAttestation`) が触る wallet chain は Sepolia (11155111) と 0G Galileo (16602) の 2 つ。下図は「正常系 + 4 種失敗ブランチ」を 1 枚で表現する。各ノードに wallet popup の有無と、実際の write target (storage / ENS) を併記する。

```
                           [start: Sepolia (11155111)]
                                      │
                                      │  step 1 / popup #1: switchChain → 0G Galileo (16602)
                                      ▼
                       ┌───────[CHAIN: 0G Galileo (16602)]───────┐
                       │                                          │
              user reject (popup #1)                          chain ok
                       │                                          │
                       ▼                                          │  step 2 / popup #2: signer.upload (Indexer)
              [FAILED: chain switch                                ▼
               cancelled]                                ┌── upload result ──┐
              ※ ENS write skip                          │                    │
                                                  upload success         upload fail
                                                  rootHash 0xc5d2…     (SDK error / faucet 不足
                                                        │                / network 切断)
                                                        │                     │
                                                        │                     ▼
                                                        │             [FALLBACK: sha256://]
                                                        │             storageProof = failed
                                                        │             cid = sha256://{hex}
                                                        │             ※ ENS write は継続
                                                        │                     │
                                                        └─────────┬──────────┘
                                                                  │  step 3 / popup #3: switchChain → Sepolia
                                                                  ▼
                                                ┌── chain switch back ──┐
                                                │                        │
                                          switch ok                  switch fail
                                                │                        │
                                                │                        ▼
                                                │           [PARTIAL FAILURE]
                                                │           storage 成功 / ENS 未書込
                                                │           ensProof = failed
                                                │           ※ rootHash は表示維持
                                                │
                                                ▼  step 4 / popup #4: ensureSubname + setText (Sepolia)
                                       ┌── ENS write ──┐
                                       │                │
                                  write ok          write fail
                                       │                │
                                       ▼                ▼
                                 [SUCCESS]      [FAILED: ENS]
                                 storage ●      storage ● / ENS ✕
                                 ENS ●          (rootHash は確認可、ENS は RETRY 可能)
```

| step | popup # | wallet 表示 | UI ヘッダ aria-live 文言 (JP) |
|------|---------|-------------|--------------------------------|
| 1 | #1 | `Switch network` to 0G Galileo (16602) | `0G Galileo に切り替え中` |
| 2 | #2 | `Sign / Send` (indexer signer) | `attestation を 0G Storage に保存中` |
| 3 | #3 | `Switch network` to Sepolia (11155111) | `Sepolia に戻し中` |
| 4 | #4 | `Sign / Send` (ENS resolver setText) | `ENS subname と text records を登録中` |

`ChainSwitchOverlay` (新規補助 UI) はフルスクリーン modal にせず、AgentDashboard 内の SafetyAttestationPanel ヘッダに「現在 step / 次の popup」だけを 1 行で出す non-blocking なバナーとする (詳細 §2-2)。

### 2-1. 失敗 → 復帰の遷移ルール

| ブランチ | 直接の振る舞い | 後続 step | UI 副作用 |
|---------|---------------|-----------|-----------|
| popup #1 reject | step 1 で停止 | step 2/3/4 全て skip | storageProof = failed (`chain switch reject`)、ensProof = `skipped` (failed と区別、§3) |
| upload SDK error | sha256 fallback で cid を埋め、step 3 へ進む | step 3/4 は通常進行 | storageProof = failed (fallback `sha256://...` を `data.cid` に持つ)、ensProof は通常 |
| testnet ETH 0 (faucet 不足) | upload SDK error と同じ扱い、ただし error 文言が異なる | 同上 | FaucetHelpBox を AgentDashboard ヘッダ直下に常時表示 (`A.amber` パルスなし、静的) |
| popup #3 fail (Sepolia 戻し失敗) | step 4 skip | — | partial failure 表示。storage は success のまま、ENS は failed (`Sepolia 戻し失敗`)。RETRY は step 3 から再実行可能 |
| popup #4 reject | ENS のみ failed | — | storage ●、ENS ✕。RETRY ボタンで step 3 から再実行 (chain assert 込み) |

「skipped」状態は STATUS バッジで `○ SKIPPED` (`A.mute`) と表示し、`failed` (`A.hot`) と区別する。skipped はユーザー操作の結果 (cancel) 由来であり、retry を強要しない。

### 2-2. ChainSwitchOverlay (ヘッダバナー)

SafetyAttestationPanel ヘッダ (`░░ § 09 / AGENT SAFETY ATTESTATION` 行) の直下に挿入する 1 行バナー。orchestrator 進行中のみ表示し、idle / 完了後は非表示。

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ░░ § 09 / AGENT SAFETY ATTESTATION                ATTEST · 2 / 4 LIVE          │
│ ─────────────────────────────────────────────────────────────────────────────  │
│ ▸ STEP 2 / 4 · NOW: 0G Galileo (16602) · NEXT POPUP: SIGN UPLOAD                │
│ ─────────────────────────────────────────────────────────────────────────────  │
│ (以下、既存 PipelineDiagram + BreakdownLedger)                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

| 要素 | テキスト | 色 | font-size | letter-spacing | font-weight |
|------|---------|-----|-----------|----------------|-------------|
| カラットマーカー `▸` | `▸` | `A.amber` | 12px | 0 | 700 |
| `STEP 2 / 4` | `STEP {n} / 4` | `A.ink`, tabular-nums | 12px | 0.18em | 700 |
| `NOW: 0G Galileo (16602)` | 現在の chain (id 併記) | `A.hud` | 12px | 0.10em | 500 |
| `NEXT POPUP: SIGN UPLOAD` | 次に出る popup の種類 | `A.amber` | 12px | 0.18em | 700 |
| 区切り `·` | 中黒 | `A.mute` | 12px | 0.04em | 400 |

`NEXT POPUP` ラベル一覧:

| step | NEXT POPUP 表示 (EN/JP) |
|------|--------------------------|
| 1 進行中 | `SWITCH TO 0G GALILEO` / `0G Galileo に切替` |
| 2 進行中 | `SIGN UPLOAD` / `署名: 保存実行` |
| 3 進行中 | `SWITCH TO SEPOLIA` / `Sepolia に切替` |
| 4 進行中 | `SIGN ENS WRITE` / `署名: ENS 書込` |

aria-live region は `role="status"` `aria-live="polite"` で、step 切替時のみ通知する (毎フレーム流さない、§5)。

## 3. PipelineDiagram の 0G STORAGE ノード rootHash hover

既存 `SafetyAttestationPanel.tsx` の `PipelineDiagram` には GAME ENGINE → DERIVE → 0G STORAGE → ENS RESOLVER の 4 ノードが横並びで描画される。本機能では `0G STORAGE` ノード内に rootHash の truncated 表示を埋め、hover / focus で full hash + 0G storage explorer link を出す。

### 3-1. desktop wireframe (>=768px)

```
┌─ corner ────────────────────────────────────────────────────────────────── corner ─┐
│                                                                                    │
│  ┌──────────────┐  ─►  ┌──────────────┐  ─►  ┌──────────────┐  ─►  ┌──────────────┐ │
│  │ GAME ENGINE  │      │ DERIVE       │      │ 0G STORAGE   │      │ ENS RESOLVER │ │
│  │ ────────     │      │ ────────     │      │ ────────     │      │ ────────     │ │
│  │ playLog      │      │ pure fn      │      │ ● STORED     │      │ ● RESOLVED   │ │
│  │ 8 enemies    │      │ score 85     │      │ 0g://0xc5d2  │      │ pilot42      │ │
│  │ 5 misalign.  │      │ breakdown    │      │  …a470 ⓘ     │      │ .{parent}.eth│ │
│  │              │      │              │      │              │      │              │ │
│  └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘ │
│                                                       ▲                            │
│                                                       │                            │
│                              hover / focus で popover 展開 ────────────────────────►│
│                              ┌────────────────────────────────────────────┐        │
│                              │ ░░ 0G STORAGE · ROOT HASH                  │        │
│                              │ ─────────────────────────────────────────  │        │
│                              │ 0g://0xc5d2f48a7be9a1c0…                   │        │
│                              │       3d6b41fa8e28d9a470                    │        │
│                              │ ─────────────────────────────────────────  │        │
│                              │ ▸ OPEN IN 0G STORAGE EXPLORER  ⤴︎          │        │
│                              │   storagescan-galileo.0g.ai/tx/0xc5d2…     │        │
│                              └────────────────────────────────────────────┘        │
│                                                                                    │
└─ corner ────────────────────────────────────────────────────────────────── corner ─┘
```

| 要素 | テキスト | 色 | font-size | letter-spacing | font-weight |
|------|---------|-----|-----------|----------------|-------------|
| ノード内 cid (truncated) | `0g://0xc5d2…a470` (前 6 + 後 4) | `A.hud`, tabular-nums | 12px | 0.04em | 500 |
| info グリフ `ⓘ` | `ⓘ` | `A.amber` | 11px | 0 | 700 |
| popover eyebrow | `░░ 0G STORAGE · ROOT HASH` | `A.mute` | 11px | 0.20em | 400 |
| popover 中の full hash | `0g://0x{64 hex}` を 2 行折返し | `A.ink`, tabular-nums | 12px | 0.04em | 500 |
| popover CTA | `▸ OPEN IN 0G STORAGE EXPLORER ⤴︎` | `A.amber` | 12px | 0.18em | 700 |
| popover URL 補助行 | `storagescan-galileo.0g.ai/tx/{rootHash}` | `A.hud` | 11px | 0.04em | 400 |
| popover 外枠 | `HUDCorners color={A.amber} size={12}` + `border: 1px solid A.rule` | — | — | — | — |
| popover 背景 | `A.bg` + `box-shadow: 0 0 24px ${A.bg}cc inset` | — | — | — | — |

#### truncate ルール

- `0g://0x` プレフィックス + 先頭 4 byte (8 hex) + `…` + 末尾 2 byte (4 hex)。例: `0g://0xc5d2f48a…a470`。
- sha256 fallback 中は `sha256://abcd…ef01` の同じパターンで表示する。
- popover 内では full hash を `<code>` で 2 行に折り返し、コピーペースト可能にする (`user-select: all`)。

#### popover 配置

- 既定: ノードの上方向に展開 (`bottom: 100% + 8px gap`)。
- viewport 上端に近い場合: `top: 100% + 8px gap` に反転 (CSS `@supports` で `anchor-positioning` 利用可能なら使う、未対応環境は inline style で計算)。
- 幅: 320px。`<480px` viewport では 90vw に縮める。

#### インタラクション

| トリガ | 結果 |
|--------|------|
| マウス hover (200ms 以上) | popover 表示、`opacity 0 → 1` 100ms |
| マウス leave | popover 非表示、`opacity 1 → 0` 100ms (delay 200ms で誤操作回避) |
| keyboard focus (`Tab` で cid セルに到達) | popover 表示 (hover と同じ visual) |
| `Enter` / `Space` キー押下 | popover 内 CTA に focus を移動 |
| `Esc` キー押下 | popover を閉じて元の cid セルに focus 復帰 |
| popover CTA クリック | `window.open(url, '_blank', 'noopener,noreferrer')` で新タブを開く |

### 3-2. mobile wireframe (<768px)

`PipelineDiagram` は mobile で縦 stack に変わる (既存仕様)。0G STORAGE ノードは横幅いっぱいで、cid セルのタップで popover が出る (hover 不在)。

```
┌─ corner ──────────────────────────── corner ─┐
│ ┌──────────────────────────────────────────┐  │
│ │ 0G STORAGE                  ● STORED     │  │
│ │ ────────────────────────────────────────  │  │
│ │ 0g://0xc5d2…a470  ⓘ  ▸ TAP FOR DETAILS  │  │
│ └──────────────────────────────────────────┘  │
│        │                                      │
│        ▼ tap                                  │
│ ┌──────────────────────────────────────────┐  │
│ │ ░░ 0G STORAGE · ROOT HASH         ✕      │  │
│ │ ────────────────────────────────────────  │  │
│ │ 0g://0xc5d2f48a7be9a1c0                  │  │
│ │       3d6b41fa8e28d9a470                  │  │
│ │ ────────────────────────────────────────  │  │
│ │ ▸ OPEN IN 0G STORAGE EXPLORER  ⤴︎         │  │
│ │   storagescan-galileo.0g.ai/tx/0xc5d2…   │  │
│ └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

mobile の popover はノードの **直下** に inline で展開 (絶対配置にしない、レイアウトを押し下げる)。閉じるボタン `✕` を右上に置き、最低 44×44 CSS px を確保する。タップ外でも閉じる。

### 3-3. role / aria 構造

```
<button
  type="button"
  aria-expanded={open}
  aria-controls="zerog-roothash-popover"
  aria-label="0G Storage root hash 0g://0xc5d2…a470, クリックで詳細を開く"
  data-truncated="0g://0xc5d2…a470"
>
  0g://0xc5d2…a470 <span aria-hidden="true">ⓘ</span>
</button>
<div
  id="zerog-roothash-popover"
  role="dialog"
  aria-modal="false"
  aria-label="0G Storage root hash 詳細"
  hidden={!open}
>
  …
</div>
```

`role="button"` を `<button>` 要素に与えるのではなく、native `<button>` を使い、CSS で見た目を text-only に整える。`role="dialog"` の popover は non-modal (`aria-modal="false"`) で、focus trap なし、Esc で閉じる。

## 4. failed 文言 4 種 (日本語 40 文字以内)

orchestrator から渡される `errorCode` に応じて、UI 側で以下の `errorMessage` を表示する。すべて 40 文字以内で、句点なしの体言止めを基本とする (HUD 風)。

| errorCode | JP error message (40 字以内) | 文字数 | 適用範囲 | RETRY 文言 |
|-----------|------------------------------|--------|----------|-----------|
| `chain_switch_reject_galileo` | `0G Galileo への切替がキャンセルされました` | 22 | popup #1 reject | `▸ 再度切替を試行` |
| `zerog_sdk_upload_error` | `0G Storage SDK エラー、sha256 退避で継続` | 23 | upload SDK 例外 (faucet 由来でない) | `▸ RETRY` |
| `zerog_faucet_insufficient` | `0G testnet ETH 不足、faucet で取得が必要` | 22 | upload 失敗 + 残高 0 検出時 | `▸ FAUCET を開く` (§5) |
| `chain_switch_back_sepolia_failed` | `Sepolia への戻しに失敗、ENS 書込が未完` | 22 | popup #3 fail (storage 成功後) | `▸ Sepolia 切替を再試行` |

### 4-1. 文言の表示位置

| errorCode | 表示位置 | severity |
|-----------|----------|----------|
| `chain_switch_reject_galileo` | SafetyAttestationPanel の storageProof 行 + ChainSwitchOverlay (`✕ SKIPPED`) | failed (`A.hot`) |
| `zerog_sdk_upload_error` | storageProof 行に inline + 補助行 `(fallback: sha256://abcd…ef01)` (`A.mute`) | failed but recovered (`A.hot` メッセージ + `A.mute` 補助) |
| `zerog_faucet_insufficient` | storageProof 行 + FaucetHelpBox を AgentDashboard ヘッダ直下に常駐 | failed (`A.hot`) + helper (`A.amber`) |
| `chain_switch_back_sepolia_failed` | ensProof 行 + storageProof は success 維持 + footnote に `partial failure` 表示 | partial failure (`A.amber` ではなく `A.hot`) |

### 4-2. 補助文 (`(fallback: ...)` 等)

- `(fallback: sha256://abcd…ef01)` を `A.mute` で error message の右に 1 行添える。
- 文字数制約は補助文には適用しない (本体メッセージのみ 40 字以内)。
- 補助文も SR には読み上げる (`aria-live="polite"`)。

## 5. testnet faucet 誘導 UI (FaucetHelpBox)

AgentDashboard のヘッダ (`AgentHandleLabel` の下、SafetyAttestationPanel より上) に挿入する常駐ヘルプ枠。`zerog_faucet_insufficient` errorCode 検出時、または `walletClient.getBalance(GALILEO)` が `0n` の場合に表示する。

### 5-1. desktop wireframe (>=768px)

```
┌─ corner ──────────────────────────────────────────────────────────────── corner ─┐
│ ░░ FAUCET HELP · 0G GALILEO TESTNET                                              │
│ ─────────────────────────────────────────────────────────────────────────────    │
│ ▲ 0G testnet ETH 不足、faucet で取得が必要                                         │
│   0G Storage への保存には Galileo testnet ETH が必要です。下記から無料で取得可能。 │
│   wallet address: 0xa3F2…b491                                                      │
│                                                                                    │
│   ▸ OPEN OFFICIAL FAUCET  ⤴︎    https://faucet.0g.ai                              │
│   ▸ COPY WALLET ADDRESS  ⎘                                                        │
│                                                                                    │
│ ─────────────────────────────────────────────────────────────────────────────    │
│ ◆ 取得後にこのバナーは自動で消えます · 残高 0.00 ETH                              │
└─ corner ──────────────────────────────────────────────────────────────── corner ─┘
```

| 要素 | テキスト | 色 | font-size | letter-spacing | font-weight |
|------|---------|-----|-----------|----------------|-------------|
| eyebrow | `░░ FAUCET HELP · 0G GALILEO TESTNET` | `A.mute` | 11px | 0.20em | 400 |
| 警告アイコン `▲` | `▲` | `A.amber` | 14px | 0 | 700 |
| ヘッドライン | `0G testnet ETH 不足、faucet で取得が必要` | `A.amber` | 13px | 0.18em | 700 |
| 説明本文 | `0G Storage への保存には Galileo testnet ETH が必要です。下記から無料で取得可能。` | `A.body` | 12px | 0.04em | 400 |
| wallet address 行 | `wallet address: 0xa3F2…b491` (truncated 6+4) | `A.hud`, tabular-nums | 12px | 0.04em | 500 |
| primary CTA | `▸ OPEN OFFICIAL FAUCET ⤴︎` | `A.amber` | 13px | 0.18em | 700 |
| primary URL 補助 | `https://faucet.0g.ai` | `A.hud` | 11px | 0.04em | 400 |
| secondary CTA | `▸ COPY WALLET ADDRESS ⎘` | `A.amber` | 12px | 0.18em | 500 |
| footer | `◆ 取得後にこのバナーは自動で消えます · 残高 0.00 ETH` | `A.mute` | 11px | 0.20em | 400 |

### 5-2. mobile wireframe (<768px)

```
┌─ corner ─────────────────────── corner ─┐
│ ░░ FAUCET HELP                          │
│ ─────────────────────────────────────── │
│ ▲ 0G testnet ETH 不足                   │
│   faucet で無料取得が必要                │
│                                          │
│   wallet: 0xa3F2…b491                   │
│                                          │
│   ┌──────────────────────────────────┐  │
│   │ ▸ OPEN FAUCET  ⤴︎                  │  │
│   └──────────────────────────────────┘  │
│   ┌──────────────────────────────────┐  │
│   │ ▸ COPY ADDRESS  ⎘                 │  │
│   └──────────────────────────────────┘  │
│ ─────────────────────────────────────── │
│ ◆ 残高 0.00 ETH                          │
└─────────────────────────────────────────┘
```

mobile は CTA を full-width ボタンに格上げ (44px height 確保)、説明本文を 2 行に圧縮する。

### 5-3. faucet URL ポリシー

- 公式 faucet: `https://faucet.0g.ai`。仕様書記載 (受け入れ基準 §4) と整合。
- 環境変数 `VITE_ZEROG_FAUCET_URL` が定義されていればそれを優先 (チェーン名変更や代替 faucet への対応)。
- URL 末尾の trailing slash は除去して比較・表示する。
- target=`_blank`, rel=`noopener noreferrer` を必須。

### 5-4. 表示制御ルール

| 条件 | FaucetHelpBox 表示 |
|------|---------------------|
| wallet 未接続 | 非表示 (まず接続が先) |
| wallet 接続済 + 0G Galileo 残高未取得 | 非表示 (取得試行は orchestrator 開始時のみ) |
| wallet 接続済 + 0G Galileo 残高 = 0 | 表示 |
| wallet 接続済 + 残高 > 0 | 非表示 |
| `zerog_faucet_insufficient` errorCode 受信 | 表示 (残高チェックを skip して即座に出す) |
| 一度表示後、残高 > 0 を検出 | 1.2 秒の `opacity 1 → 0` フェードで非表示 |

残高チェックは orchestrator 開始時 + `zerog_faucet_insufficient` 検出時の 2 タイミングのみ。ポーリングしない (RPC レート消費を抑える)。

## 6. アクセシビリティ — WCAG 2.1 AA

### 6-1. コントラスト比 (背景 `A.bg #05080c` 想定)

親 design 仕様 (§6-1) と同じトークンを使うため、新規コントラスト比検証は不要。FaucetHelpBox / ChainSwitchOverlay / 0G hover popover はすべて `A.amber` (11.0:1)、`A.hud` (11.6:1)、`A.body` (9.8:1)、`A.ink` (17.4:1) を本文 / CTA / 強調に使い、`A.mute` (3.6:1) は eyebrow / 補助テキストに限定する。

### 6-2. aria-live region

| 領域 | aria 属性 | 動作 |
|------|-----------|------|
| ChainSwitchOverlay (ヘッダバナー) | `<div role="status" aria-live="polite" aria-atomic="true">` | step 切替時に「0G Galileo に切り替え中」「attestation を 0G Storage に保存中」「Sepolia に戻し中」「ENS subname と text records を登録中」を 1 度ずつ通知 |
| storageProof / ensProof STATUS バッジ | `<div role="status" aria-live="polite" aria-busy={pending}>` | status 遷移時に通知。`aria-busy="true"` を pending 中に付与 |
| 0G hover popover | `<div role="dialog" aria-modal="false" aria-label="0G Storage root hash 詳細">` | 開閉時に focus 移動を伴うため SR には dialog として通知 |
| FaucetHelpBox | `<aside role="region" aria-label="0G testnet faucet ヘルプ">` | 表示時に「0G testnet ETH 不足、faucet で取得が必要」を `aria-live="polite"` で 1 度通知 |

aria-live の重複読み上げを避けるため、ChainSwitchOverlay の文言は **step が変わった瞬間のみ** 更新する (進行中の細かい状態変化では更新しない)。

### 6-3. keyboard interaction

| 操作 | 結果 |
|------|------|
| `Tab` で 0G STORAGE ノード内 cid セル (`<button>`) に focus | popover 展開 (hover と同じ) |
| `Enter` / `Space` を cid `<button>` 上で押下 | popover 内 CTA に focus を移動 |
| `Esc` を popover 内で押下 | popover を閉じて cid `<button>` に focus 復帰 |
| `Tab` を popover 内で押下 | popover 内 CTA → 次のページ要素へ移動 (focus trap なし、§3-3) |
| FaucetHelpBox の primary CTA に focus | `Enter` で `window.open` |
| FaucetHelpBox の secondary CTA (COPY ADDRESS) に focus | `Enter` で `navigator.clipboard.writeText`、コピー成功時に 2 秒間「✓ COPIED」表示 |

`:focus-visible` で `outline: 2px solid ${A.hud}; outline-offset: 2px` を全インタラクティブ要素に付与。タッチターゲットは最低 44×44 CSS px (WCAG 2.5.5 AAA 意識)。

### 6-4. role="button" 化の根拠

仕様書要請の「rootHash hover を keyboard focus でも開けるよう role="button"」は、native `<button>` を使うことで実質的に満たす。`<span role="button" tabindex="0">` の代替パターンを取らない理由:

- native `<button>` は Enter / Space / 連続 Tab を自動でハンドリング。
- `aria-expanded` / `aria-controls` を付与しても CSS で text-only 装飾できる (`background: transparent; border: none; padding: 0; color: inherit; font: inherit;`)。
- screen reader が「ボタン」と自動でアナウンスし、`role="button"` 補助が不要。

### 6-5. その他

- `prefers-reduced-motion: reduce` で popover の `opacity` フェード (100ms) を 0ms にし、即時表示 / 即時非表示にする。
- `prefers-contrast: more` で `A.body` を `A.ink` に格上げ、border を 1 → 1.6px に太くする。
- FaucetHelpBox の wallet address コピー成功表示 (`✓ COPIED`) は `aria-live="polite"` で SR に読み上げる。

## 7. error / empty / loading 表示文字列 (補遺)

親 design 仕様 (§7) で定義済の状態文字列に加え、本機能で新規に必要なものを追加する。

### 7-1. ChainSwitchOverlay 文言 (再掲)

| step | EN | JP |
|------|-----|-----|
| 1 進行中 | `STEP 1 / 4 · NOW: SEPOLIA · NEXT: SWITCH TO 0G GALILEO` | `STEP 1 / 4 · 現在: SEPOLIA · 次: 0G GALILEO に切替` |
| 2 進行中 | `STEP 2 / 4 · NOW: 0G GALILEO (16602) · NEXT: SIGN UPLOAD` | `STEP 2 / 4 · 現在: 0G GALILEO (16602) · 次: 署名で保存実行` |
| 3 進行中 | `STEP 3 / 4 · NOW: 0G GALILEO (16602) · NEXT: SWITCH TO SEPOLIA` | `STEP 3 / 4 · 現在: 0G GALILEO · 次: SEPOLIA に切替` |
| 4 進行中 | `STEP 4 / 4 · NOW: SEPOLIA · NEXT: SIGN ENS WRITE` | `STEP 4 / 4 · 現在: SEPOLIA · 次: 署名で ENS 書込` |
| 完了 | (非表示) | (非表示) |

### 7-2. failed 4 種 (再掲、§4 参照)

### 7-3. 補助 STATUS

| 状態 | EN | JP |
|------|-----|-----|
| skipped (chain switch reject) | `○ SKIPPED` | `○ 未実行` |
| partial failure (storage ok / ENS ng) | `◐ PARTIAL` | `◐ 一部失敗` |

`partial failure` はパネル footnote にも 1 行で表示する。

```
◆ MASTER_ARM · STORAGE 成功 / ENS 未書込 · RETRY で再開
```

## 8. アニメーション仕様 (本機能で追加分)

| 対象 | duration | easing | 内容 | reduced-motion |
|------|----------|--------|------|---------------|
| 0G hover popover 開閉 | 100ms | ease-out | `opacity 0 ↔ 1` | 0ms (即時表示) |
| ChainSwitchOverlay step 切替 | 200ms | ease-in-out | `opacity: 1 → 0.3 → 1` (テキストのみ、レイアウトは固定) | 0ms (即時切替) |
| FaucetHelpBox 表示 | 240ms | `cubic-bezier(.2,.8,.2,1)` | `opacity 0 → 1` + `translateY(-4px) → 0` | 0ms (即時表示) |
| FaucetHelpBox 残高検出後の非表示 | 1200ms | ease-out | `opacity 1 → 0` (delay 600ms で「読み終わる時間」を確保) | 即時非表示 |
| 0G STORAGE ノードの success → glow flash | 600ms | ease-out | `text-shadow: 0 0 12px ${A.green}` を 0 → full → 33% (cid セルに適用) | 停止 |

新規 `@keyframes` は `safety-popover-fade / safety-step-pulse / safety-faucet-fade-in / safety-faucet-fade-out` の 4 つ。既存 `safety-*` / `onchain-*` は再利用する。

## 9. Developer 引き渡しチェックリスト

- [ ] `SafetyAttestationPanel.tsx` の `PipelineDiagram` 内 0G STORAGE ノードに `<button>` ベースの cid セル + popover を追加。`role="button"` を `<span>` に与える形は禁止 (§6-4)。
- [ ] `ChainSwitchOverlay` を `SafetyAttestationPanel` ヘッダ直下に挿入し、orchestrator 進行中のみ表示。aria-live は step 切替時のみ更新する。
- [ ] `FaucetHelpBox` を新規コンポーネントとして `packages/frontend/src/components/FaucetHelpBox.tsx` に作成し、`AgentDashboard` のヘッダ (`AgentHandleLabel` 直下、SafetyAttestationPanel より上) に差し込む。
- [ ] orchestrator から進捗イベント (`{ step: 1|2|3|4, phase: 'before-popup'|'after-popup'|'failed', errorCode? }`) を `SafetyAttestationPanel` に渡せるよう `runSafetyAttestation` の戻り値型を拡張する (実装は Developer 役割)。
- [ ] truncate 関数 (`0g://0xc5d2…a470` 形式) は `packages/frontend/src/utils/truncate.ts` に純関数として配置し、`zerog-storage.ts` と共用する。テストは BDD 日本語で書く。
- [ ] failed 文言 4 種 (§4) を `packages/frontend/src/web3/safety-attestation.ts` の `FAILED_MESSAGES` 定数に集約 (DRY、ハードコード分散禁止)。
- [ ] FaucetHelpBox の 0G Galileo 残高チェックは orchestrator 開始時 + `zerog_faucet_insufficient` 検出時のみ (ポーリング禁止、§5-4)。
- [ ] 全状態のスナップショットテスト (`bun test` BDD 日本語 describe): chain switch overlay 4 step + 4 失敗ブランチ、popover 開閉 (hover / focus / Esc)、FaucetHelpBox 表示制御 5 ケース。
- [ ] axe-core で role="dialog" / aria-live / aria-expanded / aria-controls の整合性を機械検証。
- [ ] mobile (375 / 414 / 360 width) で popover が viewport 外に溢れないこと、FaucetHelpBox の CTA が 44px 高を満たすことを Playwright で確認。
- [ ] WCAG 2.1 AA: コントラスト比 4.5:1 以上を全前景色で満たすことを CI で機械検証 (pa11y か axe を `make before-commit` に組み込み、follow-up で OK)。

## 10. Prize Targets 整合チェック

| Prize | このデザインが何を担保するか |
|-------|----------------------------|
| 0G Storage (Autonomous Agents / iNFT) | `PipelineDiagram` の 0G STORAGE ノードで rootHash を **truncate + full hash + explorer link** の 3 段で露出。judge が 1 クリックで explorer に飛べるため、cosmetic でなく real demo であることを 5 秒で証明できる |
| 0G iNFT | rootHash は ENS text record にも書かれるが、デザイン側では PipelineDiagram の右端 ENS RESOLVER ノード内 `0g://...` text record 表示で間接的に「iNFT metadata に流れている」連続性を可視化する (詳細は親仕様 forge-onchain.ts) |
| ENS Identity / Creative | partial failure 時 (storage ●、ENS ✕) でも `[01] ENS RESOLVER` 行に RETRY を残し、demo 中の事故復帰を視覚化する |
| その他 (Compute / Gensyn / KeeperHub / Uniswap) | 範囲外 |

cosmetic 統合の疑念は、**rootHash hover で full hash を露出 + explorer link を 1 クリックで開ける** ことで払拭する。faucet 誘導を最初から可視化することで、demo 当日に「testnet ETH なくて止まる」リスクをデザイン段階で潰す。

---

設計者ノート: 既存 `SafetyAttestationPanel.tsx` の `PipelineDiagram` と `BreakdownLedger` は手を加えず、ノード内のテキスト要素を `<button>` ベースの cid セルに差し替えるだけで対応可能。CSS は既存 `.safety-attestation-panel` 配下に `.safety-pipeline-cid / .safety-pipeline-popover / .safety-chain-overlay / .safety-faucet-help` の 4 クラスを追加し、すべて既存 `A.*` トークンを CSS custom property 経由で参照する。`@keyframes safety-popover-fade / safety-step-pulse / safety-faucet-fade-in / safety-faucet-fade-out` を `index.css` に追加する。
