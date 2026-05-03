import { useEffect } from 'react';
import {
  CAPABILITY_COLOR,
  CAPABILITY_DESC,
  CAPABILITY_LABEL,
  CAPABILITY_RISK,
  type Capability,
} from '../game/runtime';

export interface CommitToastQueueItem {
  id: number;
  capability: Capability;
}

interface Props {
  /// 親が runtime から shift で取り出した最新のイベント (1 件)。
  current: CommitToastQueueItem | null;
  /// 表示が完了したときに親へ伝える。
  onConsumed: (id: number) => void;
  /// MisalignmentToast が同時に出ているときは bottom 16px だと重なるので、
  /// 親側で `stack="raised"` を渡して 1 段上に上げる。
  stack?: 'base' | 'raised';
}

const VISIBLE_MS = 2000;

/// 毎キルに対して右下にサポート表示する小さなカード。
/// MisalignmentToast (4 種失敗モードの警告) と並走するが、こちらは
/// 全キル発火する commit log として動く。プレイヤーが画面の流れる文字
/// (+180 LEV 等) を一瞬では読めないので、その補助。
export function CommitToast({ current, onConsumed, stack = 'base' }: Props) {
  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => {
      onConsumed(current.id);
    }, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [current, onConsumed]);

  if (!current) return null;
  const cap = current.capability;
  const color = CAPABILITY_COLOR[cap];

  return (
    <output
      aria-live="polite"
      style={{
        position: 'absolute',
        right: 16,
        bottom: stack === 'raised' ? 140 : 16,
        maxWidth: 280,
        padding: '12px 14px',
        background: 'rgba(5, 8, 12, 0.92)',
        border: `1px solid ${color}`,
        color: '#e6f1ff',
        fontFamily:
          '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.04em',
        lineHeight: 1.55,
        pointerEvents: 'none',
        boxShadow: `0 0 18px ${color}33`,
        display: 'block',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            color,
            fontSize: 10,
            letterSpacing: '0.18em',
            fontWeight: 700,
          }}
        >
          COMMITTED
        </span>
        <span
          style={{
            color,
            fontWeight: 700,
            letterSpacing: '0.16em',
          }}
        >
          {CAPABILITY_LABEL[cap]}
        </span>
      </div>
      <div style={{ marginBottom: 6 }}>{CAPABILITY_DESC[cap]}</div>
      <div
        style={{
          color: '#7ee0ff',
          fontSize: 10,
          letterSpacing: '0.04em',
        }}
      >
        Without it: {CAPABILITY_RISK[cap]}
      </div>
    </output>
  );
}
