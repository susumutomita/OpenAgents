# Web3 Wiring — Designer 仕様 (ON-CHAIN PROOF UI)

設計担当: Designer ロール (`/feature` 5 役並列)。
親仕様: [`2026-04-27-web3-wiring.md`](./2026-04-27-web3-wiring.md)。
対象 Issue: Issue 13 (`[Web3 Wiring] Designer: OnChainProof UI 設計`)。
対象コンポーネント: `packages/frontend/src/components/AgentDashboard.tsx` 末尾に追加する新セクション `OnChainProof`。

## 1. 設計方針

- 既存の brutalist + Ace Combat 風 (App.tsx の HUD / amber CTA / dashed rule の世界観) を **絶対に壊さない**。新規パレットは禁止し、既存 `A` const (`bg / ink / mute / rule / acid / hud / amber / hot / green / body`) のみで構成する。
- 4 行 (0G iNFT / 0G STORAGE / ENS / UNISWAP) を 1 つの「コックピット計器」風パネルに集約する。各行は **4 状態 (idle / pending / success / failure)** を持つ独立したステータスインジケータ。
- Promise.allSettled で並列発火する非同期 UX を、**HUD インジケータ (○ ▲ ● ◆ ✕)** で 1 ピクセルでも映像で読めるようにする。demo 動画 (1:20-2:00) で「並列に on-chain action が起きている」ことが視認できることが最優先。
- `INSERT COIN FOR FIRST TRADE` ボタンは Hero 既存の `S.amberBtn` 系のスタイルを **継承** し、HUDCorners を巻いて「最後の一手」感を出す。

## 2. ASCII ワイヤーフレーム — desktop (>=768px)

新セクションは AgentDashboard 内で `feed-panel` の下、grid の最終行に **full-width** (column 1 / -1) で配置する。

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ░░ § 08 / ON-CHAIN PROOF                                  STATUS · 3 / 4 LIVE  │← header (eyebrow + counter)
│ ─────────────────────────────────────────────────────────────────────────────  │
│ ┌─ corner          ON-CHAIN PROOF · GR@DIUS_FORGE                  corner ─┐  │
│ │                                                                          │  │
│ │ TRACK         CONTRACT / RESOURCE        STATUS         LINK / ACTION    │  │
│ │ ────────────  ───────────────────────  ──────────────  ───────────────── │  │
│ │ [01] 0G_iNFT  AgentForgeINFT (0G Gali)  ● MINTED       chainscan.0g.ai  →│  │
│ │               token #0xa3..f1                          0xa3..f1          │  │
│ │ ─ ─ ─ ─ ─ ─   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    ─ ─ ─ ─ ─ ─    ─ ─ ─ ─ ─ ─ ─    │  │
│ │ [02] 0G_STORE play_log.json (CID)        ▲ PENDING      ░░░░░░ uploading │  │
│ │               bafyrei...l4cy             0G_STORAGE     hash: pending    │  │
│ │ ─ ─ ─ ─ ─ ─   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    ─ ─ ─ ─ ─ ─    ─ ─ ─ ─ ─ ─ ─    │  │
│ │ [03] ENS      kotetsu.gradiusweb3.eth   ● RESOLVED     sepolia.app.ens →│  │
│ │               text: combat-power=8200                  text records ×3   │  │
│ │ ─ ─ ─ ─ ─ ─   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    ─ ─ ─ ─ ─ ─    ─ ─ ─ ─ ─ ─ ─    │  │
│ │ [04] UNISWAP  Sepolia v3 SwapRouter02   ○ STANDBY      ┌──────────────┐ │  │
│ │               WETH → USDC · 0.0001 ETH                 │ ▸ INSERT COIN│ │  │
│ │                                                        │  FOR FIRST   │ │  │
│ │                                                        │  TRADE       │ │  │
│ │                                                        └──────────────┘ │  │
│ │                                                          (amber CTA)    │  │
│ └─ corner                                                          corner ─┘  │
│                                                                                │
│ ◆ MASTER_ARM · ALL TX SIGNED IN BROWSER WALLET · NO PRIVATE KEY ON SERVER     │← footnote (mute)
└────────────────────────────────────────────────────────────────────────────────┘
```

Grid 列定義 (固定):

```
gridTemplateColumns: "120px  minmax(220px, 1.4fr)  140px  minmax(220px, 1.6fr)"
                     TRACK   CONTRACT/RESOURCE     STATUS LINK / ACTION
