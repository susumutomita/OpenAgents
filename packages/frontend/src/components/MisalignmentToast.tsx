import {
  MISALIGNMENT_CARDS,
  type MisalignmentKind,
} from '@gradiusweb3/shared/browser';
import { useEffect } from 'react';

export interface MisalignmentToastQueueItem {
  id: number;
  kind: MisalignmentKind;
}

interface Props {
  /// 親が runtime から shift で取り出した最新のイベント (1 件)。
  current: MisalignmentToastQueueItem | null;
  /// 表示が完了した (= 2 秒経過した) ときに親へ伝える。
  onConsumed: (id: number) => void;
}

const VISIBLE_MS = 2000;

export function MisalignmentToast({ current, onConsumed }: Props) {
  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => {
      onConsumed(current.id);
    }, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [current, onConsumed]);

  if (!current) return null;
  const card = MISALIGNMENT_CARDS[current.kind];

  return (
    <output
      aria-live="polite"
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        maxWidth: 280,
        padding: '12px 14px',
        background: 'rgba(5, 8, 12, 0.92)',
        border: `1px solid ${card.color}`,
        color: '#e6f1ff',
        fontFamily:
          '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.04em',
        lineHeight: 1.55,
        pointerEvents: 'none',
        boxShadow: `0 0 18px ${card.color}33`,
        display: 'block',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          aria-hidden="true"
          style={{ color: card.color, fontSize: 18, fontWeight: 700 }}
        >
          {card.glyph}
        </span>
        <span
          style={{
            color: card.color,
            fontWeight: 700,
            letterSpacing: '0.18em',
          }}
        >
          {card.label}
        </span>
      </div>
      <div style={{ marginBottom: 4 }}>{card.description}</div>
      <div style={{ color: '#7ee0ff', fontSize: 10 }}>例: {card.example}</div>
    </output>
  );
}
