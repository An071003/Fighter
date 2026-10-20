import { describe, expect, it } from 'vitest';
import { EXPLODE_LIFT_Y } from '@/domain/config';
import { PART_MANIFEST } from '@/domain/partRegistry';

describe('Exploded view stays above the turntable deck', () => {
  it('lift outweighs every downward explode offset (lowest part rest ~0.24 above deck)', () => {
    // Gear wheels rest with their bottom ~0.24 above the deck; anything moving further down than
    // the assembly lift would sink through the turntable (bug seen in v4).
    const lowest = Math.min(...PART_MANIFEST.parts.map((p) => p.explode.offset[1]));
    expect(lowest + EXPLODE_LIFT_Y).toBeGreaterThan(0.1);
  });

  it('keeps gear explode offsets moderate so the leg stays readable under the fuselage', () => {
    for (const p of PART_MANIFEST.parts.filter((x) => x.category === 'GEAR')) {
      expect(p.explode.offset[1]).toBeGreaterThanOrEqual(-1.35);
    }
  });
});
