import { describe, expect, it } from 'bun:test';
import { buildRadarPolygonPoints } from './radar';

describe('buildRadarPolygonPoints', () => {
  it('5 軸 profile から SVG polygon の座標列を返す', () => {
    const points = buildRadarPolygonPoints(
      {
        attack: 80,
        defense: 60,
        intelligence: 40,
        agility: 70,
        cooperation: 50,
        combatPower: 4200,
      },
      120
    );

    expect(points.split(' ').length).toBe(5);
    expect(points).toContain(',');
  });
});
