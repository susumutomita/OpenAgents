import type { AgentProfile } from '@openagents/shared/browser';
import { buildRadarAxisPoints, buildRadarPolygonPoints } from '../game/radar';

const AXIS_LABELS = {
  attack: 'Attack',
  defense: 'Defense',
  intelligence: 'Intel',
  agility: 'Agility',
  cooperation: 'Co-op',
} as const;

export function RadarDisplay({ profile }: { profile: AgentProfile }) {
  const size = 260;
  const radius = 110;
  const center = size / 2;
  const polygonPoints = buildRadarPolygonPoints(profile, radius);
  const axes = buildRadarAxisPoints(radius);

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
        viewBox={`0 0 ${size} ${size}`}
        className="radar-svg"
        role="img"
        aria-label="Agent radar chart"
      >
        {[1, 2, 3, 4, 5].map((ring) => {
          const ringRadius = (radius / 5) * ring;
          const points = buildRadarAxisPoints(ringRadius)
            .map(
              ({ x, y }) =>
                `${center - radius + x.toFixed(1)},${center - radius + y.toFixed(1)}`
            )
            .join(' ');

          return <polygon key={ring} points={points} className="radar-ring" />;
        })}
        {axes.map(({ axis, x, y }) => {
          const adjustedX = center - radius + x;
          const adjustedY = center - radius + y;

          return (
            <g key={axis}>
              <line
                x1={center}
                y1={center}
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
              return `${Number(x) + center - radius},${Number(y) + center - radius}`;
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
