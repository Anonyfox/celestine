# Essential Dignities Reference Tables

**Source**: Traditional astrological texts (Ptolemy, Lilly, Skyscript)
**Purpose**: Authoritative reference data for planetary dignities verification

---

## Planetary Rulerships (Domicile)

### Traditional Rulerships (Pre-1781)

| Planet  | Rules Sign(s)       | Notes                   |
| ------- | ------------------- | ----------------------- |
| Sun     | Leo                 | One sign only           |
| Moon    | Cancer              | One sign only           |
| Mercury | Gemini, Virgo       | Two signs               |
| Venus   | Taurus, Libra       | Two signs               |
| Mars    | Aries, Scorpio      | Two signs (traditional) |
| Jupiter | Sagittarius, Pisces | Two signs (traditional) |
| Saturn  | Capricorn, Aquarius | Two signs (traditional) |

### Modern Rulerships (Post-Discovery)

| Planet  | Rules Sign | Discovery Year | Co-Rules With |
| ------- | ---------- | -------------- | ------------- |
| Uranus  | Aquarius   | 1781           | Saturn        |
| Neptune | Pisces     | 1846           | Jupiter       |
| Pluto   | Scorpio    | 1930           | Mars          |

---

## Exaltations

**Definition**: Sign and degree where a planet is "honored" or elevated.

| Planet  | Exaltation Sign | Exact Degree | Opposite (Fall) | Fall Degree |
| ------- | --------------- | ------------ | --------------- | ----------- |
| Sun     | Aries           | 19°          | Libra           | 19°         |
| Moon    | Taurus          | 3°           | Scorpio         | 3°          |
| Mercury | Virgo           | 15°          | Pisces          | 15°         |
| Venus   | Pisces          | 27°          | Virgo           | 27°         |
| Mars    | Capricorn       | 28°          | Cancer          | 28°         |
| Jupiter | Cancer          | 15°          | Capricorn       | 15°         |
| Saturn  | Libra           | 21°          | Aries           | 21°         |

**Notes**:

- Exaltation degrees are from traditional sources (Ptolemy, Lilly)
- Modern practice often uses the entire sign, not just the exact degree
- Outer planets (Uranus, Neptune, Pluto) have no universally agreed exaltations

---

## Detriments

**Definition**: Sign opposite a planet's rulership (domicile).

**Algorithm**: `Detriment Sign = (Rulership Sign + 6) % 12`

| Planet  | Rules              | Detriment In       |
| ------- | ------------------ | ------------------ |
| Sun     | Leo                | Aquarius           |
| Moon    | Cancer             | Capricorn          |
| Mercury | Gemini/Virgo       | Sagittarius/Pisces |
| Venus   | Taurus/Libra       | Scorpio/Aries      |
| Mars    | Aries/Scorpio      | Libra/Taurus       |
| Jupiter | Sagittarius/Pisces | Gemini/Virgo       |
| Saturn  | Capricorn/Aquarius | Cancer/Leo         |
| Uranus  | Aquarius           | Leo                |
| Neptune | Pisces             | Virgo              |
| Pluto   | Scorpio            | Taurus             |

---

## Falls

**Definition**: Sign opposite a planet's exaltation.

**Algorithm**: `Fall Sign = (Exaltation Sign + 6) % 12`

| Planet  | Exalted In | Falls In  | Fall Degree |
| ------- | ---------- | --------- | ----------- |
| Sun     | Aries      | Libra     | 19°         |
| Moon    | Taurus     | Scorpio   | 3°          |
| Mercury | Virgo      | Pisces    | 15°         |
| Venus   | Pisces     | Virgo     | 27°         |
| Mars    | Capricorn  | Cancer    | 28°         |
| Jupiter | Cancer     | Capricorn | 15°         |
| Saturn  | Libra      | Aries     | 21°         |

---

## Dignity Scoring (Traditional)

| Dignity State | Point Value | Description                  |
| ------------- | ----------- | ---------------------------- |
| Domicile      | +5          | Planet rules the sign        |
| Exaltation    | +4          | Planet exalted in sign       |
| Peregrine     | 0           | No special dignity           |
| Detriment     | -5          | Opposite planet's domicile   |
| Fall          | -4          | Opposite planet's exaltation |

**Additional Traditional Dignities** (not implemented in basic module):

- **Triplicity** (Element ruler): +3
- **Term/Bound**: +2
- **Face/Decan**: +1

---

## Test Data for Verification

### Known Dignity States

```typescript
// Domiciles
Planet.Mars in Sign.Aries → Domicile (+5)
Planet.Venus in Sign.Taurus → Domicile (+5)
Planet.Sun in Sign.Leo → Domicile (+5)

// Detriments
Planet.Mars in Sign.Libra → Detriment (-5)
Planet.Sun in Sign.Aquarius → Detriment (-5)
Planet.Saturn in Sign.Cancer → Detriment (-5)

// Exaltations
Planet.Sun in Sign.Aries → Exaltation (+4)
Planet.Mars in Sign.Capricorn at 28° → Exaltation at exact degree (+4)
Planet.Moon in Sign.Taurus at 3° → Exaltation at exact degree (+4)

// Falls
Planet.Sun in Sign.Libra → Fall (-4)
Planet.Mars in Sign.Cancer → Fall (-4)
Planet.Saturn in Sign.Aries → Fall (-4)

// Peregrine
Planet.Mars in Sign.Taurus → Peregrine (0)
Planet.Venus in Sign.Gemini → Peregrine (0)
Planet.Jupiter in Sign.Leo → Peregrine (0)
```

