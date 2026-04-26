import type { AgentProfile } from '@openagents/shared/browser';

const AXES: (keyof Omit<AgentProfile, 'combatPower'>)[] = [
  'attack',
  'defense',
  'intelligence',
  'agility',
  'cooperation',
];

export function buildRadarPolygonPoints(profile: AgentProfile, radius: number) {
  const center = radius;

  return AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / AXES.length;
    const scaledRadius = (profile[axis] / 100) * radius;
    const x = center + Math.cos(angle) * scaledRadius;
    const y = center + Math.sin(angle) * scaledRadius;

    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export function buildRadarAxisPoints(radius: number) {
  const center = radius;

  return AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / AXES.length;

    return {
      axis,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });
}
