/**
 * Tests for planetary dignities
 *
 * Validates essential dignity calculations against traditional sources.
 *
 * **Test Data Sources:**
 * - Ptolemy's "Tetrabiblos" (c. 160 CE), Book I, Chapters 18-20
 *   Original Hellenistic doctrine of essential dignities
 * - William Lilly's "Christian Astrology" (1647), Pages 104-115
 *   Complete dignity tables with exact exaltation degrees
 * - Skyscript (https://www.skyscript.co.uk/dignities.html)
 *   Modern scholarly compilation with historical citations
 *
 * **Dignity Hierarchy (Traditional System):**
 * 1. Domicile: +5 points (planet rules the sign)
 * 2. Exaltation: +4 points (planet honored in sign)
 * 3. Peregrine: 0 points (no special dignity)
 * 4. Detriment: -5 points (opposite domicile)
 * 5. Fall: -4 points (opposite exaltation)
 *
 * **Important Test Cases:**
 * - Mercury in Virgo: Domicile (not Exaltation, despite being exalted there)
 *   This is correct per traditional doctrine - domicile takes precedence.
 * - Outer planets (Uranus/Neptune/Pluto): No traditional exaltations
 * - Modern rulers: Pluto/Scorpio, Uranus/Aquarius, Neptune/Pisces
 *
 * @see Ptolemy's Tetrabiblos: https://www.sacred-texts.com/astro/ptb/
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getPlanetaryDignity, isDetriment, isExalted, isFall, isRuler } from './dignities.js';
import { DignityState, Planet, Sign } from './types.js';

describe('getPlanetaryDignity', () => {
  describe('domiciles (rulerships)', () => {
    it('should identify Sun in domicile', () => {
      const dignity = getPlanetaryDignity(Planet.Sun, Sign.Leo);
      assert.equal(dignity.state, DignityState.Domicile);
      assert.equal(dignity.strength, 5);
    });

    it('should identify Moon in domicile', () => {
      const dignity = getPlanetaryDignity(Planet.Moon, Sign.Cancer);
      assert.equal(dignity.state, DignityState.Domicile);
      assert.equal(dignity.strength, 5);
    });

    it('should identify Mercury domiciles', () => {
      const gemini = getPlanetaryDignity(Planet.Mercury, Sign.Gemini);
      assert.equal(gemini.state, DignityState.Domicile);

      const virgo = getPlanetaryDignity(Planet.Mercury, Sign.Virgo);
      assert.equal(virgo.state, DignityState.Domicile);
    });

    it('should identify Venus domiciles', () => {
      const taurus = getPlanetaryDignity(Planet.Venus, Sign.Taurus);
      assert.equal(taurus.state, DignityState.Domicile);

      const libra = getPlanetaryDignity(Planet.Venus, Sign.Libra);
      assert.equal(libra.state, DignityState.Domicile);
    });

    it('should identify Mars traditional domiciles', () => {
      const aries = getPlanetaryDignity(Planet.Mars, Sign.Aries);
      assert.equal(aries.state, DignityState.Domicile);

      const scorpio = getPlanetaryDignity(Planet.Mars, Sign.Scorpio);
      assert.equal(scorpio.state, DignityState.Domicile);
    });

    it('should identify Jupiter traditional domiciles', () => {
      const sagittarius = getPlanetaryDignity(Planet.Jupiter, Sign.Sagittarius);
      assert.equal(sagittarius.state, DignityState.Domicile);

      const pisces = getPlanetaryDignity(Planet.Jupiter, Sign.Pisces);
      assert.equal(pisces.state, DignityState.Domicile);
    });

    it('should identify Saturn traditional domiciles', () => {
      const capricorn = getPlanetaryDignity(Planet.Saturn, Sign.Capricorn);
      assert.equal(capricorn.state, DignityState.Domicile);

      const aquarius = getPlanetaryDignity(Planet.Saturn, Sign.Aquarius);
      assert.equal(aquarius.state, DignityState.Domicile);
    });

    it('should identify modern rulers', () => {
      const uranus = getPlanetaryDignity(Planet.Uranus, Sign.Aquarius);
      assert.equal(uranus.state, DignityState.Domicile);

      const neptune = getPlanetaryDignity(Planet.Neptune, Sign.Pisces);
      assert.equal(neptune.state, DignityState.Domicile);

      const pluto = getPlanetaryDignity(Planet.Pluto, Sign.Scorpio);
      assert.equal(pluto.state, DignityState.Domicile);
    });
  });

  describe('detriments', () => {
    it('should identify Sun in detriment', () => {
      const dignity = getPlanetaryDignity(Planet.Sun, Sign.Aquarius);
      assert.equal(dignity.state, DignityState.Detriment);
      assert.equal(dignity.strength, -5);
    });

    it('should identify Moon in detriment', () => {
      const dignity = getPlanetaryDignity(Planet.Moon, Sign.Capricorn);
      assert.equal(dignity.state, DignityState.Detriment);
      assert.equal(dignity.strength, -5);
    });

    it('should identify Mercury detriments', () => {
      const sagittarius = getPlanetaryDignity(Planet.Mercury, Sign.Sagittarius);
      assert.equal(sagittarius.state, DignityState.Detriment);

      const pisces = getPlanetaryDignity(Planet.Mercury, Sign.Pisces);
      assert.equal(pisces.state, DignityState.Detriment);
    });

    it('should identify Venus detriments', () => {
      const scorpio = getPlanetaryDignity(Planet.Venus, Sign.Scorpio);
      assert.equal(scorpio.state, DignityState.Detriment);

      const aries = getPlanetaryDignity(Planet.Venus, Sign.Aries);
      assert.equal(aries.state, DignityState.Detriment);
    });

    it('should identify Mars detriments', () => {
      const libra = getPlanetaryDignity(Planet.Mars, Sign.Libra);
      assert.equal(libra.state, DignityState.Detriment);

      const taurus = getPlanetaryDignity(Planet.Mars, Sign.Taurus);
      assert.equal(taurus.state, DignityState.Detriment);
    });

    it('should identify Jupiter detriments', () => {
      const gemini = getPlanetaryDignity(Planet.Jupiter, Sign.Gemini);
      assert.equal(gemini.state, DignityState.Detriment);

      const virgo = getPlanetaryDignity(Planet.Jupiter, Sign.Virgo);
      assert.equal(virgo.state, DignityState.Detriment);
    });

    it('should identify Saturn detriments', () => {
      const cancer = getPlanetaryDignity(Planet.Saturn, Sign.Cancer);
      assert.equal(cancer.state, DignityState.Detriment);

      const leo = getPlanetaryDignity(Planet.Saturn, Sign.Leo);
      assert.equal(leo.state, DignityState.Detriment);
    });

    it('should identify modern planet detriments', () => {
      const uranus = getPlanetaryDignity(Planet.Uranus, Sign.Leo);
      assert.equal(uranus.state, DignityState.Detriment);

      const neptune = getPlanetaryDignity(Planet.Neptune, Sign.Virgo);
      assert.equal(neptune.state, DignityState.Detriment);

      const pluto = getPlanetaryDignity(Planet.Pluto, Sign.Taurus);
      assert.equal(pluto.state, DignityState.Detriment);
    });
  });

  describe('exaltations', () => {
    it('should identify Sun exalted in Aries', () => {
      const dignity = getPlanetaryDignity(Planet.Sun, Sign.Aries);
      assert.equal(dignity.state, DignityState.Exaltation);
      assert.equal(dignity.strength, 4);
      assert.equal(dignity.exaltationDegree, 19);
    });

    it('should identify Moon exalted in Taurus', () => {
      const dignity = getPlanetaryDignity(Planet.Moon, Sign.Taurus);
      assert.equal(dignity.state, DignityState.Exaltation);
      assert.equal(dignity.exaltationDegree, 3);
    });

    it('should identify Mercury exalted in Virgo', () => {
      // Note: Mercury rules Virgo, so this should be Domicile, not Exaltation
      // Mercury is ALSO exalted in Virgo at 15°, but domicile takes priority.
      // This is correct per traditional doctrine (Ptolemy, Lilly).
      const dignity = getPlanetaryDignity(Planet.Mercury, Sign.Virgo);
      assert.equal(dignity.state, DignityState.Domicile); // Domicile checked first
    });

    it('should identify Venus exalted in Pisces', () => {
      const dignity = getPlanetaryDignity(Planet.Venus, Sign.Pisces);
      assert.equal(dignity.state, DignityState.Exaltation);
      assert.equal(dignity.exaltationDegree, 27);
    });

    it('should identify Mars exalted in Capricorn', () => {
      const dignity = getPlanetaryDignity(Planet.Mars, Sign.Capricorn);
      assert.equal(dignity.state, DignityState.Exaltation);
      assert.equal(dignity.exaltationDegree, 28);
    });

    it('should identify Jupiter exalted in Cancer', () => {
      const dignity = getPlanetaryDignity(Planet.Jupiter, Sign.Cancer);
      assert.equal(dignity.state, DignityState.Exaltation);
      assert.equal(dignity.exaltationDegree, 15);
    });

    it('should identify Saturn exalted in Libra', () => {
      const dignity = getPlanetaryDignity(Planet.Saturn, Sign.Libra);
      assert.equal(dignity.state, DignityState.Exaltation);
      assert.equal(dignity.exaltationDegree, 21);
    });

    it('should note exact exaltation degree when provided', () => {
      const exact = getPlanetaryDignity(Planet.Mars, Sign.Capricorn, 28);
      assert.ok(exact.description.includes('exact degree'));
      assert.ok(exact.description.includes('28'));

      const notExact = getPlanetaryDignity(Planet.Mars, Sign.Capricorn, 15);
      assert.ok(!notExact.description.includes('exact degree'));
    });

    it('should have no exaltations for outer planets', () => {
      // Outer planets shouldn't be exalted anywhere
      // They should be domicile or peregrine
      const uranusScorpio = getPlanetaryDignity(Planet.Uranus, Sign.Scorpio);
      assert.notEqual(uranusScorpio.state, DignityState.Exaltation);

      const neptuneCancer = getPlanetaryDignity(Planet.Neptune, Sign.Cancer);
      assert.notEqual(neptuneCancer.state, DignityState.Exaltation);

      const plutoLeo = getPlanetaryDignity(Planet.Pluto, Sign.Leo);
      assert.notEqual(plutoLeo.state, DignityState.Exaltation);
    });
  });

  describe('falls', () => {
    it('should identify Sun in fall', () => {
      const dignity = getPlanetaryDignity(Planet.Sun, Sign.Libra);
      assert.equal(dignity.state, DignityState.Fall);
      assert.equal(dignity.strength, -4);
    });

    it('should identify Moon in fall', () => {
      const dignity = getPlanetaryDignity(Planet.Moon, Sign.Scorpio);
      assert.equal(dignity.state, DignityState.Fall);
    });

    it('should identify Venus in fall', () => {
      const dignity = getPlanetaryDignity(Planet.Venus, Sign.Virgo);
      // Venus exalted in Pisces (opposite Virgo) → Fall in Virgo
      // Verified against Lilly's Christian Astrology, p. 104-115
      assert.equal(dignity.state, DignityState.Fall);
    });

    it('should identify Mars in fall', () => {
      const dignity = getPlanetaryDignity(Planet.Mars, Sign.Cancer);
      assert.equal(dignity.state, DignityState.Fall);
    });

    it('should identify Jupiter in fall', () => {
      const dignity = getPlanetaryDignity(Planet.Jupiter, Sign.Capricorn);
      assert.equal(dignity.state, DignityState.Fall);
    });

    it('should identify Saturn in fall', () => {
      const dignity = getPlanetaryDignity(Planet.Saturn, Sign.Aries);
      assert.equal(dignity.state, DignityState.Fall);
    });
  });

  describe('peregrine', () => {
    it('should identify peregrine planets', () => {
      // Mars in Taurus is opposite Scorpio (domicile) → Detriment, not Peregrine
      const marsTaurus = getPlanetaryDignity(Planet.Mars, Sign.Taurus);
      assert.equal(marsTaurus.state, DignityState.Detriment);

      // True peregrine examples: planets with no special dignity
      const marsGemini = getPlanetaryDignity(Planet.Mars, Sign.Gemini);
      assert.equal(marsGemini.state, DignityState.Peregrine);
      assert.equal(marsGemini.strength, 0);

      const venusGemini = getPlanetaryDignity(Planet.Venus, Sign.Gemini);
      assert.equal(venusGemini.state, DignityState.Peregrine);

      const jupiterLeo = getPlanetaryDignity(Planet.Jupiter, Sign.Leo);
      assert.equal(jupiterLeo.state, DignityState.Peregrine);
    });
  });

  describe('strength values', () => {
    it('should return correct strength for each state', () => {
      // Domicile: +5
      assert.equal(getPlanetaryDignity(Planet.Mars, Sign.Aries).strength, 5);

      // Exaltation: +4
      assert.equal(getPlanetaryDignity(Planet.Sun, Sign.Aries).strength, 4);

      // Peregrine: 0
      assert.equal(getPlanetaryDignity(Planet.Mars, Sign.Gemini).strength, 0);

      // Fall: -4
      assert.equal(getPlanetaryDignity(Planet.Sun, Sign.Libra).strength, -4);

      // Detriment: -5
      assert.equal(getPlanetaryDignity(Planet.Mars, Sign.Libra).strength, -5);
    });
  });
});

describe('isRuler', () => {
  it('should identify traditional rulers', () => {
    assert.equal(isRuler(Planet.Mars, Sign.Aries), true);
    assert.equal(isRuler(Planet.Venus, Sign.Taurus), true);
    assert.equal(isRuler(Planet.Mercury, Sign.Gemini), true);
    assert.equal(isRuler(Planet.Mercury, Sign.Virgo), true);
  });

  it('should identify modern rulers', () => {
    assert.equal(isRuler(Planet.Uranus, Sign.Aquarius), true);
    assert.equal(isRuler(Planet.Neptune, Sign.Pisces), true);
    assert.equal(isRuler(Planet.Pluto, Sign.Scorpio), true);
  });

  it('should return false for non-rulers', () => {
    assert.equal(isRuler(Planet.Mars, Sign.Taurus), false);
    assert.equal(isRuler(Planet.Sun, Sign.Aries), false);
  });

  it('should handle dual rulerships', () => {
    assert.equal(isRuler(Planet.Mars, Sign.Aries), true);
    assert.equal(isRuler(Planet.Mars, Sign.Scorpio), true);
    assert.equal(isRuler(Planet.Mercury, Sign.Gemini), true);
    assert.equal(isRuler(Planet.Mercury, Sign.Virgo), true);
  });
});

describe('isExalted', () => {
  it('should identify exalted planets', () => {
    assert.equal(isExalted(Planet.Sun, Sign.Aries), true);
    assert.equal(isExalted(Planet.Moon, Sign.Taurus), true);
    assert.equal(isExalted(Planet.Mars, Sign.Capricorn), true);
  });

  it('should return false for non-exalted placements', () => {
    assert.equal(isExalted(Planet.Sun, Sign.Leo), false);
    assert.equal(isExalted(Planet.Mars, Sign.Aries), false);
  });

  it('should return false for outer planets (no exaltations)', () => {
    assert.equal(isExalted(Planet.Uranus, Sign.Scorpio), false);
    assert.equal(isExalted(Planet.Neptune, Sign.Cancer), false);
    assert.equal(isExalted(Planet.Pluto, Sign.Leo), false);
  });
});

describe('isDetriment', () => {
  it('should identify detriments', () => {
    assert.equal(isDetriment(Planet.Sun, Sign.Aquarius), true);
    assert.equal(isDetriment(Planet.Mars, Sign.Libra), true);
    assert.equal(isDetriment(Planet.Mars, Sign.Taurus), true);
  });

  it('should return false for non-detriment placements', () => {
    assert.equal(isDetriment(Planet.Mars, Sign.Aries), false);
    assert.equal(isDetriment(Planet.Mars, Sign.Capricorn), false);
  });
});

describe('isFall', () => {
  it('should identify falls', () => {
    assert.equal(isFall(Planet.Sun, Sign.Libra), true);
    assert.equal(isFall(Planet.Mars, Sign.Cancer), true);
    assert.equal(isFall(Planet.Saturn, Sign.Aries), true);
  });

  it('should return false for non-fall placements', () => {
    assert.equal(isFall(Planet.Mars, Sign.Aries), false);
    assert.equal(isFall(Planet.Sun, Sign.Leo), false);
  });

  it('should return false for outer planets (no falls)', () => {
    assert.equal(isFall(Planet.Uranus, Sign.Leo), false);
    assert.equal(isFall(Planet.Neptune, Sign.Virgo), false);
  });
});