```

行間は `borderBottom: 1px dashed A.rule` (App.tsx 既存の table パターンと同じ) で区切る。`HUDCorners color={A.hud}` をパネル外枠に使用。

## 3. カラー & タイポグラフィマッピング

| 要素 | 色 (既存 const) | font-size | letter-spacing | font-weight | 備考 |
|------|----------------|-----------|----------------|-------------|------|
| パネル背景 | `A.bg` (#05080c) | — | — | — | 既存 `S.section` と同じ |
| パネル外枠 | `A.rule` (#1a2735) + `HUDCorners color={A.hud}` | — | — | — | App.tsx `S.specCard` 流用 |
| eyebrow `§ 08 / ON-CHAIN PROOF` | `A.mute` | 11px | 0.20em | 400 | 既存 `S.sectionEyebrow` |
| カウンタ `STATUS · 3 / 4 LIVE` | `A.green` (live 数), `A.mute` (slash) | 11px | 0.18em | 400 | 右寄せ |
| 列見出し (TRACK / CONTRACT...) | `A.mute` | 11px | 0.20em | 400 | 既存 `S.tableHead` 準拠 |
| TRACK ID `[01]` | `A.ink` | 13px | 0.04em | 700 | tabular-nums |
| TRACK 名 `0G_iNFT` | `A.ink` | 13px | 0.18em | 700 | uppercase |
| CONTRACT 1 行目 (resource 名) | `A.body` | 12px | 0.04em | 500 | — |
| CONTRACT 2 行目 (短縮 hash / CID / record 数) | `A.hud` | 11px | 0.04em | 400 | tabular-nums, monospace、後述「コントラスト注記」参照 |
| STATUS idle `○ STANDBY` | `A.mute` | 11px | 0.22em | 700 | App.tsx `STATUS_DISPLAY.open` と同パターン |
| STATUS pending `▲ PENDING` | `A.amber` | 11px | 0.22em | 700 | パルス animation 0.9s ease-in-out infinite |
| STATUS success `● MINTED / ● RESOLVED / ● STORED / ● SWAPPED` | `A.green` | 11px | 0.22em | 700 | グロー: `text-shadow: 0 0 6px ${A.green}33` |
| STATUS failure `✕ FAILED` | `A.hot` | 11px | 0.22em | 700 | グロー: `0 0 6px ${A.hot}55` |
| LINK (explorer) | `A.hud`, underline on hover | 11px | 0.04em | 600 | アイコン `→` を末尾に |
| LINK (短縮 hash, secondary) | `A.body` | 11px | 0.04em | 400 | tabular-nums |
| FAILURE 詳細メッセージ | `A.hot` | 11px | 0.10em | 400 | 1 行 (例: `RPC timeout — retry?`) |
| RETRY CTA | `A.amber` border + `A.amber` text + transparent bg | 11px | 0.18em | 700 | App.tsx `S.cyanBtn` の amber 版 |
| `INSERT COIN FOR FIRST TRADE` ボタン | `A.amber` bg + `A.bg` text | 13px | 0.22em | 700 | 既存 `S.amberBtn` 流用 (詳細 §6) |
| Footnote `MASTER_ARM ...` | `A.amber` (◆), `A.mute` (本文) | 10px | 0.20em | 400 | App.tsx StatusBar の MASTER_ARM 行と同じ味 |

フォントは shell の `"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace` を継承 (新規宣言不要)。tabular-nums は `fontVariantNumeric: 'tabular-nums'` を hash / CID / token id に必ず付与し、pending → success の遷移で文字幅が動かないようにする。

## 4. 4 行ごとの状態設計

各行は `OnChainTrack` 型を持つ:

```
type TxStatus = 'idle' | 'pending' | 'success' | 'failure';
type OnChainTrack = {
  id: '01' | '02' | '03' | '04';
  name: '0G_iNFT' | '0G_STORE' | 'ENS' | 'UNISWAP';
  status: TxStatus;
  resource?: string;        // contract addr / CID / ENS name / router addr
  resourceShort?: string;   // 短縮表示 (`0xa3..f1`, `bafy..l4cy`)
  explorerUrl?: string;
  errorMessage?: string;
  // UNISWAP のみ idle で CTA 表示
  cta?: { label: string; onClick: () => void };
};
```

