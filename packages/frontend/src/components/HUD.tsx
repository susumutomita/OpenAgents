import { type CSSProperties, memo } from 'react';

const HUD_CYAN = '#7ee0ff';
const HUD_AMBER = '#ffb84d';
const HUD_MUTE = '#5a6c80';

function HUDCornersImpl({
  color = HUD_CYAN,
  size = 22,
}: { color?: string; size?: number }) {
  const lineStyle: CSSProperties = {
    position: 'absolute',
    background: color,
  };
  return (
    <>
      <span
        style={{ ...lineStyle, top: 0, left: 0, width: size, height: 1.4 }}
      />
      <span
        style={{ ...lineStyle, top: 0, left: 0, width: 1.4, height: size }}
      />
      <span
        style={{ ...lineStyle, top: 0, right: 0, width: size, height: 1.4 }}
      />
      <span
        style={{ ...lineStyle, top: 0, right: 0, width: 1.4, height: size }}
      />
      <span
        style={{ ...lineStyle, bottom: 0, left: 0, width: size, height: 1.4 }}
      />
      <span
        style={{ ...lineStyle, bottom: 0, left: 0, width: 1.4, height: size }}
      />
      <span
        style={{ ...lineStyle, bottom: 0, right: 0, width: size, height: 1.4 }}
      />
      <span
        style={{ ...lineStyle, bottom: 0, right: 0, width: 1.4, height: size }}
      />
    </>
  );
}

function ReticleImpl({
  size = 120,
  label = 'TGT-LCK',
  color = HUD_AMBER,
}: { size?: number; label?: string; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{ display: 'block' }}
      role="img"
      aria-label={label}
    >
      <g stroke={color} fill="none" strokeWidth="1.2">
        <rect x="14" y="14" width="92" height="92" />
        <path d="M 14 30 L 6 30 L 6 14 L 14 14" />
        <path d="M 106 30 L 114 30 L 114 14 L 106 14" />
        <path d="M 14 90 L 6 90 L 6 106 L 14 106" />
        <path d="M 106 90 L 114 90 L 114 106 L 106 106" />
        <circle cx="60" cy="60" r="14" />
        <path d="M 60 38 L 60 50 M 60 70 L 60 82 M 38 60 L 50 60 M 70 60 L 82 60" />
        <circle cx="60" cy="60" r="2" fill={color} />
      </g>
      <text
        x="60"
        y="13"
        fontFamily="JetBrains Mono"
        fontSize="8"
        fill={color}
        textAnchor="middle"
        letterSpacing="2"
      >
        {label}
      </text>
    </svg>
  );
}

function CalloutImpl({
  x,
  y,
  label,
  sub,
  color = HUD_CYAN,
  flip = false,
}: {
  x: string;
  y: string;
  label: string;
  sub: string;
  color?: string;
  flip?: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10,
        color,
        letterSpacing: '0.18em',
        textAlign: flip ? 'right' : 'left',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 90,
          height: 1,
          background: `linear-gradient(90deg, ${color}, transparent)`,
          marginBottom: 6,
          marginLeft: flip ? 'auto' : 0,
          transform: flip ? 'scaleX(-1)' : 'none',
        }}
      />
      <div style={{ fontWeight: 700, letterSpacing: '0.24em' }}>{label}</div>
      <div style={{ color: HUD_MUTE, marginTop: 3, letterSpacing: '0.1em' }}>
        {sub}
      </div>
    </div>
  );
}

export const HUDCorners = memo(HUDCornersImpl);
export const Reticle = memo(ReticleImpl);
export const Callout = memo(CalloutImpl);

export const HUD = {
  cyan: HUD_CYAN,
  amber: HUD_AMBER,
  mute: HUD_MUTE,
} as const;
