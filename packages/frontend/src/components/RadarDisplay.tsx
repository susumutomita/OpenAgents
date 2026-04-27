import type { AgentProfile } from '@gradiusweb3/shared/browser';
import { useMemo } from 'react';
import { buildRadarAxisPoints, buildRadarPolygonPoints } from '../game/radar';

const AXIS_LABELS = {
  attack: 'Attack',
  defense: 'Defense',
  intelligence: 'Intel',
  agility: 'Agility',
  cooperation: 'Co-op',
} as const;

const RING_LEVELS = [1, 2, 3, 4, 5] as const;
const SIZE = 260;
const RADIUS = 110;
const CENTER = SIZE / 2;

const RING_POINTS = RING_LEVELS.map((ring) => {
  const ringRadius = (RADIUS / 5) * ring;
  return buildRadarAxisPoints(ringRadius)
    .map(
      ({ x, y }) =>
        `${CENTER - RADIUS + x.toFixed(1)},${CENTER - RADIUS + y.toFixed(1)}`
    )
    .join(' ');
});

const AXIS_POINTS = buildRadarAxisPoints(RADIUS);

export function RadarDisplay({ profile }: { profile: AgentProfile }) {
  const polygonPoints = useMemo(
    () => buildRadarPolygonPoints(profile, RADIUS),
    [profile]
  );

  return (
    <section className="panel radar-panel">
      <div className="panel-header">
        <span className="eyebrow">Combat Scan</span>
        <h2>5-axis Profile</h2>
      </div>
      <div className="combat-power">
        <span>Combat Power</span>
        <strong>{profile.combatPower.toLocaleString()}</strong>
      </div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="radar-svg"
        role="img"
        aria-label="Agent radar chart"
      >
        {RING_POINTS.map((points, index) => (
          <polygon
            key={RING_LEVELS[index]}
            points={points}
            className="radar-ring"
          />
        ))}
        {AXIS_POINTS.map(({ axis, x, y }) => {
          const adjustedX = CENTER - RADIUS + x;
          const adjustedY = CENTER - RADIUS + y;

          return (
            <g key={axis}>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={adjustedX}
                y2={adjustedY}
                className="radar-axis"
              />
              <text x={adjustedX} y={adjustedY} className="radar-label">
                {AXIS_LABELS[axis]}
              </text>
            </g>
          );
        })}
        <polygon
          points={polygonPoints
            .split(' ')
            .map((point) => {
              const [x, y] = point.split(',');
              return `${Number(x) + CENTER - RADIUS},${Number(y) + CENTER - RADIUS}`;
            })
            .join(' ')}
          className="radar-shape"
        />
      </svg>
      <div className="stats-grid">
        <div>
          <span>Attack</span>
          <strong>{profile.attack}</strong>
        </div>
        <div>
          <span>Defense</span>
          <strong>{profile.defense}</strong>
        </div>
        <div>
          <span>Intel</span>
          <strong>{profile.intelligence}</strong>
        </div>
        <div>
          <span>Agility</span>
          <strong>{profile.agility}</strong>
        </div>
        <div>
          <span>Co-op</span>
          <strong>{profile.cooperation}</strong>
        </div>
      </div>
    </section>
  );
}