### 4 状態の表示パターン (全 4 行共通)

| 状態 | TRACK 列 | CONTRACT/RESOURCE 列 | STATUS 列 | LINK / ACTION 列 |
|------|---------|---------------------|----------|------------------|
| **idle** | `[NN] NAME` (`A.ink` / 700) | resource 名のみ (`A.body`)、短縮 hash 領域は `—` (`A.mute`) | `○ STANDBY` (`A.mute`) | UNISWAP のみ amber CTA、他は `—` (`A.mute`) |
| **pending** | 同上 | resource 名 + `bafy..l4cy ░░░░ uploading` (`A.hud` + amber dot loader) | `▲ PENDING` (`A.amber`, パルス) | `hash: pending` (`A.mute`) + 細い progress bar (`linear-gradient(90deg, ${A.amber}, transparent)` 1.5s loop) |
| **success** | 同上 | resource 名 + 短縮 hash (`A.hud`) | `● MINTED / ● STORED / ● RESOLVED / ● SWAPPED` (`A.green`) | `<a>` タグで explorer に飛ぶ。テキストは `chainscan.0g.ai →` 等。`A.hud` underline on focus/hover |
| **failure** | 同上 | resource 名 + error message 1 行 (`A.hot`) | `✕ FAILED` (`A.hot`) | `[ ▸ RETRY ]` amber-bordered ghost button (= retry CTA) |

各行ステータスごとの完成形プレビュー (ASCII で 1 行ずつ抜粋):

```
idle    : [01] 0G_iNFT   AgentForgeINFT (0G Galileo)   ○ STANDBY   —
pending : [02] 0G_STORE  play_log.json   bafy..l4cy ░░  ▲ PENDING   hash: pending  ░░░
success : [03] ENS       kotetsu.gradiusweb3.eth        ● RESOLVED  sepolia.app.ens →
failure : [04] UNISWAP   Sepolia v3 router               ✕ FAILED    user rejected — [▸ RETRY]
```

### 4-1. `[01] 0G_iNFT` (0G Galileo testnet)

- **idle**: `AgentForgeINFT (0G Galileo)` / `○ STANDBY` / `—`。
- **pending**: 2 行目に `mint tx ░░ broadcasting` (`A.hud`)、status `▲ PENDING`、LINK 列に `block: pending` (`A.mute`)。
- **success**: 2 行目に `token #<short>` (`A.hud`, tabular-nums)、status `● MINTED` (`A.green`)、LINK は `chainscan.galileo.0g.ai/tx/<hash> →` (`A.hud`)。
- **failure**: 2 行目に error (例: `gas estimate failed`)、status `✕ FAILED` (`A.hot`)、LINK 列に `[ ▸ RETRY ]`。

### 4-2. `[02] 0G_STORE` (0G Storage SDK)

- **idle**: `play_log.json` / `○ STANDBY`。
- **pending**: 2 行目に `bafy..l4cy ░░ uploading` (パルスドット 3 個)、`▲ PENDING`、LINK 列にバー型 progress (1.5s loop)。
- **success**: 2 行目に `CID: bafy..l4cy` (`A.hud`)、`● STORED` (`A.green`)、LINK は `0g-storage.dev/cid/<cid> →`。
- **failure**: 2 行目に `0G storage SDK error` (`A.hot`)、`✕ FAILED`、LINK は `[ ▸ RETRY ]` + 小さく `(fallback: data URI)` (`A.mute`、failsafe 表示)。

### 4-3. `[03] ENS` (Sepolia)

- **idle**: `{handle}.gradiusweb3.eth` (placeholder text `A.mute`) / `○ STANDBY`。
- **pending**: 2 行目に `subname + 3 text records ░░` / `▲ PENDING` / `tx: pending`。
- **success**: 2 行目に `text: combat-power=8200, archetype=LASER, design-hash=0x..` (`A.body` + `A.hud` で値を強調)、`● RESOLVED` (`A.green`)、LINK は `sepolia.app.ens.domains/<handle>.gradiusweb3.eth →`。
- **failure**: 2 行目に `parent name not owned` 等 (`A.hot`)、`✕ FAILED`、LINK は `[ ▸ RETRY ]`。