---

## Historical Sources

### Primary Sources

1. **Claudius Ptolemy - "Tetrabiblos" (c. 160 CE)**

   - Book I, Chapters 18-20
   - Original Greek terminology for dignities
   - First systematic treatment

2. **William Lilly - "Christian Astrology" (1647)**

   - Pages 104-115: Complete dignity tables
   - English Renaissance standard
   - Added minor dignities (triplicities, terms, faces)

3. **Firmicus Maternus - "Mathesis" (4th century CE)**
   - Book II: Planetary rulerships
   - Book IV: Exaltations and falls

### Modern Compilations

1. **Skyscript.co.uk - Essential Dignities**

   - URL: https://www.skyscript.co.uk/dignities.html
   - Comprehensive tables with historical citations

2. **Astro.com Swiss Ephemeris Documentation**
   - Section on dignity calculations
   - Used by professional software

---

## Sign Correspondences

### Complete Sign Data

| Index | Sign        | Symbol | Longitude | Element | Modality | Polarity | Traditional Ruler | Modern Ruler |
| ----- | ----------- | ------ | --------- | ------- | -------- | -------- | ----------------- | ------------ |
| 0     | Aries       | ♈     | 0-30      | Fire    | Cardinal | Positive | Mars              | Mars         |
| 1     | Taurus      | ♉     | 30-60     | Earth   | Fixed    | Negative | Venus             | Venus        |
| 2     | Gemini      | ♊     | 60-90     | Air     | Mutable  | Positive | Mercury           | Mercury      |
| 3     | Cancer      | ♋     | 90-120    | Water   | Cardinal | Negative | Moon              | Moon         |
| 4     | Leo         | ♌     | 120-150   | Fire    | Fixed    | Positive | Sun               | Sun          |
| 5     | Virgo       | ♍     | 150-180   | Earth   | Mutable  | Negative | Mercury           | Mercury      |
| 6     | Libra       | ♎     | 180-210   | Air     | Cardinal | Positive | Venus             | Venus        |
| 7     | Scorpio     | ♏     | 210-240   | Water   | Fixed    | Negative | Mars              | Pluto        |
| 8     | Sagittarius | ♐     | 240-270   | Fire    | Mutable  | Positive | Jupiter           | Jupiter      |
| 9     | Capricorn   | ♑     | 270-300   | Earth   | Cardinal | Negative | Saturn            | Saturn       |
| 10    | Aquarius    | ♒     | 300-330   | Air     | Fixed    | Positive | Saturn            | Uranus       |
| 11    | Pisces      | ♓     | 330-360   | Water   | Mutable  | Negative | Jupiter           | Neptune      |

---

## Unicode Symbols

### Zodiac Signs

```
♈ Aries       U+2648
♉ Taurus      U+2649
♊ Gemini      U+264A
♋ Cancer      U+264B
♌ Leo         U+264C
♍ Virgo       U+264D
♎ Libra       U+264E
♏ Scorpio     U+264F
♐ Sagittarius U+2650
♑ Capricorn   U+2651
♒ Aquarius    U+2652
♓ Pisces      U+2653
```

### Planets

```
☉ Sun         U+2609
☽ Moon        U+263D (or ☾ U+263E)
☿ Mercury     U+263F
♀ Venus       U+2640
♂ Mars        U+2642
♃ Jupiter     U+2643
♄ Saturn      U+2644
♅ Uranus      U+2645
♆ Neptune     U+2646
♇ Pluto       U+2647
```

---

## Verification Examples (From Meeus)

**Source**: "Astronomical Algorithms" by Jean Meeus, 2nd Edition

### Example 25.a (Page 152)

- **Date**: 1992 October 13, 00:00 TD
- **Venus Ecliptic Longitude**: 217.411111° (217°24'40")
- **Expected Conversion**:
  - Sign: Scorpio (index 7)
  - Degree in sign: 7°24'40"
  - Full notation: "7°24'40" Scorpio"

**Calculation**:

```
Sign index = floor(217.411111 / 30) = floor(7.247) = 7 (Scorpio)
Degree in sign = 217.411111 % 30 = 7.411111
Degrees = 7
Minutes = 0.411111 * 60 = 24.66666
Seconds = 0.66666 * 60 = 40
Result: 7°24'40" Scorpio ✓
```

---

## Notes on Implementation

### Tropical vs. Sidereal

- **This reference is for TROPICAL zodiac**
- 0° Aries = Vernal Equinox (March equinox point)
- Sidereal zodiac would require ayanamsa adjustment (~24° currently)

### Modern Outer Planet Exaltations

There is **no traditional consensus** on exaltations for Uranus, Neptune, and Pluto. Various modern sources suggest:

**Uranus**:

- Scorpio (some sources)
- Aquarius (its own sign - uncommon)

**Neptune**:

- Cancer (some sources)
- Leo (other sources)
- Aquarius (others)
- Pisces (its own sign - uncommon)

**Pluto**:

- Aries (some sources)
- Leo (other sources)
- Scorpio (its own sign - uncommon)

**Recommendation**: Do not include outer planet exaltations in the base implementation. They can be added as an optional/experimental feature if needed.

---

**End of Reference Document**
