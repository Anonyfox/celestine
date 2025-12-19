/**
 * Tests for sign properties functions
 *
 * Validates sign data integrity, pattern consistency, and lookup functions.
 *
 * **Data Sources:**
 * All sign properties verified against traditional astrological doctrine:
 * - Elements (Fire/Earth/Air/Water): Ptolemy's Tetrabiblos, Book I
 * - Modalities (Cardinal/Fixed/Mutable): Hellenistic tradition
 * - Polarities (Positive/Negative, Yang/Yin): Classical system
 * - Rulers: Ptolemy (traditional) + modern discoveries (1781-1930)
 *
 * **Pattern Verification:**
 * - Elements cycle every 4 signs: Fire → Earth → Air → Water
 * - Modalities cycle every 3 signs: Cardinal → Fixed → Mutable
 * - Polarities alternate: Positive (Yang) → Negative (Yin)
 *
 * **Unicode Symbols:**
 * Standard astronomical/astrological symbols (U+2648 through U+2653)
 */

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { getSignInfo, getSignName, getSignSymbol } from './sign-properties.js';
import { Element, Modality, Planet, Polarity, Sign } from './types.js';

describe('getSignInfo', () => {
  describe('data integrity', () => {
    it('should return valid data for all 12 signs', () => {
      for (let i = 0; i < 12; i++) {
        const info = getSignInfo(i as Sign);

        // Basic properties
        assert.equal(info.sign, i);
        assert.ok(info.name.length > 0);
        assert.ok(info.symbol.length > 0);

        // Degree boundaries
        assert.equal(info.startDegree, i * 30);
        assert.equal(info.endDegree, (i + 1) * 30);

        // Classifications exist
        assert.ok(Object.values(Element).includes(info.element));
        assert.ok(Object.values(Modality).includes(info.modality));
        assert.ok(Object.values(Polarity).includes(info.polarity));
        assert.ok(Object.values(Planet).includes(info.ruler));
        assert.ok(Object.values(Planet).includes(info.traditionalRuler));
      }
    });

    it('should throw on invalid sign index', () => {
      assert.throws(() => getSignInfo(-1 as Sign), /Invalid sign/);
      assert.throws(() => getSignInfo(12 as Sign), /Invalid sign/);
      assert.throws(() => getSignInfo(100 as Sign), /Invalid sign/);
    });
  });

  describe('sign names', () => {
    it('should return correct names for all signs', () => {
      assert.equal(getSignInfo(Sign.Aries).name, 'Aries');
      assert.equal(getSignInfo(Sign.Taurus).name, 'Taurus');
      assert.equal(getSignInfo(Sign.Gemini).name, 'Gemini');
      assert.equal(getSignInfo(Sign.Cancer).name, 'Cancer');
      assert.equal(getSignInfo(Sign.Leo).name, 'Leo');
      assert.equal(getSignInfo(Sign.Virgo).name, 'Virgo');
      assert.equal(getSignInfo(Sign.Libra).name, 'Libra');
      assert.equal(getSignInfo(Sign.Scorpio).name, 'Scorpio');
      assert.equal(getSignInfo(Sign.Sagittarius).name, 'Sagittarius');
      assert.equal(getSignInfo(Sign.Capricorn).name, 'Capricorn');
      assert.equal(getSignInfo(Sign.Aquarius).name, 'Aquarius');
      assert.equal(getSignInfo(Sign.Pisces).name, 'Pisces');
    });
  });

  describe('sign symbols', () => {
    it('should return correct Unicode symbols for all signs', () => {
      assert.equal(getSignInfo(Sign.Aries).symbol, '♈');
      assert.equal(getSignInfo(Sign.Taurus).symbol, '♉');
      assert.equal(getSignInfo(Sign.Gemini).symbol, '♊');
      assert.equal(getSignInfo(Sign.Cancer).symbol, '♋');
      assert.equal(getSignInfo(Sign.Leo).symbol, '♌');
      assert.equal(getSignInfo(Sign.Virgo).symbol, '♍');
      assert.equal(getSignInfo(Sign.Libra).symbol, '♎');
      assert.equal(getSignInfo(Sign.Scorpio).symbol, '♏');
      assert.equal(getSignInfo(Sign.Sagittarius).symbol, '♐');
      assert.equal(getSignInfo(Sign.Capricorn).symbol, '♑');
      assert.equal(getSignInfo(Sign.Aquarius).symbol, '♒');
      assert.equal(getSignInfo(Sign.Pisces).symbol, '♓');
    });
  });

  describe('elements (triplicities)', () => {
    it('should assign Fire element correctly', () => {
      assert.equal(getSignInfo(Sign.Aries).element, Element.Fire);
      assert.equal(getSignInfo(Sign.Leo).element, Element.Fire);
      assert.equal(getSignInfo(Sign.Sagittarius).element, Element.Fire);
    });

    it('should assign Earth element correctly', () => {
      assert.equal(getSignInfo(Sign.Taurus).element, Element.Earth);
      assert.equal(getSignInfo(Sign.Virgo).element, Element.Earth);
      assert.equal(getSignInfo(Sign.Capricorn).element, Element.Earth);
    });

    it('should assign Air element correctly', () => {
      assert.equal(getSignInfo(Sign.Gemini).element, Element.Air);
      assert.equal(getSignInfo(Sign.Libra).element, Element.Air);
      assert.equal(getSignInfo(Sign.Aquarius).element, Element.Air);
    });

    it('should assign Water element correctly', () => {
      assert.equal(getSignInfo(Sign.Cancer).element, Element.Water);
      assert.equal(getSignInfo(Sign.Scorpio).element, Element.Water);
      assert.equal(getSignInfo(Sign.Pisces).element, Element.Water);
    });

    it('should cycle elements correctly (every 4th sign)', () => {
      const elements = [Element.Fire, Element.Earth, Element.Air, Element.Water];
      for (let i = 0; i < 12; i++) {
        const expectedElement = elements[i % 4];
        assert.equal(getSignInfo(i as Sign).element, expectedElement);
      }
    });
  });

  describe('modalities (quadruplicities)', () => {
    it('should assign Cardinal modality correctly', () => {
      assert.equal(getSignInfo(Sign.Aries).modality, Modality.Cardinal);
      assert.equal(getSignInfo(Sign.Cancer).modality, Modality.Cardinal);
      assert.equal(getSignInfo(Sign.Libra).modality, Modality.Cardinal);
      assert.equal(getSignInfo(Sign.Capricorn).modality, Modality.Cardinal);
    });

    it('should assign Fixed modality correctly', () => {
      assert.equal(getSignInfo(Sign.Taurus).modality, Modality.Fixed);
      assert.equal(getSignInfo(Sign.Leo).modality, Modality.Fixed);
      assert.equal(getSignInfo(Sign.Scorpio).modality, Modality.Fixed);
      assert.equal(getSignInfo(Sign.Aquarius).modality, Modality.Fixed);
    });

    it('should assign Mutable modality correctly', () => {
      assert.equal(getSignInfo(Sign.Gemini).modality, Modality.Mutable);
      assert.equal(getSignInfo(Sign.Virgo).modality, Modality.Mutable);
      assert.equal(getSignInfo(Sign.Sagittarius).modality, Modality.Mutable);
      assert.equal(getSignInfo(Sign.Pisces).modality, Modality.Mutable);
    });

    it('should cycle modalities correctly (every 3rd sign)', () => {
      const modalities = [Modality.Cardinal, Modality.Fixed, Modality.Mutable];
      for (let i = 0; i < 12; i++) {
        const expectedModality = modalities[i % 3];
        assert.equal(getSignInfo(i as Sign).modality, expectedModality);
      }
    });
  });

  describe('polarities', () => {
    it('should assign Positive polarity to odd-indexed signs', () => {
      assert.equal(getSignInfo(Sign.Aries).polarity, Polarity.Positive); // 0
      assert.equal(getSignInfo(Sign.Gemini).polarity, Polarity.Positive); // 2
      assert.equal(getSignInfo(Sign.Leo).polarity, Polarity.Positive); // 4
      assert.equal(getSignInfo(Sign.Libra).polarity, Polarity.Positive); // 6
      assert.equal(getSignInfo(Sign.Sagittarius).polarity, Polarity.Positive); // 8
      assert.equal(getSignInfo(Sign.Aquarius).polarity, Polarity.Positive); // 10
    });

    it('should assign Negative polarity to even-indexed signs', () => {
      assert.equal(getSignInfo(Sign.Taurus).polarity, Polarity.Negative); // 1
      assert.equal(getSignInfo(Sign.Cancer).polarity, Polarity.Negative); // 3
      assert.equal(getSignInfo(Sign.Virgo).polarity, Polarity.Negative); // 5
      assert.equal(getSignInfo(Sign.Scorpio).polarity, Polarity.Negative); // 7
      assert.equal(getSignInfo(Sign.Capricorn).polarity, Polarity.Negative); // 9
      assert.equal(getSignInfo(Sign.Pisces).polarity, Polarity.Negative); // 11
    });

    it('should alternate polarities', () => {
      for (let i = 0; i < 12; i++) {
        const expectedPolarity = i % 2 === 0 ? Polarity.Positive : Polarity.Negative;
        assert.equal(getSignInfo(i as Sign).polarity, expectedPolarity);
      }
    });
  });

  describe('planetary rulers', () => {
    it('should assign traditional rulers correctly', () => {
      assert.equal(getSignInfo(Sign.Aries).traditionalRuler, Planet.Mars);
      assert.equal(getSignInfo(Sign.Taurus).traditionalRuler, Planet.Venus);
      assert.equal(getSignInfo(Sign.Gemini).traditionalRuler, Planet.Mercury);
      assert.equal(getSignInfo(Sign.Cancer).traditionalRuler, Planet.Moon);
      assert.equal(getSignInfo(Sign.Leo).traditionalRuler, Planet.Sun);
      assert.equal(getSignInfo(Sign.Virgo).traditionalRuler, Planet.Mercury);
      assert.equal(getSignInfo(Sign.Libra).traditionalRuler, Planet.Venus);
      assert.equal(getSignInfo(Sign.Scorpio).traditionalRuler, Planet.Mars);
      assert.equal(getSignInfo(Sign.Sagittarius).traditionalRuler, Planet.Jupiter);
      assert.equal(getSignInfo(Sign.Capricorn).traditionalRuler, Planet.Saturn);
      assert.equal(getSignInfo(Sign.Aquarius).traditionalRuler, Planet.Saturn);
      assert.equal(getSignInfo(Sign.Pisces).traditionalRuler, Planet.Jupiter);
    });

    it('should use modern rulers where applicable', () => {
      // Signs with modern rulers
      assert.equal(getSignInfo(Sign.Scorpio).ruler, Planet.Pluto);
      assert.equal(getSignInfo(Sign.Aquarius).ruler, Planet.Uranus);
      assert.equal(getSignInfo(Sign.Pisces).ruler, Planet.Neptune);

      // These should also have modernRuler property
      assert.equal(getSignInfo(Sign.Scorpio).modernRuler, Planet.Pluto);
      assert.equal(getSignInfo(Sign.Aquarius).modernRuler, Planet.Uranus);
      assert.equal(getSignInfo(Sign.Pisces).modernRuler, Planet.Neptune);
    });

    it('should have traditional rulers equal to primary rulers for classical signs', () => {
      // Signs without modern rulers
      const classicalSigns = [
        Sign.Aries,
        Sign.Taurus,
        Sign.Gemini,
        Sign.Cancer,
        Sign.Leo,
        Sign.Virgo,
        Sign.Libra,
        Sign.Sagittarius,
        Sign.Capricorn,
      ];

      for (const sign of classicalSigns) {
        const info = getSignInfo(sign);
        assert.equal(info.ruler, info.traditionalRuler);
        assert.equal(info.modernRuler, undefined);
      }
    });
  });

  describe('degree boundaries', () => {
    it('should have correct start and end degrees', () => {
      for (let i = 0; i < 12; i++) {
        const info = getSignInfo(i as Sign);
        assert.equal(info.startDegree, i * 30);
        assert.equal(info.endDegree, (i + 1) * 30);
      }
    });

    it('should have 30-degree spans for all signs', () => {
      for (let i = 0; i < 12; i++) {
        const info = getSignInfo(i as Sign);
        assert.equal(info.endDegree - info.startDegree, 30);
      }
    });
  });
});

describe('getSignName', () => {
  it('should return correct name for each sign', () => {
    assert.equal(getSignName(Sign.Aries), 'Aries');
    assert.equal(getSignName(Sign.Taurus), 'Taurus');
    assert.equal(getSignName(Sign.Pisces), 'Pisces');
  });
});

describe('getSignSymbol', () => {
  it('should return correct symbol for each sign', () => {
    assert.equal(getSignSymbol(Sign.Aries), '♈');
    assert.equal(getSignSymbol(Sign.Leo), '♌');
    assert.equal(getSignSymbol(Sign.Pisces), '♓');
  });
});