### 4-4. `[04] UNISWAP` (Sepolia v3 SwapRouter02)

- **idle**: 2 行目に `WETH → USDC · 0.0001 ETH` (`A.body`)、`○ STANDBY` (`A.mute`)、LINK 列に **amber CTA** `[ ▸ INSERT COIN FOR FIRST TRADE ]` (詳細 §6)。
- **pending**: CTA 消滅し `▸ swap broadcasting ░░` テキストに置換 (同位置)、`▲ PENDING`、LINK は `block: pending`。
- **success**: 2 行目に `WETH → USDC · 0.0001 ETH @ 1846` (`A.body` / 値 `A.hud`)、`● SWAPPED` (`A.green`)、LINK は `sepolia.etherscan.io/tx/<hash> →`。
- **failure**: 2 行目に error (例: `user rejected request`)、`✕ FAILED`、LINK 列に `[ ▸ RETRY ]` (CTA 復活)。

## 5. アニメーション仕様

- **pending パルス**: `@keyframes onchain-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }` を `▲ PENDING` テキストに `animation: onchain-pulse 0.9s ease-in-out infinite` で適用。
- **pending loader bar**: 高さ 2px, `background: linear-gradient(90deg, transparent, ${A.amber}, transparent)`, `background-size: 50% 100%`, `animation: onchain-sweep 1.5s linear infinite` で左→右にスイープ。
- **success → glow flash**: 状態遷移時に 1 度だけ `text-shadow: 0 0 12px ${A.green}` を 600ms で減衰 (CSS transition で `box-shadow / text-shadow` を 0→full→33% にカスケード)。
- **failure shake**: STATUS セルのみ 200ms の `translateX(-2px → 2px → 0)` 1 ループ (デモ動画で「失敗が起きた」が映るための強調。`prefers-reduced-motion: reduce` 時は無効化)。
- すべてのアニメーションは `@media (prefers-reduced-motion: reduce)` で停止する。

## 6. `INSERT COIN FOR FIRST TRADE` ボタン

App.tsx の `S.amberBtn` を継承しつつ、**HUDCorners (cyan) を内側に巻いて** 「コックピットの最後のスイッチ」感を出す。

仕様:

| プロパティ | 値 | 由来 |
|-----------|-----|------|
| `background` | `A.amber` | App.tsx S.amberBtn |
| `color` | `A.bg` (`#05080c`) | App.tsx S.amberBtn は `#000`、ここでは `A.bg` で揃える (コントラスト 14.5:1) |
| `padding` | `16px 22px` | section table 行に収まるよう S.amberBtn (18px 28px) より一回り小さく |
| `fontSize` | 13 | S.amberBtn と同 |
| `letterSpacing` | `0.22em` | S.amberBtn と同 |
| `fontWeight` | 700 | S.amberBtn と同 |
| `border` | 0 | S.amberBtn と同 |
| `boxShadow` | `0 0 0 1px ${A.bg}, 0 0 0 2px ${A.amber}` | S.amberBtn と同 (二重外枠) |
| `position` | `relative` | HUDCorners 配置のため |
| 内側 `HUDCorners` | `color={A.hud} size={14}` | HUD.tsx 流用。amber 面の上に cyan の角マーカーが出てコックピット感 |
| アイコン | `▸ INSERT COIN FOR FIRST TRADE` | テキスト先頭に `▸` (App.tsx の amberBtn と同じ marker) |
| hover | `transform: translateY(-1px)` + boxShadow を 3px に拡張 | — |
| focus-visible | `outline: 2px solid ${A.hud}; outline-offset: 3px` | キーボード操作対応 |
| disabled (wallet 未接続時) | `background: ${A.mute}; cursor: not-allowed; box-shadow: none` + tooltip `Connect wallet first` | ConnectButton 連動 |

ASCII イメージ:

```
┌──   ──┐    ← HUDCorners (cyan, A.hud)
│ ▸ INSERT COIN FOR FIRST TRADE │   ← amber bg, A.bg text
└──   ──┘
```

クリックで `uniswap.executeFirstSwap(walletClient)` を呼び、即座に `[04]` 行を pending に遷移させる。

