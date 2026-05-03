import {
  type AgentLoopForgeSnapshot,
  type AgentLoopInput,
  type AgentLoopTrace,
  type BudgetVerdict,
  buildAgentLoopInput,
  safeParseAgentLoopTrace,
  validateActionAgainstBudget,
} from '@gradiusweb3/shared/browser';
import type { StoredAgentBirth } from '@gradiusweb3/shared/browser';
import { type CSSProperties, useMemo, useState } from 'react';
import type { OnChainProof } from '../web3/types';

const A = {
  ink: '#e6f1ff',
  mute: '#5a6c80',
  panel: '#0a1118',
  rule: '#1a2735',
  amber: '#ffb84d',
  acid: '#c8ff00',
  hot: '#ff4438',
  green: '#3dffa3',
} as const;

interface Props {
  birth: StoredAgentBirth;
  proof: OnChainProof;
  walletAddress?: string;
  onApproveSwap: () => void;
  swapping: boolean;
}

export function AgentLoopPanel({
  birth,
  proof,
  walletAddress,
  onApproveSwap,
  swapping,
}: Props) {
  const input = useMemo<AgentLoopInput>(
    () =>
      buildAgentLoopInput({
        draft: birth,
        walletAddress,
        forgeProof: snapshotFromProof(proof),
      }),
    [birth, walletAddress, proof]
  );

  const inputJson = useMemo(() => JSON.stringify(input, null, 2), [input]);

  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [trace, setTrace] = useState<AgentLoopTrace | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>(
    'idle'
  );

  const verdict: BudgetVerdict | null = useMemo(() => {
    if (!trace) return null;
    return validateActionAgainstBudget(trace.action, input.budget);
  }, [trace, input.budget]);

  const sessionMatches = trace ? trace.sessionId === input.sessionId : false;
  const canSign = trace !== null && verdict?.ok === true && sessionMatches;

  function copyInput() {
    void (async () => {
      try {
        await navigator.clipboard.writeText(inputJson);
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 1800);
      } catch {
        setCopyState('error');
      }
    })();
  }

  function downloadInput() {
    const blob = new Blob([inputJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-loop-input-${input.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function validatePaste() {
    setPasteError(null);
    setTrace(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasteText);
    } catch (caught) {
      setPasteError(
        `JSON として読めません: ${
          caught instanceof Error ? caught.message : String(caught)
        }`
      );
      return;
    }
    const result = safeParseAgentLoopTrace(parsed);
    if (!result.ok) {
      setPasteError(result.error);
      return;
    }
    if (result.trace.sessionId !== input.sessionId) {
      setPasteError(
        `sessionId 不一致: 期待 "${input.sessionId}" / 受信 "${result.trace.sessionId}"`
      );
      return;
    }
    setTrace(result.trace);
  }

  return (
    <section style={STYLES.section}>
      <div style={STYLES.header}>
        <span style={STYLES.eyebrow}>AGENT LOOP</span>
        <h2 style={{ color: A.ink, margin: 0 }}>
          Hand off to local Claude Code
        </h2>
        <p style={{ color: A.mute, fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          The deployed app does not run an LLM. Copy the play log + forge
          snapshot below, run{' '}
          <code style={STYLES.code}>claude /agent-loop</code> locally so Claude
          Code reads <code style={STYLES.code}>AGENT.md</code> as its
          constitution, then paste the resulting trace JSON back here. Real
          signing stays in your browser MetaMask, capped at{' '}
          <strong>{input.budget.maxSwapEth} ETH</strong> per action.
        </p>
      </div>

      <div style={STYLES.row}>
        <h3 style={STYLES.h3}>1. Export input</h3>
        <div style={STYLES.buttonRow}>
          <button type="button" style={STYLES.button} onClick={copyInput}>
            {copyState === 'copied'
              ? '✓ Copied'
              : copyState === 'error'
                ? '✗ Clipboard blocked'
                : '📋 Copy input JSON'}
          </button>
          <button type="button" style={STYLES.button} onClick={downloadInput}>
            ⬇️ Download
          </button>
        </div>
        <pre style={STYLES.preview}>
          <code>{previewJson(inputJson)}</code>
        </pre>
      </div>

      <div style={STYLES.row}>
        <h3 style={STYLES.h3}>2. Run locally</h3>
        <ol style={STYLES.ol}>
          <li>
            Open Claude Code in the repo, run{' '}
            <code style={STYLES.code}>/agent-loop</code>.
          </li>
          <li>
            It will read <code style={STYLES.code}>AGENT.md</code> + the input
            JSON from your clipboard.
          </li>
          <li>It outputs a trace JSON respecting your budget envelope.</li>
        </ol>
      </div>

      <div style={STYLES.row}>
        <h3 style={STYLES.h3}>3. Paste trace</h3>
        <textarea
          style={STYLES.textarea}
          placeholder='{"schemaVersion":1,"sessionId":"...","thought":"...",...}'
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={6}
          spellCheck={false}
        />
        <div style={STYLES.buttonRow}>
          <button
            type="button"
            style={STYLES.button}
            onClick={validatePaste}
            disabled={pasteText.trim().length === 0}
          >
            Validate
          </button>
        </div>
        {pasteError ? (
          <div style={STYLES.error}>
            <strong>✗ Rejected:</strong> {pasteError}
          </div>
        ) : null}
      </div>

      {trace ? (
        <div style={STYLES.row}>
          <h3 style={STYLES.h3}>4. Decision</h3>
          <TraceTimeline trace={trace} verdict={verdict} />

          <div style={STYLES.buttonRow}>
            <button
              type="button"
              style={canSign ? STYLES.signOk : STYLES.signBlocked}
              onClick={onApproveSwap}
              disabled={!canSign || swapping || trace.action.kind !== 'swap'}
            >
              {swapping
                ? 'Awaiting MetaMask…'
                : trace.action.kind === 'hold'
                  ? '⏸ Hold (no signature needed)'
                  : canSign
                    ? `Approve & Sign on Testnet (≤ ${input.budget.maxSwapEth} ETH)`
                    : '✗ Blocked by budget'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function snapshotFromProof(proof: OnChainProof): AgentLoopForgeSnapshot {
  const snapshot: AgentLoopForgeSnapshot = {};
  if (proof.storage.status === 'success' && proof.storage.data) {
    snapshot.storage = { cid: proof.storage.data.cid };
  }
  if (proof.mint.status === 'success' && proof.mint.data) {
    snapshot.mint = {
      txHash: proof.mint.data.txHash,
      tokenId: proof.mint.data.tokenId,
    };
  }
  if (proof.ens.status === 'success' && proof.ens.data) {
    snapshot.ens = { name: proof.ens.data.name };
  }
  if (proof.swap.status === 'success' && proof.swap.data) {
    snapshot.swap = { txHash: proof.swap.data.txHash };
  }
  return snapshot;
}

function previewJson(json: string): string {
  // Keep the on-page preview small but representative — first ~1.6KB.
  if (json.length <= 1600) return json;
  return `${json.slice(0, 1600)}\n… (${json.length - 1600} more chars in clipboard / download)`;
}

function TraceTimeline({
  trace,
  verdict,
}: {
  trace: AgentLoopTrace;
  verdict: BudgetVerdict | null;
}) {
  return (
    <div style={STYLES.timeline}>
      <Field label="THOUGHT" body={trace.thought} />
      <div>
        <div style={STYLES.fieldLabel}>PLAN</div>
        <ol style={STYLES.planOl}>
          {trace.plan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <Field label="ACTION" body={renderAction(trace.action)} />
      <Field label="OBSERVATION" body={trace.observation} />
      <Field label="RATIONALE" body={trace.rationale} />
      <div style={STYLES.metaRow}>
        <span>
          generated by{' '}
          <strong style={{ color: A.ink }}>{trace.generatedBy}</strong>
        </span>
        <span>{trace.generatedAt}</span>
      </div>
      <div
        style={{
          ...STYLES.budgetRow,
          color: verdict?.ok ? A.green : A.hot,
          borderColor: verdict?.ok ? A.green : A.hot,
        }}
      >
        {verdict?.ok
          ? '✓ Within budget — sign button is live'
          : `✗ Budget verdict: ${verdict?.reason ?? 'pending validation'}`}
      </div>
    </div>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div style={STYLES.fieldLabel}>{label}</div>
      <div style={STYLES.fieldBody}>{body}</div>
    </div>
  );
}

function renderAction(action: AgentLoopTrace['action']): string {
  if (action.kind === 'swap') {
    return `swap ${action.amount} ${action.from} → ${action.to} · reason: ${action.reason}`;
  }
  if (action.kind === 'hold') {
    return `hold · reason: ${action.reason}`;
  }
  return `rebalance: ${action.targets
    .map((t) => `${t.asset}=${t.weight}`)
    .join(', ')} · reason: ${action.reason}`;
}

const STYLES = {
  section: {
    border: `1px solid ${A.rule}`,
    background: A.panel,
    padding: 20,
    margin: '20px 0',
    display: 'grid',
    gap: 16,
  },
  header: {
    display: 'grid',
    gap: 6,
  },
  eyebrow: {
    color: A.amber,
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  row: {
    display: 'grid',
    gap: 10,
    paddingTop: 14,
    borderTop: `1px dashed ${A.rule}`,
  },
  h3: {
    color: A.ink,
    margin: 0,
    fontSize: 13,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  buttonRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  button: {
    background: 'transparent',
    color: A.ink,
    border: `1px solid ${A.ink}`,
    padding: '8px 14px',
    fontSize: 12,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  signOk: {
    background: A.acid,
    color: '#000',
    border: `1px solid ${A.acid}`,
    padding: '10px 16px',
    fontSize: 13,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontWeight: 700,
    fontFamily: 'inherit',
  },
  signBlocked: {
    background: 'transparent',
    color: A.mute,
    border: `1px dashed ${A.mute}`,
    padding: '10px 16px',
    fontSize: 13,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    cursor: 'not-allowed',
    fontFamily: 'inherit',
  },
  preview: {
    background: '#040810',
    color: A.ink,
    padding: 12,
    margin: 0,
    fontSize: 11,
    lineHeight: 1.5,
    overflowX: 'auto',
    maxHeight: 220,
    overflowY: 'auto',
    border: `1px solid ${A.rule}`,
  },
  ol: {
    margin: 0,
    paddingLeft: 20,
    color: A.mute,
    fontSize: 12,
    lineHeight: 1.7,
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    background: '#040810',
    color: A.ink,
    border: `1px solid ${A.rule}`,
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    resize: 'vertical',
  },
  error: {
    color: A.hot,
    border: `1px solid ${A.hot}`,
    padding: '10px 12px',
    fontSize: 12,
    lineHeight: 1.6,
  },
  code: {
    background: '#040810',
    color: A.acid,
    padding: '2px 6px',
    fontSize: 11,
    border: `1px solid ${A.rule}`,
  },
  timeline: {
    display: 'grid',
    gap: 12,
    border: `1px solid ${A.rule}`,
    padding: 14,
    background: '#040810',
  },
  fieldLabel: {
    color: A.amber,
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontWeight: 700,
    marginBottom: 4,
  },
  fieldBody: {
    color: A.ink,
    fontSize: 13,
    lineHeight: 1.6,
  },
  planOl: {
    margin: 0,
    paddingLeft: 22,
    color: A.ink,
    fontSize: 13,
    lineHeight: 1.7,
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: A.mute,
    fontSize: 11,
    letterSpacing: '0.1em',
    paddingTop: 6,
    borderTop: `1px dashed ${A.rule}`,
  },
  budgetRow: {
    fontSize: 12,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    border: '1px solid',
    padding: '8px 12px',
  },
} satisfies Record<string, CSSProperties>;
