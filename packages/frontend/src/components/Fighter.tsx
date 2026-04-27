import { memo } from 'react';

const HUD = '#7ee0ff';
const HUD_DIM = '#3a8aa8';

function FighterImpl({ width = 880 }: { width?: number }) {
  const aspect = 880 / 560;
  const h = width / aspect;

  return (
    <svg
      viewBox="0 0 880 560"
      width={width}
      height={h}
      style={{ display: 'block' }}
      role="img"
      aria-label="GR-15 Eagle technical blueprint"
    >
      <defs>
        <linearGradient id="fuse" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#152230" />
          <stop offset="0.5" stopColor="#0a1320" />
          <stop offset="1" stopColor="#152230" />
        </linearGradient>
        <linearGradient id="wing" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#0e1a26" />
          <stop offset="1" stopColor="#162534" />
        </linearGradient>
        <radialGradient id="canopy" cx="0.4" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#9be8ff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#1f6a8c" stopOpacity="0.6" />
          <stop offset="1" stopColor="#0a1822" stopOpacity="0.95" />
        </radialGradient>
        <linearGradient id="exhaust" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ff6a1a" stopOpacity="0" />
          <stop offset="0.6" stopColor="#ff8a3d" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd28a" stopOpacity="1" />
        </linearGradient>
      </defs>

      <g>
        <ellipse cx="800" cy="252" rx="80" ry="9" fill="url(#exhaust)" />
        <ellipse cx="800" cy="308" rx="80" ry="9" fill="url(#exhaust)" />
      </g>

      <g stroke={HUD} fill="#0c1622" strokeWidth="1.4" strokeLinejoin="miter">
        <path
          d="M 360 130 L 540 215 L 720 215 L 760 240 L 540 260 L 380 260 Z"
          fill="#0c1825"
        />
        <path
          d="M 360 430 L 540 345 L 720 345 L 760 320 L 540 300 L 380 300 Z"
          fill="#0c1825"
        />

        <path d="M 600 195 L 705 165 L 760 175 L 720 220 Z" fill="#0a1420" />
        <path d="M 600 365 L 705 395 L 760 385 L 720 340 Z" fill="#0a1420" />

        <path d="M 615 215 L 690 195 L 720 220 L 660 240 Z" fill="#0a1622" />
        <path d="M 615 345 L 690 365 L 720 340 L 660 320 Z" fill="#0a1622" />

        <path
          d="M 80 280 C 60 280, 60 278, 80 278 M 80 278 L 240 268 L 320 263 L 400 261 L 540 260 C 660 260, 720 264, 780 270 L 815 280 L 780 290 C 720 296, 660 300, 540 300 L 400 299 L 320 297 L 240 292 L 80 282 Z"
          fill="url(#fuse)"
          stroke={HUD}
          strokeWidth="1.6"
        />

        <path d="M 815 280 L 845 280 L 815 285 Z" fill="#0a1622" />
        <path d="M 815 280 L 845 280 L 815 275 Z" fill="#0e1c2a" />

        <path d="M 760 273 L 760 287" stroke={HUD_DIM} strokeWidth="0.8" />
        <path d="M 740 271 L 740 289" stroke={HUD_DIM} strokeWidth="0.6" />

        <ellipse
          cx="640"
          cy="280"
          rx="60"
          ry="14"
          fill="url(#canopy)"
          stroke={HUD}
          strokeWidth="1.2"
        />
        <path
          d="M 605 280 Q 640 272 685 278"
          stroke={HUD}
          strokeWidth="0.8"
          fill="none"
          opacity="0.7"
        />
        <path
          d="M 605 280 Q 640 288 685 282"
          stroke={HUD}
          strokeWidth="0.8"
          fill="none"
          opacity="0.7"
        />
        <path d="M 580 280 L 700 280" stroke={HUD_DIM} strokeWidth="0.6" />

        <path
          d="M 480 225 L 560 225 L 575 250 L 480 250 Z"
          fill="#08121c"
          stroke={HUD}
          strokeWidth="1.2"
        />
        <path
          d="M 480 335 L 560 335 L 575 310 L 480 310 Z"
          fill="#08121c"
          stroke={HUD}
          strokeWidth="1.2"
        />
        <path d="M 488 232 L 565 232 L 572 248 L 488 248 Z" fill="#040a12" />
        <path d="M 488 328 L 565 328 L 572 312 L 488 312 Z" fill="#040a12" />

        <g>
          <ellipse
            cx="200"
            cy="252"
            rx="22"
            ry="14"
            fill="#070d14"
            stroke={HUD}
            strokeWidth="1.4"
          />
          <ellipse cx="200" cy="252" rx="14" ry="9" fill="#1a0a05" />
          <ellipse cx="200" cy="252" rx="7" ry="4" fill="#ff7a1a" />
          <ellipse
            cx="200"
            cy="308"
            rx="22"
            ry="14"
            fill="#070d14"
            stroke={HUD}
            strokeWidth="1.4"
          />
          <ellipse cx="200" cy="308" rx="14" ry="9" fill="#1a0a05" />
          <ellipse cx="200" cy="308" rx="7" ry="4" fill="#ff7a1a" />
        </g>

        <path d="M 230 280 L 760 280" stroke={HUD_DIM} strokeWidth="0.7" />

        <g stroke={HUD_DIM} strokeWidth="0.6" fill="none" opacity="0.85">
          <path d="M 320 263 L 320 297" />
          <path d="M 400 261 L 400 299" />
          <path d="M 480 260 L 480 300" />
          <path d="M 560 260 L 560 300" />
          <path d="M 640 260 L 640 300" />
          <path d="M 720 263 L 720 297" />
          <path d="M 420 250 L 540 230" />
          <path d="M 420 310 L 540 330" />
          <path d="M 460 252 L 600 222" />
          <path d="M 460 308 L 600 338" />
          <path d="M 500 254 L 660 220" />
          <path d="M 500 306 L 660 340" />
        </g>

        <g fill={HUD_DIM} opacity="0.7">
          {Array.from({ length: 22 }).map((_, i) => {
            const cx = 240 + i * 22;
            return <circle key={`r1-${cx}`} cx={cx} cy="265" r="0.7" />;
          })}
          {Array.from({ length: 22 }).map((_, i) => {
            const cx = 240 + i * 22;
            return <circle key={`r2-${cx}`} cx={cx} cy="295" r="0.7" />;
          })}
        </g>

        <g>
          <g fill="#0d1825" stroke={HUD} strokeWidth="1">
            <rect x="540" y="218" width="6" height="6" />
            <rect x="600" y="220" width="6" height="6" />
            <rect x="660" y="222" width="6" height="6" />
          </g>
          <g fill="#10202e" stroke={HUD} strokeWidth="1">
            <rect x="478" y="200" width="120" height="4" rx="2" />
            <polygon points="598,200 612,202 598,204" />
            <rect x="478" y="356" width="120" height="4" rx="2" />
            <polygon points="598,356 612,358 598,360" />
            <path d="M 488 200 L 484 196 L 490 196 Z" fill="#15273a" />
            <path d="M 488 204 L 484 208 L 490 208 Z" fill="#15273a" />
            <path d="M 488 356 L 484 352 L 490 352 Z" fill="#15273a" />
            <path d="M 488 360 L 484 364 L 490 364 Z" fill="#15273a" />
          </g>
          <ellipse
            cx="540"
            cy="280"
            rx="46"
            ry="6"
            fill="#10202e"
            stroke={HUD}
            strokeWidth="0.8"
          />
        </g>

        <text
          x="270"
          y="284"
          fill={HUD}
          fontFamily="JetBrains Mono"
          fontSize="9"
          letterSpacing="2"
        >
          GR-15
        </text>
        <text
          x="690"
          y="284"
          fill={HUD}
          fontFamily="JetBrains Mono"
          fontSize="9"
          letterSpacing="2"
        >
          @
        </text>

        <g transform="translate(560 230)">
          <circle r="9" fill="none" stroke={HUD_DIM} strokeWidth="1" />
          <circle r="3" fill={HUD} opacity="0.8" />
        </g>
        <g transform="translate(560 330)">
          <circle r="9" fill="none" stroke={HUD_DIM} strokeWidth="1" />
          <circle r="3" fill={HUD} opacity="0.8" />
        </g>
      </g>
    </svg>
  );
}

export const Fighter = memo(FighterImpl);
