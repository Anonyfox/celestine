# Astrology Calculation: Knowledge Base

A bottom-up exploration of astronomical and astrological concepts. Each section explains what a concept is, why it matters, where it comes from, and how it's calculated.

**Purpose:** Build foundational understanding before writing code. Learn the domain, then implement.

**Approach:** Start with time and space (pure astronomy), then layer astrological meaning on top.

---

## Table of Contents

1. [The Celestial Sphere](#1-the-celestial-sphere)
2. [Coordinate Systems](#2-coordinate-systems)
3. [Time Systems](#3-time-systems)
4. [The Ecliptic and Zodiac](#4-the-ecliptic-and-zodiac)
5. [Planetary Motion](#5-planetary-motion)
6. [Ephemeris: Calculating Planetary Positions](#6-ephemeris-calculating-planetary-positions)
7. [The Zodiac Signs](#7-the-zodiac-signs)
8. [Houses: Dividing the Sky](#8-houses-dividing-the-sky)
9. [Aspects: Angular Relationships](#9-aspects-angular-relationships)
10. [Dignities: Planetary Strength](#10-dignities-planetary-strength)
11. [Additional Chart Points](#11-additional-chart-points)
12. [Retrograde Motion](#12-retrograde-motion)
13. [The Birth Chart](#13-the-birth-chart)

---

## 1. The Celestial Sphere

### What Is It?

The **celestial sphere** is an imaginary sphere of arbitrarily large radius, concentric with Earth, onto which all celestial objects are projected. It's a mental model — the sky as a sphere surrounding us.

This is the foundational abstraction for all positional astronomy. When we say "where is Mars?", we mean "where does Mars appear on the celestial sphere from Earth's perspective?"

### Key Concepts

| Term | Definition |
|------|------------|
| **Celestial Equator** | Projection of Earth's equator onto the celestial sphere. Divides the sky into northern and southern hemispheres. |
| **Celestial Poles** | Projection of Earth's poles. The North Celestial Pole is near Polaris. |
| **Zenith** | The point directly overhead for an observer. Depends on your location. |
| **Nadir** | The point directly below (opposite zenith). |
| **Horizon** | The great circle 90° from zenith. What you see as the edge of the sky. |
| **Meridian** | The great circle passing through both poles and the zenith. When a star crosses the meridian, it's at its highest point. |

### Why It Matters for Astrology

All astrological positions are ultimately points on the celestial sphere. The birth chart is a 2D representation of which celestial bodies were where on this sphere at the moment of birth, as seen from the birth location.

### Sources

- Any introductory astronomy textbook (e.g., "Astronomy: A Self-Teaching Guide" by Dinah Moché)
- IAU (International Astronomical Union) definitions: https://www.iau.org/

---

## 2. Coordinate Systems

### The Problem

We need a way to specify positions on the celestial sphere. Just like latitude/longitude on Earth, we need coordinate systems for the sky. But there are multiple systems, each useful for different purposes.

### Ecliptic Coordinates (Primary for Astrology)

**This is the coordinate system astrology uses.**

| Coordinate | Definition | Range |
|------------|------------|-------|
| **Ecliptic Longitude (λ)** | Angular distance along the ecliptic, measured from the vernal equinox (0° Aries) | 0° to 360° |
| **Ecliptic Latitude (β)** | Angular distance north or south of the ecliptic | -90° to +90° |

The **ecliptic** is the plane of Earth's orbit around the Sun. From Earth's perspective, it's the apparent path the Sun traces through the sky over a year.

**Why ecliptic coordinates?** The planets orbit roughly in the same plane as Earth (the ecliptic plane), so their ecliptic latitudes are usually small (within a few degrees of 0°). This makes ecliptic longitude the primary measure — it tells you "where along the zodiac" something is.

### Equatorial Coordinates (Used in Astronomy)

| Coordinate | Definition | Range |
|------------|------------|-------|
| **Right Ascension (α or RA)** | Angular distance along the celestial equator, measured from vernal equinox | 0h to 24h (or 0° to 360°) |
| **Declination (δ)** | Angular distance north or south of celestial equator | -90° to +90° |

Astronomers prefer this because it's aligned with Earth's rotation. Astrologers rarely use it directly.

### Horizontal Coordinates (Observer-Specific)

| Coordinate | Definition | Range |
|------------|------------|-------|
| **Azimuth** | Direction along the horizon, usually from North | 0° to 360° |
| **Altitude** | Angle above the horizon | -90° (nadir) to +90° (zenith) |

This tells you where to physically look in the sky from your location. Needed for calculating what's rising, setting, or culminating.

### The Vernal Equinox (0° Aries)

The **vernal equinox** is the reference point for both ecliptic and equatorial coordinates. It's where the ecliptic crosses the celestial equator going northward — the moment of the March equinox.

This point slowly moves due to precession (see below), which creates the tropical vs. sidereal zodiac distinction.

### Coordinate Conversions

Converting between coordinate systems requires spherical trigonometry. The key relationship:

- The ecliptic is tilted ~23.44° relative to the celestial equator (this angle is called the **obliquity of the ecliptic**, symbol ε)
- Formulas exist to convert (RA, Dec) ↔ (λ, β) using ε

### Sources

- "Astronomical Algorithms" by Jean Meeus — THE reference for computational astronomy
- USNO (US Naval Observatory) publications
- Wikipedia: "Ecliptic coordinate system", "Equatorial coordinate system"

---

## 3. Time Systems

### The Problem

"What time is it?" is surprisingly complex astronomically. Different time systems exist for different purposes.

### Universal Time (UT / UTC)

**What:** Time based on Earth's rotation. Noon is when the Sun crosses the meridian at Greenwich (0° longitude).

**UTC (Coordinated Universal Time):** The modern civil time standard. Essentially UT with leap seconds to stay synchronized with atomic time.

**For astrology:** Birth times are usually given in local civil time, which you convert to UT/UTC, then to the specialized times below.

### Julian Date (JD)

**What:** A continuous count of days since noon on January 1, 4713 BCE (Julian calendar). No months, no years — just a single number.

**Why it exists:** Astronomers needed a uniform time scale that doesn't reset with calendar changes, months, or years. Makes time differences trivial to calculate.

**Example:**
- January 1, 2000, 12:00 UT = JD 2451545.0 (this is the J2000.0 epoch)
- December 18, 2025, 12:00 UT ≈ JD 2460665.0

**Formula (Gregorian calendar):**
```
JD = 367*Y - INT(7*(Y+INT((M+9)/12))/4) - INT(3*(INT((Y+(M-9)/7)/100)+1)/4) + INT(275*M/9) + D + 1721028.5 + UT/24
```
(This is the algorithm from Meeus. Looks ugly but it's just arithmetic.)

### Julian Centuries (T)

**What:** Julian Date expressed as centuries from the J2000.0 epoch.

**Formula:** `T = (JD - 2451545.0) / 36525`

**Why:** Most modern ephemeris formulas use T as their time variable. The coefficients are calibrated to this epoch.

### Sidereal Time

**What:** Time measured by Earth's rotation relative to the stars (not the Sun).

A **sidereal day** is about 23h 56m 4s — roughly 4 minutes shorter than a solar day. This is because Earth also orbits the Sun, so it needs to rotate slightly more than 360° to bring the Sun back to the same position, but exactly 360° to bring the stars back.

**Greenwich Mean Sidereal Time (GMST):** Sidereal time at the Greenwich meridian.

**Local Sidereal Time (LST):** GMST adjusted for your longitude: `LST = GMST + longitude`

**Why it matters:** The Ascendant (rising sign) is determined by what ecliptic degree is on the eastern horizon at a given moment. This depends directly on local sidereal time.

### Ephemeris Time / Terrestrial Time (TT)

**What:** A uniform time scale for ephemeris calculations, independent of Earth's irregular rotation.

**Relation:** `TT = UTC + ΔT` where ΔT is a small correction (currently ~69 seconds, slowly increasing)

**For astrology:** ΔT is small enough that most astrological calculations ignore it. For high precision, you'd use TT in ephemeris formulas.

### Sources

- "Astronomical Algorithms" by Jean Meeus — Chapters 7-12
- IERS (International Earth Rotation Service) for ΔT values: https://www.iers.org/
- USNO for Julian Date conversion: https://aa.usno.navy.mil/

---

## 4. The Ecliptic and Zodiac

### The Ecliptic

**What:** The plane of Earth's orbit around the Sun. Equivalently, the apparent path the Sun traces through the sky over the course of a year.

**Key property:** All planets orbit roughly in this plane (within a few degrees), because the solar system formed from a flat disk. This is why ecliptic coordinates are natural for planetary positions.

### The Zodiac

**What:** A band of the celestial sphere extending about 8-9° on either side of the ecliptic. This band contains the apparent paths of the Sun, Moon, and planets.

**The 12 Signs:** The zodiac is divided into twelve 30° segments, each named after a constellation. Each sign spans exactly 30° of ecliptic longitude:

| Sign | Degrees | Symbol |
|------|---------|--------|
| Aries | 0° - 30° | ♈ |
| Taurus | 30° - 60° | ♉ |
| Gemini | 60° - 90° | ♊ |
| Cancer | 90° - 120° | ♋ |
| Leo | 120° - 150° | ♌ |
| Virgo | 150° - 180° | ♍ |
| Libra | 180° - 210° | ♎ |
| Scorpio | 210° - 240° | ♏ |
| Sagittarius | 240° - 270° | ♐ |
| Capricorn | 270° - 300° | ♑ |
| Aquarius | 300° - 330° | ♒ |
| Pisces | 330° - 360° | ♓ |

### Tropical vs. Sidereal Zodiac

**This is important and often confusing.**

**Tropical Zodiac (Western astrology):**
- 0° Aries is defined as the vernal equinox point (where the Sun is at the March equinox)
- The signs are aligned with the seasons, not the stars
- Due to precession, tropical 0° Aries slowly drifts against the background stars (~1° every 72 years)

**Sidereal Zodiac (Vedic/Indian astrology):**
- 0° Aries is defined relative to fixed stars
- The signs are aligned with the actual constellations
- Currently, the tropical and sidereal zodiacs are offset by about 24° (the "ayanamsa")

**For this project:** We're doing Western astrology, so **tropical zodiac**. The vernal equinox = 0° Aries, always.

### Precession of the Equinoxes

**What:** Earth's rotational axis slowly wobbles like a spinning top, completing one cycle in about 26,000 years.

**Effect:** The vernal equinox point slowly moves backward through the constellations. In ancient times, it was in Aries (hence "0° Aries"). Now it's in Pisces, heading toward Aquarius (the "Age of Aquarius").

**For calculations:** Precession matters when converting between coordinate systems or comparing positions across different epochs. For a birth chart (single moment in time), it doesn't affect the tropical zodiac positions.

### The Obliquity of the Ecliptic

**What:** The angle between the ecliptic and the celestial equator — about 23.44°.

**Why it matters:** This angle is needed to:
- Convert between ecliptic and equatorial coordinates
- Calculate the Ascendant and Midheaven
- Understand why the Sun's declination changes through the year (seasons!)

**Calculation (J2000.0):**
```
ε = 23°26'21.448" - 46.8150"T - 0.00059"T² + 0.001813"T³
```
(where T is Julian centuries from J2000.0)

### Sources

- "Astronomical Algorithms" by Jean Meeus — Chapters 21-22
- IAU standards for precession/obliquity
- Wikipedia: "Axial precession", "Ecliptic"

---

## 5. Planetary Motion

### Kepler's Laws

The foundational model for planetary motion, established by Johannes Kepler (1609-1619):

**First Law:** Planets orbit the Sun in ellipses, with the Sun at one focus.

**Second Law:** A line from the Sun to a planet sweeps out equal areas in equal times. (Planets move faster when closer to the Sun.)

**Third Law:** The square of a planet's orbital period is proportional to the cube of its semi-major axis. `T² ∝ a³`

### Orbital Elements

An orbit is fully described by six parameters:

| Element | Symbol | Meaning |
|---------|--------|---------|
| Semi-major axis | a | Size of the orbit (half the longest diameter) |
| Eccentricity | e | Shape of the orbit (0 = circle, 0-1 = ellipse) |
| Inclination | i | Tilt relative to the ecliptic |
| Longitude of ascending node | Ω | Where the orbit crosses the ecliptic going north |
| Argument of perihelion | ω | Orientation of the ellipse in the orbital plane |
| Mean anomaly | M | Position along the orbit at a reference time |

**For astrology:** We don't compute orbits from scratch. We use ephemeris formulas that give positions directly. But understanding orbital elements helps you understand why planets move as they do.

### Apparent vs. True Position

**True position:** Where the planet actually is.

**Apparent position:** Where the planet appears from Earth, accounting for:
- **Aberration:** Due to the finite speed of light and Earth's motion
- **Light-time correction:** Light from the planet takes time to reach us

**For astrology:** Apparent positions are used (what you'd actually see in the sky). Most ephemeris formulas include these corrections.

### Geocentric vs. Heliocentric

**Heliocentric:** Positions relative to the Sun (true orbital positions).

**Geocentric:** Positions as seen from Earth (what astrology uses).

The ephemeris calculates heliocentric positions first, then transforms to geocentric.

### Sources

- "Astronomical Algorithms" by Jean Meeus — Chapters 30-37
- JPL (Jet Propulsion Laboratory) ephemeris documentation
- Wikipedia: "Kepler's laws of planetary motion", "Orbital elements"

---

## 6. Ephemeris: Calculating Planetary Positions

### What Is an Ephemeris?

An **ephemeris** (plural: ephemerides) is a table or formula that gives the positions of celestial bodies at regular intervals. "Where is Mars on December 18, 2025?" — the ephemeris answers this.

### Historical Context

Before computers, astronomers calculated and published printed ephemeris tables. Astrologers used these tables directly. Now we compute positions programmatically.

### Modern Approaches

**1. VSOP87 (Variations Séculaires des Orbites Planétaires)**

- Developed by the Bureau des Longitudes (Paris)
- Series of trigonometric terms for each planet
- Accurate to arcsecond level for several millennia around J2000
- Full version has thousands of terms; truncated versions exist

**2. JPL Development Ephemeris (DE series)**

- Produced by NASA's Jet Propulsion Laboratory
- The gold standard for solar system positions
- DE440/DE441 are current versions
- Numerical integration of the full N-body problem
- Requires data files; not formula-based

**3. Simplified/Approximate Formulas**

- Lower accuracy (arcminute level) but much simpler
- Often polynomial approximations valid for limited time spans
- Good enough for most astrological purposes
- Jean Meeus provides these in "Astronomical Algorithms"

### What We Get

For any moment in time, an ephemeris gives us:

| Value | Description |
|-------|-------------|
| **Ecliptic Longitude** | Position along the zodiac (0-360°) — the primary output |
| **Ecliptic Latitude** | Degrees north/south of the ecliptic |
| **Distance** | Usually in AU (Astronomical Units) |
| **Longitude Rate** | Degrees per day — indicates retrograde if negative |

### Accuracy Considerations

| Use Case | Accuracy Needed | Approach |
|----------|-----------------|----------|
| Astrology (birth charts) | ~1 arcminute | Simplified formulas or truncated VSOP |
| Astrology (transits/progressions) | ~1 arcminute | Same |
| Astronomical observation | ~1 arcsecond | Full VSOP or JPL |
| Spacecraft navigation | ~milliarcseconds | JPL + additional modeling |

For astrology, 1 arcminute (1/60 of a degree) is plenty. The interpretive system doesn't distinguish positions that close.

### The Moon (Special Case)

The Moon's orbit is complex:
- Strongly perturbed by the Sun
- Over 100 significant periodic terms
- Several independent cycles (nodical, synodic, anomalistic, etc.)

The ELP (Éphémérides Lunaires Parisiennes) theory, also from Bureau des Longitudes, is the standard for lunar calculations. Simplified versions exist.

### Lunar Nodes

The **lunar nodes** are where the Moon's orbit crosses the ecliptic:
- **North Node (☊):** Ascending node — Moon crosses ecliptic going north
- **South Node (☋):** Descending node — exactly opposite (180° away)

**Mean Node:** Calculated from the average motion of the node
**True Node:** Includes oscillations due to solar perturbations

Astrology traditionally uses the Mean Node, though True Node is also common.

### Sources

- VSOP87: Bretagnon & Francou, 1988 (original paper)
- "Astronomical Algorithms" by Jean Meeus — Chapters 31-37 (simplified versions)
- JPL Horizons: https://ssd.jpl.nasa.gov/horizons/ (free online ephemeris)
- ELP: Chapront-Touzé & Chapront, 1988

---

## 7. The Zodiac Signs

### What They Are

The twelve zodiac signs are 30° divisions of the ecliptic, starting from the vernal equinox. Each sign has associated symbolism developed over millennia.

### Origins

- **Babylonian origins (1st millennium BCE):** The zodiac was systematized in Mesopotamia
- **Greek development:** Ptolemy's "Tetrabiblos" (2nd century CE) codified much of Western astrological tradition
- **Medieval transmission:** Preserved and developed through Arabic astronomy/astrology
- **Modern form:** Essentially unchanged since the Renaissance

### Sign Classification

Each sign has three main classifications:

**Element (Triplicity):**
| Element | Signs | Quality |
|---------|-------|---------|
| Fire | Aries, Leo, Sagittarius | Active, energetic |
| Earth | Taurus, Virgo, Capricorn | Practical, grounded |
| Air | Gemini, Libra, Aquarius | Mental, communicative |
| Water | Cancer, Scorpio, Pisces | Emotional, intuitive |

**Modality (Quadruplicity):**
| Modality | Signs | Quality |
|----------|-------|---------|
| Cardinal | Aries, Cancer, Libra, Capricorn | Initiating, beginning of seasons |
| Fixed | Taurus, Leo, Scorpio, Aquarius | Stabilizing, middle of seasons |
| Mutable | Gemini, Virgo, Sagittarius, Pisces | Adapting, end of seasons |

**Polarity:**
| Polarity | Signs | Quality |
|----------|-------|---------|
| Positive/Yang | Fire, Air signs | Active, outward |
| Negative/Yin | Earth, Water signs | Receptive, inward |

### Sign Rulerships (Domicile)

Each sign has a traditional planetary ruler:

| Sign | Traditional Ruler | Modern Ruler |
|------|-------------------|--------------|
| Aries | Mars | Mars |
| Taurus | Venus | Venus |
| Gemini | Mercury | Mercury |
| Cancer | Moon | Moon |
| Leo | Sun | Sun |
| Virgo | Mercury | Mercury |
| Libra | Venus | Venus |
| Scorpio | Mars | Pluto |
| Sagittarius | Jupiter | Jupiter |
| Capricorn | Saturn | Saturn |
| Aquarius | Saturn | Uranus |
| Pisces | Jupiter | Neptune |

Before the discovery of Uranus (1781), Neptune (1846), and Pluto (1930), only the seven classical planets were used. Modern astrology assigns the outer planets as co-rulers.

### Calculation

Converting ecliptic longitude to sign:

```
signIndex = floor(longitude / 30)  // 0 = Aries, 11 = Pisces
degreeInSign = longitude % 30
```

### Sources

- Ptolemy, "Tetrabiblos" (2nd century CE) — foundational Western astrology text
- Firmicus Maternus, "Mathesis" (4th century CE)
- Wikipedia: "Zodiac", "Triplicity", "Quadruplicity"

---

## 8. Houses: Dividing the Sky

### What Houses Are

The **houses** are a twelve-fold division of the sky based on the observer's location and time. While signs divide the ecliptic into 30° segments universally, houses divide it based on the local horizon.

The house system answers: "What part of the sky is rising? Setting? Culminating overhead?"

### Key Points (Angles)

Four points are fundamental:

| Point | Abbreviation | Location | Meaning |
|-------|--------------|----------|---------|
| **Ascendant** | ASC | Eastern horizon | Rising point, 1st house cusp |
| **Descendant** | DSC | Western horizon | Setting point, 7th house cusp |
| **Midheaven** | MC (Medium Coeli) | Southern meridian* | Culmination, 10th house cusp |
| **Imum Coeli** | IC | Northern meridian* | Anti-culmination, 4th house cusp |

*In the Northern Hemisphere. Reversed in the Southern Hemisphere.

These four points define the "angles" of the chart — the most powerful positions.

### Why Multiple House Systems Exist

**The problem:** The four angles divide the chart into quadrants, but each quadrant needs to be divided into three houses. There's no mathematically unique way to do this, leading to different systems.

**Historical evolution:** Different cultures and eras developed different methods, each with its own geometric rationale.

### Major House Systems

**Whole Sign Houses:**
- Oldest system, used in Hellenistic astrology
- The sign containing the Ascendant = 1st house, next sign = 2nd house, etc.
- Each house is exactly one sign (30°)
- Simplest to calculate; experiencing modern revival

**Equal Houses:**
- Each house cusp is 30° from the previous one
- 1st house cusp = Ascendant degree; 2nd cusp = Ascendant + 30°; etc.
- MC floats independently (not necessarily on 10th cusp)

**Placidus:**
- Most popular in modern Western astrology
- Divides each quadrant by time: the time it takes for the degree to move from horizon to meridian is divided into three equal portions
- Complex calculation, especially near extreme latitudes
- Fails above ~66° latitude (polar circles)

**Koch:**
- Similar to Placidus but uses a different point for time measurement
- Popular in German-speaking countries
- Also fails at extreme latitudes

**Campanus:**
- Divides the prime vertical into 30° arcs
- More uniform house sizes

**Regiomontanus:**
- Divides the celestial equator into 30° arcs
- Projects them onto the ecliptic

**Porphyry:**
- Simple trisection of each quadrant
- MC is on 10th cusp; the space between is divided into three equal parts

### Calculating the Ascendant

The Ascendant is the ecliptic degree rising on the eastern horizon. It depends on:
1. Local Sidereal Time (LST)
2. Observer's latitude
3. Obliquity of the ecliptic

**Formula:**
```
tan(ASC) = cos(LST) / -(sin(ε) * tan(φ) + cos(ε) * sin(LST))
```
Where:
- ε = obliquity of the ecliptic
- φ = geographic latitude
- LST = local sidereal time (in degrees, where 360° = 24h)

The formula gives a tangent, so you need to resolve the quadrant correctly.

### Calculating the Midheaven

The Midheaven is simpler — it's the ecliptic degree that's culminating (crossing the meridian):

```
tan(MC) = tan(LST) / cos(ε)
```

### House Cusps

Once you have ASC and MC, different systems calculate the intermediate cusps differently:

**Placidus cusps:** Require iterative calculation of "semi-arcs" — the time for each degree to travel from horizon to meridian.

**Equal cusps:** Just add 30° successively from ASC.

**Whole Sign:** No intermediate cusps; house = sign.

### Sources

- "The Houses: Temples of the Sky" by Deborah Houlding — history and meaning
- "Astronomical Algorithms" by Jean Meeus — Chapter 13 (rising/setting calculations)
- "The American Ephemeris" introductions — house calculation methods
- Ralph William Holden, "The Elements of House Division"

---

## 9. Aspects: Angular Relationships

### What Aspects Are

**Aspects** are specific angular relationships between planets (or other chart points). They represent how planetary energies interact.

### The Major Aspects

| Aspect | Angle | Symbol | Nature | Orb (typical) |
|--------|-------|--------|--------|---------------|
| Conjunction | 0° | ☌ | Fusion, intensity | 8-10° |
| Opposition | 180° | ☍ | Tension, polarity | 8-10° |
| Trine | 120° | △ | Harmony, ease | 6-8° |
| Square | 90° | □ | Challenge, action | 6-8° |
| Sextile | 60° | ⚹ | Opportunity, support | 4-6° |

### Minor Aspects

| Aspect | Angle | Nature | Orb (typical) |
|--------|-------|--------|---------------|
| Semi-sextile | 30° | Mild friction | 2-3° |
| Semi-square | 45° | Mild tension | 2° |
| Quintile | 72° | Creativity, talent | 2° |
| Sesquiquadrate | 135° | Mild tension | 2° |
| Quincunx (Inconjunct) | 150° | Adjustment needed | 2-3° |

### Orbs

The **orb** is the allowable deviation from exact aspect. An "exact" square is 90°; with a 6° orb, 84°-96° would all count as a square.

**Conventions vary:**
- Wider orbs for luminaries (Sun, Moon)
- Tighter orbs for minor aspects
- Some systems use fixed orbs; others vary by planet

### Aspect Calculation

```
diff = |longitude1 - longitude2|
if (diff > 180) diff = 360 - diff
// diff is now the shortest arc between them

// Check if diff is within orb of any aspect angle
```

### Historical Origin

Ptolemy established the major aspects based on sign relationships:
- Conjunction: same sign
- Sextile: 2 signs apart (60°)
- Square: 3 signs apart (90°)
- Trine: 4 signs apart (120°)
- Opposition: 6 signs apart (180°)

The "aspect" concept comes from whether signs can "see" each other (the Latin root means "to look at").

### Sources

- Ptolemy, "Tetrabiblos" — original aspect doctrine
- Any modern astrology textbook for orb conventions

---

## 10. Dignities: Planetary Strength

### What Dignities Are

**Dignities** describe how "well-placed" a planet is based on the sign it occupies. A planet in a sign where it's "dignified" expresses its nature more easily.

### Essential Dignities

**Domicile (Rulership):**
A planet in the sign it rules is "at home" — strongest placement.

| Planet | Domicile |
|--------|----------|
| Sun | Leo |
| Moon | Cancer |
| Mercury | Gemini, Virgo |
| Venus | Taurus, Libra |
| Mars | Aries, Scorpio |
| Jupiter | Sagittarius, Pisces |
| Saturn | Capricorn, Aquarius |

**Detriment:**
A planet in the sign opposite its domicile — weakened, uncomfortable.
- Sun in Aquarius (opposite Leo)
- Mars in Libra (opposite Aries)
- Etc.

**Exaltation:**
A planet in a sign where it's "honored" — elevated, powerful.

| Planet | Exaltation | Degree (traditional) |
|--------|------------|---------------------|
| Sun | Aries | 19° |
| Moon | Taurus | 3° |
| Mercury | Virgo | 15° |
| Venus | Pisces | 27° |
| Mars | Capricorn | 28° |
| Jupiter | Cancer | 15° |
| Saturn | Libra | 21° |

**Fall:**
A planet in the sign opposite its exaltation — debilitated, struggling.

### Modern Rulers

After the discovery of the outer planets:

| Planet | Modern Rulership |
|--------|------------------|
| Uranus | Aquarius |
| Neptune | Pisces |
| Pluto | Scorpio |

These are co-rulers; the traditional rulers still apply.

### Calculation

Pure lookup table — given a planet and sign, return its dignity state.

### Sources

- Ptolemy, "Tetrabiblos"
- William Lilly, "Christian Astrology" (1647) — comprehensive dignity tables
- Deborah Houlding's Skyscript: https://www.skyscript.co.uk/dignities.html

---

## 11. Additional Chart Points

### Lunar Nodes

The **nodes** are where the Moon's orbit crosses the ecliptic:

- **North Node (☊):** Also called Rahu (Vedic), Dragon's Head
- **South Node (☋):** Also called Ketu (Vedic), Dragon's Tail

The south node is always exactly opposite the north node.

**Mean vs. True Node:**
- Mean Node: Average position, smooth motion
- True Node: Includes oscillations, can appear to move backward

### Part of Fortune (Pars Fortunae)

An "Arabic Part" or "Lot" — a calculated point combining three factors:

**Daytime formula:** ASC + Moon - Sun
**Nighttime formula:** ASC + Sun - Moon

(Daytime = Sun above horizon; nighttime = Sun below horizon)

Result reduced to 0-360°. There are dozens of other Arabic Parts, but Part of Fortune is the most commonly used.

### Vertex

A point related to fate/karmic encounters. Calculated from the intersection of the ecliptic with the prime vertical in the west.

Less commonly used; calculation involves declination and latitude.

### Black Moon Lilith

The **lunar apogee** — the point where the Moon is farthest from Earth in its orbit. Not a physical body, but an orbital point.

There are different "Liliths":
- Mean Lilith (smooth motion)
- True/Oscillating Lilith (includes perturbations)
- Asteroid Lilith (1181 Lilith)
- Dark Moon Lilith (hypothetical second moon — not used seriously)

### Chiron

A small body orbiting between Saturn and Uranus (classified as a centaur, not an asteroid). Discovered 1977. Widely used in modern astrology as representing "the wounded healer."

Chiron is part of the ephemeris — calculated like a planet.

### Sources

- Various Arabic astrology texts for the Parts/Lots
- Deborah Houlding for traditional point meanings
- Zane Stein for Chiron specifically

---

## 12. Retrograde Motion

### What It Is

**Retrograde motion** is when a planet appears to move backward (westward) against the background stars, instead of its usual eastward motion.

### Why It Happens

Retrograde is an optical illusion caused by Earth's orbital motion:

- **Superior planets (Mars outward):** Earth "laps" them on the inside track. As we pass them, they appear to move backward.
- **Inferior planets (Mercury, Venus):** The geometry differs, but the effect is similar when they're between Earth and the Sun.

### Detection

A planet is retrograde when its ecliptic longitude is decreasing:

```
if (dailyMotion < 0) then retrograde = true
```

The ephemeris provides daily motion (or you can compute it from positions on consecutive days).

### Astrological Significance

Retrograde planets are traditionally considered "weakened" or "internalized" in their expression. Mercury retrograde is famously associated with communication problems (though this is pop astrology — traditional astrology is more nuanced).

### Stationary Points

**Stationary Direct (SD):** Planet stopping before resuming direct motion
**Stationary Retrograde (SR):** Planet stopping before going retrograde

These are the moments when apparent motion is zero.

### Sources

- Any astronomy textbook explains the geometry
- "Astronomical Algorithms" for calculation

---

## 13. The Birth Chart

### What It Is

A **birth chart** (natal chart, horoscope) is a snapshot of the sky at the moment of birth, from the location of birth. It shows:

1. **Positions of celestial bodies** in signs and houses
2. **The Ascendant and house cusps** based on birth time/location
3. **Aspects** between planets
4. **Derived points** (nodes, Part of Fortune, etc.)

### Required Inputs

| Input | Precision Needed | Effect on Chart |
|-------|------------------|-----------------|
| **Date** | Exact | Planetary positions (slow-moving planets are fine with just date) |
| **Time** | Exact (minute-level ideal) | House cusps, Ascendant, Moon position |
| **Location** | City-level | House cusps, Local Sidereal Time |

**If no birth time:** Houses can't be calculated. A "solar chart" uses the Sun's position as the Ascendant. This loses significant information.

### Chart Construction (Algorithm Outline)

1. **Convert birth time to Julian Date**
2. **Calculate UT (Universal Time) from local time + timezone**
3. **Calculate Local Sidereal Time (LST)** from UT and longitude
4. **Calculate planetary positions** using ephemeris (input: JD)
5. **Calculate Ascendant and MC** from LST, latitude, and obliquity
6. **Calculate house cusps** using chosen house system
7. **Determine which house each planet occupies**
8. **Calculate aspects** between all pairs of planets
9. **Derive additional points** (nodes, Part of Fortune, etc.)
10. **Look up dignities** for each planet

### Output

The chart is typically represented as:
- A circular diagram (the traditional "wheel")
- Or a table of positions, aspects, and interpretive data

### Sources

- Any complete astrology textbook
- Software like Solar Fire, Astro.com for reference implementations

---

## Next Steps

With this conceptual foundation, implementation can proceed:

1. **Time module:** Julian Date, Sidereal Time
2. **Ephemeris module:** Planetary positions (start with simplified formulas)
3. **Zodiac module:** Sign calculations, dignities
4. **Houses module:** ASC, MC, house systems
5. **Aspects module:** Aspect detection
6. **Chart module:** Combine everything into a birth chart

Each module maps directly to sections above. The concepts are now clear; the code is just translating the math.

---

## References (Consolidated)

### Primary Sources

| Resource | What It Covers |
|----------|----------------|
| **"Astronomical Algorithms" by Jean Meeus** | THE computational astronomy reference. Contains all formulas needed. |
| **Ptolemy, "Tetrabiblos"** | The foundational Western astrology text (2nd century CE) |
| **"Practical Astronomy with your Calculator" by Peter Duffett-Smith** | Simpler introduction to astronomical calculations |

### Online Resources

| Resource | URL |
|----------|-----|
| JPL Horizons | https://ssd.jpl.nasa.gov/horizons/ |
| USNO (time, Julian Date) | https://aa.usno.navy.mil/ |
| Skyscript (traditional astrology) | https://www.skyscript.co.uk/ |
| Astro.com (free chart calculation) | https://www.astro.com/ |

### Academic Papers

- VSOP87: Bretagnon, P. & Francou, G. (1988). "Planetary theories in rectangular and spherical variables. VSOP87 solutions." Astronomy and Astrophysics.
- ELP: Chapront-Touzé, M. & Chapront, J. (1988). "ELP 2000-85: A semi-analytical lunar ephemeris adequate for historical times."

---

*This document will be updated as concepts are explored and implemented.*

