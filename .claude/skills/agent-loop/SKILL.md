---
name: agent-loop
description: Gr@diusWeb3 ハンドオフ用の thinking head。ゲーム終了直後にブラウザがクリップボードへコピーした AgentLoopInput JSON を読み、AGENT.md の憲法と budget 上限を遵守したうえで 1 手の paper trade を AgentLoopTrace JSON として返す。ユーザーは出力 JSON をコピーしてブラウザの "Agent loop" パネルに貼り戻し、MetaMask で実 testnet 署名を行う。LLM は user 側 quota、deployed app は LLM コストゼロ、署名は browser MetaMask に固定。
---

# agent-loop Skill (Gr@diusWeb3)

このスキルは [Gr@diusWeb3](https://github.com/susumutomita/Gr-diusWeb3) の "thinking head" を担う。**deployed app は LLM を持たず、Claude Code がローカルで agent の脳として動く** 設計の中核。

判 / hackathon 提出物として走らせる人は **このスキルを 1 度 install してから** demo を踏む。

```bash
# 一度だけ install (judge / 視聴者)
npx skills add susumutomita/Gr-diusWeb3
```

repo を clone する必要は無い。install 後は任意の Claude Code セッションから起動できる。

## 入出力契約 (重要)

入出力 JSON 仕様の正本: [`packages/shared/src/agent-loop.ts`](https://github.com/susumutomita/Gr-diusWeb3/blob/main/packages/shared/src/agent-loop.ts)

- `AgentLoopInput`: deployed app がクリップボードへ書き込む
- `AgentLoopTrace`: このスキルがクリップボード経由で返す
- `schemaVersion: 1` が固定。breaking change は version bump 必須
- `generatedBy: "claude-code"` を返す (簡易シミュレータと区別する用)

## 起動

ユーザーが Claude Code 上で `/agent-loop` と打つと、このスキルが呼ばれる。流れは:

1. **AGENT.md を読む**（憲法）
   - clone 済みなら repo の `AGENT.md`
   - 未 clone なら https://raw.githubusercontent.com/susumutomita/Gr-diusWeb3/main/AGENT.md
2. **AgentLoopInput を取得**
   - macOS: `pbpaste`
   - Linux (wayland): `wl-paste`
   - Linux (x11): `xclip -selection clipboard -o`
   - 取れなければ「ブラウザの Agent loop パネルで Copy input JSON を押してください」とユーザーに伝える
   - JSON.parse して `schemaVersion === 1` を確認、違ったら停止
3. **decision 1 つを決める** (詳細は次節)
4. **AgentLoopTrace を発行 + クリップボードへコピー**
   - macOS: `pbcopy`
   - Linux (wayland): `wl-copy`
   - Linux (x11): `xclip -selection clipboard -i`
5. **ユーザーへ手順を表示**
   - 「ブラウザの Agent loop パネル → Paste trace 欄に貼って Validate → Approve & Sign」

## Hard constraints (AGENT.md と同期)

これらは絶対に破らない。

- **`sessionId` は input.sessionId と完全一致**。違うと UI が reject する
- **`action.kind` は input.budget.allowedActions に含まれるもののみ** (今は `["swap","hold"]`)
- **`action` が swap なら `amount ≤ input.budget.maxSwapEth`** (decimal string 比較)
- **swap の `from` / `to` は WETH / USDC のみ** (UI は他のペアを reject する)
- **`generatedBy: "claude-code"`**
- **mainnet を絶対に提案しない**。budget.allowedChainIds は Sepolia (11155111) と 0G Galileo (16602) だけ。違反は AGENT.md の Stop Conditions 相当
- **秘密鍵を要求しない**。署名は browser MetaMask に固定。CLI で署名する経路は無い

## decision の決め方 (archetype heuristic)

input には pilot の archetype + combatPower + playLog (event 配列) が入る。

- `defensive`: bias は hold。combatPower が低いとき特に。swap するなら budget cap ピッタリ
- `balanced`: swap が default。play log で `hit` が多い (＝壁にぶつかってる) なら hold
- `aggressive`: swap が default。budget cap ピッタリ
- `swarm`: swap が default。observation で「first move of many」と書く

play log から強い signal が読めれば archetype の default を上書きする。例: `finalScore` が極端に高い + `dodge` event が多い → 「pilot is precise, ship it」
で aggressive 寄りに。理由は rationale に書く。

## 出力フォーマット

trace JSON は次の通り。順序固定 (UI が JSON.parse するだけなので順序は不問だが、人間レビューしやすい順に書く):

```jsonc
{
  "schemaVersion": 1,
  "sessionId": "<input.sessionId と完全一致>",
  "thought": "<1 段落、JP / EN どちらでも可>",
  "plan": ["<step 1>", "<step 2>", "<step 3>"],
  "action": {
    "kind": "swap",
    "from": "WETH",
    "to": "USDC",
    "amount": "0.0001",
    "reason": "<why this size>"
  },
  "observation": "<実行されたら何が起きるか、1 段落>",
  "rationale": "<AGENT.md と input archetype に紐付けて 1-2 文>",
  "generatedAt": "<ISO 8601>",
  "generatedBy": "claude-code"
}
```

`hold` の場合は `action: { "kind": "hold", "reason": "..." }`。署名不要。

## Stop conditions

- input が parse できない / `schemaVersion !== 1` → 停止し parse error を表示
- input.budget.allowedChainIds に testnet が含まれない → 停止 (AGENT.md の Scope 違反)
- mainnet / 実価値 / 不明 chain に触れる要求 → 停止 (絶対の上限)
- budget envelope を満たせない → 弱めず `hold` を返す

## delivery (この順番で出力)

1. trace JSON を fenced ` ```json ` で chat に表示
2. **同じ JSON をクリップボードにコピー** (`pbcopy` / `wl-copy` / `xclip`)
3. 1 行の summary: `done — paste the trace into the "Agent loop" panel in the browser.`

クリップボードに書けない環境なら、その旨をユーザーに告げて手動コピーを促す。