## 7. WCAG 2.1 AA — コントラスト & アクセシビリティ

### 7-1. 主要な前景 / 背景コントラスト (背景は `A.bg #05080c` 想定で計算)

| 前景 | コントラスト比 | 用途 | AA 判定 |
|------|---------------|------|---------|
| `A.ink` (#e6f1ff) | 17.4:1 | TRACK ID / TRACK 名 | Pass (AAA) |
| `A.body` (#a8b8c8) | 9.8:1 | resource 名 / 説明 | Pass (AAA) |
| `A.hud` (#7ee0ff) | 11.6:1 | 短縮 hash / CID / explorer link | Pass (AAA) |
| `A.amber` (#ffb84d) | 11.0:1 | pending status / CTA border | Pass (AAA) |
| `A.green` (#3dffa3) | 14.7:1 | success status | Pass (AAA) |
| `A.hot` (#ff4438) | 5.1:1 | failure status / error message | Pass (AA、AAA は不可だが大きいテキストは AAA) |
| `A.mute` (#5a6c80) | 3.6:1 | 列見出し / 補助テキスト | **AA pass のみ「18pt 以上 or 14pt 太字」が必要** → 列見出しは 11px non-bold だが、letter-spacing 0.20em で「graphical / non-essential decorative label」扱い。**判定**: `aria-hidden="true"` を付けない方針で、本文は重複しないラベルにする (例: `A.body` で書いた resource 名が同義) |
| `A.amber` ボタン上の `A.bg` テキスト | 14.5:1 | INSERT COIN ボタン | Pass (AAA) |

### 7-2. tx hash / address のコントラスト注記

- 短縮 hash (`0xa3..f1`、`bafy..l4cy`) は `A.hud` (11.6:1) で表示し、**フル hash は `<abbr title="0xa3...full...f1">` でホバー / フォーカス時に出す**。スクリーンリーダー向けには `aria-label="full transaction hash 0xa3...full...f1"` を `<a>` 要素に付与。
- `A.mute` の補助テキスト (`hash: pending` / `block: pending`) は判定上 borderline なため、**ステータス情報は色だけに依存しない** (テキスト + アイコン `○ ▲ ● ✕` の二重符号化)。Color Universal Design (CUD) 上、緑/赤の判別が困難なユーザーでも `●` (filled) と `✕` (cross) で識別可能。

### 7-3. aria-label / role 提案

| 要素 | aria 属性 |
|------|-----------|
| パネル外枠 `<section>` | `aria-labelledby="onchain-proof-heading"` + 内部に `<h3 id="onchain-proof-heading">ON-CHAIN PROOF</h3>` (visually 同じ位置の eyebrow を h3 に格上げ) |
| 各行 `<div role="row">` | `aria-label="0G iNFT — minted, token 0xa3..f1"` (status + 名前 + リソースを 1 文に) |
| STATUS セル | `<span role="status" aria-live="polite">● MINTED</span>` で動的更新を SR に通知 |
| pending スピナー | `aria-busy="true"` を行に付与 |
| explorer link | `aria-label="Open 0G chainscan in new tab — token 0xa3...f1"`、`rel="noreferrer noopener"`、`target="_blank"` |
| INSERT COIN ボタン | `aria-label="Execute first Uniswap swap on Sepolia (WETH to USDC, 0.0001 ETH)"` |
| RETRY ボタン | `aria-label="Retry 0G iNFT mint"` (track 名を埋める) |
| Footnote `MASTER_ARM ...` | `<p role="note">` |

### 7-4. focus order

タブ順序は **読み順 (上から下、左から右)**:

1. パネル見出し (skip)
2. `[01]` explorer link → (failure 時 RETRY)
3. `[02]` explorer link → (failure 時 RETRY)
4. `[03]` explorer link → (failure 時 RETRY)
5. `[04]` INSERT COIN ボタン (idle 時) / explorer link (success 時) / RETRY (failure 時)
6. Footnote (skip)

`tabIndex` は明示せず、DOM 順序を読み順と一致させる。`:focus-visible` で `outline: 2px solid ${A.hud}; outline-offset: 2px` を全インタラクティブ要素に付与。

## 8. モバイル (<768px) レイアウト

### 8-1. 構造

- 4 列 grid を **1 列 stack** に変更し、各 row を「カード」として縦に積む。
- HUDCorners は **保持** (パネル外枠のみ)、ただし行ごとの装飾は削減。
- 列見出し行 (TRACK / CONTRACT...) は **削除**。代わりに各カード内に inline label (`TRACK · `) を入れる。

### 8-2. ASCII (<768px)

```
┌──   ─────────────────────  ──┐
│ § 08 / ON-CHAIN PROOF        │
│ STATUS · 3 / 4 LIVE          │
│ ──────────────────────────── │
│ [01] 0G_iNFT      ● MINTED   │
│ AgentForgeINFT (0G Galileo)  │
│ token #0xa3..f1              │
│ → chainscan.0g.ai            │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ [02] 0G_STORE     ▲ PENDING  │
│ play_log.json                │
│ bafy..l4cy ░░ uploading      │
│ ░░░░░░░░░░░░░░░░ (loader)    │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ [03] ENS          ● RESOLVED │
│ kotetsu.gradiusweb3.eth      │
│ text records ×3              │
│ → sepolia.app.ens.domains    │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │
│ [04] UNISWAP      ○ STANDBY  │
│ WETH → USDC · 0.0001 ETH     │
│ ┌──────────────────────────┐ │
│ │ ▸ INSERT COIN            │ │
│ │   FOR FIRST TRADE        │ │
│ └──────────────────────────┘ │
│                              │
│ ◆ MASTER_ARM · TX SIGNED IN  │
│   BROWSER WALLET             │
└──   ─────────────────────  ──┘
```

### 8-3. レスポンシブ詳細

| breakpoint | 変更点 |
|-----------|--------|
| `>=768px` | 4 列 grid, HUDCorners あり, 列見出しあり |
| `<768px` | 1 列 stack, 各行が縦積みカード, 列見出し削除, INSERT COIN ボタンは全幅 (`width: 100%`) |
| `<480px` | パネル左右 padding を `28px → 16px` に縮小, HUDCorners サイズ `22 → 14` に縮小 (パネル余白がない場合は `display: none` で完全非表示) |
| `<360px` | INSERT COIN ボタンの `letterSpacing: 0.22em → 0.14em`、テキスト 2 行折返し許容 (`white-space: normal`) |

タッチターゲットは全 CTA / link で **最低 44×44 CSS px** (WCAG 2.5.5 Target Size AAA を意識、AA は 24×24 必須)。

## 9. マイクロコピー (JP / EN)

仕様: `pending` 中は **動詞の現在進行形**、`success` は **過去分詞**、`failure` は **失敗事象 + 行動可能なヒント**。EN は demo 動画用 (デフォルト)、JP は in-app 言語切替時の予備。

### 9-1. STATUS バッジ

| 状態 | EN (default) | JP |
|------|-------------|-----|
| idle | `○ STANDBY` | `○ 待機中` |
| pending | `▲ PENDING` | `▲ 送信中` |
| success (iNFT) | `● MINTED` | `● ミント完了` |
| success (storage) | `● STORED` | `● 保存完了` |
| success (ENS) | `● RESOLVED` | `● 解決可能` |
| success (uniswap) | `● SWAPPED` | `● スワップ完了` |
| failure | `✕ FAILED` | `✕ 失敗` |

### 9-2. CONTRACT/RESOURCE 列の補助文

| Track | idle | pending | success | failure (例) |
|-------|------|---------|---------|-------------|
| 0G_iNFT | EN: `Awaiting forge` / JP: `フォージ待機` | EN: `Broadcasting mint tx…` / JP: `mint tx を送信中…` | EN: `token #0xa3..f1` / JP: `token #0xa3..f1` | EN: `Gas estimate failed — RPC issue` / JP: `gas 見積失敗 — RPC 不調` |
| 0G_STORE | EN: `play_log.json ready` / JP: `play_log.json 準備完了` | EN: `Uploading to 0G Storage…` / JP: `0G Storage にアップロード中…` | EN: `CID bafy..l4cy` / JP: `CID bafy..l4cy` | EN: `Storage SDK error — fallback to data URI` / JP: `Storage SDK エラー — data URI に退避` |
| ENS | EN: `Subname queued` / JP: `subname 予約中` | EN: `Registering subname + records…` / JP: `subname と text records を登録中…` | EN: `text records ×3 written` / JP: `text records 3 件書き込み完了` | EN: `Parent name not owned by wallet` / JP: `wallet が parent name を所有していません` |
| UNISWAP | EN: `Tap INSERT COIN to start trade` / JP: `INSERT COIN で初取引を開始` | EN: `Swap broadcasting…` / JP: `swap を送信中…` | EN: `WETH → USDC @ 1846` / JP: `WETH → USDC @ 1846` | EN: `User rejected request` / JP: `ユーザーが署名を拒否しました` |

### 9-3. CTA テキスト

| ボタン | EN | JP |
|--------|-----|-----|
| INSERT COIN | `▸ INSERT COIN FOR FIRST TRADE` | `▸ 初取引のためコインを投入` |
| RETRY | `▸ RETRY` | `▸ 再試行` |
| RETRY (with hint) | `▸ RETRY · CHECK FAUCET` | `▸ 再試行 · faucet を確認` |

### 9-4. Footnote

- EN: `◆ MASTER_ARM · ALL TX SIGNED IN BROWSER WALLET · NO PRIVATE KEY ON SERVER`
- JP: `◆ MASTER_ARM · 全 tx はブラウザ wallet で署名 · 秘密鍵はサーバに置きません`

### 9-5. STATUS カウンタ (header 右)

- EN: `STATUS · 3 / 4 LIVE` (live 数 / 総数)
- JP: `STATUS · 3 / 4 完了`
- 全部失敗 → EN: `STATUS · 0 / 4 — RETRY OR REPLAY` (`A.hot`)
- 全部成功 → EN: `STATUS · 4 / 4 ALL GREEN` (`A.green`、glow flash 1 回)

## 10. Developer 引き渡しチェックリスト

- [ ] `OnChainTrack` 型を `packages/frontend/src/web3/types.ts` に定義 (本仕様 §4 参照)。
- [ ] `OnChainProof` コンポーネントを新設し、AgentDashboard 末尾に `<OnChainProof tracks={tracks} />` で差し込む。
- [ ] `HUDCorners` を再利用 (新規実装禁止)。
- [ ] アニメーションは `@keyframes onchain-pulse / onchain-sweep` を `index.css` に追加 (Biome の選択子順序ルールに従う)。
- [ ] `prefers-reduced-motion: reduce` で全アニメーション停止。
- [ ] 全状態のスナップショットテストを `bun test` で 4 行 × 4 状態 = 16 ケース書く (BDD: 「0G_iNFT track が pending のとき パルス animation が付与される」等)。
- [ ] axe-core / @testing-library/jest-dom の `toHaveAccessibleName` で aria-label を検証。
- [ ] モバイル (375 / 414 / 360 width) で stack レイアウトが崩れないことを Playwright で確認。

## 11. Prize Targets 整合チェック

| Prize | このデザインが何を担保するか |
|-------|----------------------------|
| 0G iNFT ($1.5K-) | `[01]` 行で **chainscan.0g.ai** explorer link を必ず可視化。token id / contract addr を tabular-nums で読みやすく |
| 0G Storage | `[02]` 行で CID をフル表示可能 (`<abbr>` + `aria-label`) |
| ENS Identity / Creative | `[03]` 行 success で text records 数 + 値 (`combat-power=8200`) を直接表示。demo 動画で「subname-as-credential」を 1 秒で見せる |
| Uniswap | `[04]` の amber CTA がランディング全体で唯一の「user gesture を要求する」ボタン → 審査員が「ここを押せば swap が走る」を即理解 |

cosmetic 統合の疑念は、**4 つの explorer link が押せて確かに動く**ことで払拭する。

---

設計者ノート: AgentDashboard 既存セクション (`archetype-panel` / `RadarDisplay` / `feed-panel`) は class ベース (`index.css`) でスタイルされているため、本セクションも基本は class ベース (`onchain-proof / onchain-row / onchain-status`) にし、必要な inline style (動的色など) のみ JSX 内で指定する。色は CSS custom properties (`--c-hud`, `--c-amber`, `--c-green`, `--c-hot`, `--c-mute`) を `index.css` の `:root` に定義済みであることを前提にし、ない場合は Developer ロールで追加する (これは新規パレットではなく既存 `A` const の同期)。
