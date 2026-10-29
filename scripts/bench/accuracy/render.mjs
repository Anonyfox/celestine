// All dynamic text passes through escapeHtml(); chart coordinates are finite numbers.
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const f = (value) => Number(value).toLocaleString('en-US', { maximumSignificantDigits: 3 });
const repo = 'https://github.com/Anonyfox/celestine/tree/main/';
function table(headings, rows) {
  return `<div class="scroll"><table><thead><tr>${headings.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v, i) => `<${i ? 'td' : 'th'}>${Array.isArray(v) ? `${escapeHtml(v[0])}<small>${escapeHtml(v[1])}</small>` : escapeHtml(v)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function residualTable(data, unit) {
  return table(
    ['Metric', 'N', `Max (${unit})`, `Median (${unit})`],
    Object.entries(data).map(([name, s]) => [name, s.count, f(s.max), f(s.median)]),
  );
}
function svg(title, height, body, legend) {
  return `<figure><svg role="img" aria-label="${escapeHtml(title)}" viewBox="0 0 600 ${height}" width="600" height="${height}"><title>${escapeHtml(title)}</title>${body}</svg><figcaption>${escapeHtml(legend)}</figcaption></figure>`;
}
function positionsChart(positions) {
  const floor = 0.01;
  const maxLog = Math.ceil(Math.log10(Math.max(...Object.values(positions).map((s) => s.max))));
  const x = (n) => 145 + ((Math.log10(Math.max(floor, n)) + 2) / (maxLog + 2)) * 420;
  let body = '<text x="145" y="22">Longitude error (″, log scale)</text>';
  for (let power = -2; power <= maxLog; power++) {
    const px = x(10 ** power);
    const label =
      power >= 4 ? `10${['⁴', '⁵', '⁶'][power - 4]}` : (10 ** power).toFixed(Math.max(0, -power));
    body += `<path class="grid" d="M${px},36v365"/><text x="${px}" y="430" text-anchor="middle">${label}</text>`;
  }
  Object.entries(positions).forEach(([name, s], i) => {
    const y = 53 + i * 30;
    body += `<text x="0" y="${y + 5}">${escapeHtml(name)}</text><path class="max" d="M145,${y - 3}H${x(s.max)}"/><path class="median" d="M145,${y + 5}H${x(s.median)}"/>`;
  });
  return svg(
    'Maximum and median longitude residual by body',
    448,
    body,
    'Violet: maximum; slate: median. Values below 0.01″ are plotted at 0.01″.',
  );
}
function niceBound(max) {
  const step = 10 ** Math.floor(Math.log10(max));
  return [1, 1.5, 2, 2.5, 5, 10].find((n) => n * step >= max) * step;
}
function residualChart(title, rows, xValue, ticks, legend, eclipse = false) {
  const lo = Math.min(...rows.map(xValue));
  const hi = Math.max(...rows.map(xValue));
  const bound = niceBound(Math.max(...rows.map((r) => Math.abs(r.error))));
  const x = (v) => 65 + ((v - lo) / (hi - lo)) * 510;
  const y = (v) => 145 - (v / bound) * 95;
  let body = `<text x="65" y="23">${escapeHtml(title)}</text>`;
  for (const v of [-bound, -bound / 2, 0, bound / 2, bound])
    body += `<path class="${v === 0 ? 'zero' : 'grid'}" d="M65,${y(v)}H575"/><text x="55" y="${y(v) + 6}" text-anchor="end">${f(v)}</text>`;
  for (const r of rows) {
    const px = x(xValue(r));
    const py = y(r.error);
    body +=
      eclipse && r.kind === 'lunar'
        ? `<path class="lunar" d="M${px},${py - 5}l5,5l-5,5l-5,-5z"/>`
        : `<circle class="dot" cx="${px}" cy="${py}" r="${eclipse ? 4 : 2}"/>`;
  }
  for (const [value, label] of ticks)
    body += `<text x="${x(value)}" y="275" text-anchor="middle">${label}</text>`;
  return svg(title, 290, body, legend);
}
function stripChart(rows) {
  return residualChart(
    'Greatest-eclipse residual (s, TT)',
    rows,
    (r) => r.jd,
    [
      [2458849.5, 2020],
      [2460676.5, 2025],
      [2462502.5, 2030],
    ],
    'Violet circles: solar; outlined diamonds: lunar. Horizontal axis: TT year.',
    true,
  );
}
function deltaChart(data) {
  return residualChart(
    'ΔT model − USNO (s)',
    Object.values(data).flatMap((s) => s.rows),
    (r) => r.year,
    [1700, 1800, 1900, 2000].map((y) => [y, y]),
    'Violet: signed residual for every committed USNO table row. Horizontal axis: decimal year.',
  );
}
function timingRows(timing, kind, body) {
  return ['mean', 'true']
    .flatMap((frame) => timing[`Horizons ${kind} ${frame}`].rows)
    .filter((r) => !body || r.body === body);
}
const maximum = (rows) => Math.max(...rows.map((r) => Math.abs(r.error)));
function bodyTimingTable(timing, kind) {
  const names = [...new Set(timingRows(timing, kind).map((r) => r.body))];
  const divisor = kind === 'ingresses' ? 60 : 1;
  return `<h3>${kind === 'ingresses' ? 'Sign ingresses' : 'Stations'} by body</h3>${table(
    ['Body', 'Mean frame (min)', 'True frame (min)'],
    names.map((body) => [
      body,
      ...['mean', 'true'].map((frame) =>
        f(
          maximum(timing[`Horizons ${kind} ${frame}`].rows.filter((r) => r.body === body)) /
            divisor,
        ),
      ),
    ]),
  )}`;
}
export function render(r) {
  const planets = Object.entries(r.positions).filter(
    ([name]) => !['Moon', 'Chiron', 'Chiron precise'].includes(name),
  );
  const worst = planets.reduce((a, b) => (a[1].max > b[1].max ? a : b));
  const all = r.eclipses.combined;
  const angleMax = Math.max(...Object.values(r.angles).map((s) => s.max));
  const angleHeadline = Number.isFinite(angleMax)
    ? `Ascendant and MC match ERFA within ${f(angleMax)}″.`
    : 'Ascendant and MC references are unavailable.';
  const nonPluto = timingRows(r.timing, 'ingresses').filter((row) => row.body !== 'Pluto');
  const worstIngress = nonPluto.reduce((a, b) => (Math.abs(a.error) > Math.abs(b.error) ? a : b));
  const chiron = r.positions.Chiron;
  const thresholds = [];
  function flatten(value, path = '') {
    for (const [name, v] of Object.entries(value)) {
      const key = path ? `${path}.${name}` : name;
      if (v !== null && typeof v === 'object') flatten(v, key);
      else {
        const parts = key.split('.');
        const magnitudeKey = {
          solarMagnitude: ['solar', 'maxMagnitudeError'],
          lunarUmbralMagnitude: ['lunar', 'maxUmbralMagnitudeError'],
          lunarPenumbralMagnitude: ['lunar', 'maxPenumbralMagnitudeError'],
        }[parts[0] === 'eclipses' ? parts[1] : ''];
        let measured = magnitudeKey ? r.eclipses[magnitudeKey[0]] : r[parts[0]][parts[1]];
        measured = magnitudeKey
          ? measured?.[magnitudeKey[1]]
          : parts[0] === 'positions'
            ? measured[parts[2] === 'latitude' ? 'maxLatitude' : 'max']
            : measured?.max;
        const unit = magnitudeKey
          ? ''
          : parts[0] === 'timing'
            ? r.timing[parts[1]].unit
            : ['eclipses', 'deltaT'].includes(parts[0])
              ? 's'
              : '″';
        const divisor = parts[0] === 'timing' && parts[1].includes('ingresses') ? 60 : 1;
        thresholds.push([
          key,
          measured === undefined ? 'Unavailable' : f(measured / divisor),
          f(v / divisor),
          divisor === 60 ? 'min' : unit,
        ]);
      }
    }
  }
  flatten(r.thresholds);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Measured Celestine residuals against NASA, JPL Horizons, ERFA and USNO reference fixtures."><title>Celestine accuracy</title><style>
:root{color-scheme:light dark;--bg:#fff;--text:#334155;--muted:#475569;--line:#cbd5e1;--accent:#7c3aed}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,sans-serif}main,nav{max-width:900px;margin:auto;padding:20px}nav{display:flex;gap:24px;border-bottom:1px solid var(--line)}a{color:var(--accent);text-underline-offset:3px}h1{font-size:clamp(2rem,6vw,3.2rem);line-height:1.15}h2{margin-top:2.6rem;line-height:1.25}p{max-width:78ch}.meta{color:var(--muted);font-size:.9rem}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:.88rem;font-variant-numeric:tabular-nums}th,td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:right}th:first-child{text-align:left}td{white-space:nowrap}small{display:block;color:var(--muted);font-size:.72rem;font-weight:400}figure{margin:24px 0}figcaption{font-size:.85rem;color:var(--muted)}.zero{stroke:var(--muted);stroke-width:1.2}summary{cursor:pointer}details table{table-layout:fixed}details th:first-child{width:45%;overflow-wrap:anywhere}.fixtures{display:flex;flex-wrap:wrap;gap:4px 24px}.fixtures li{margin:0}thead th{vertical-align:bottom}code{overflow-wrap:anywhere;font-size:.9em}svg{display:block;width:100%;max-width:600px;height:auto;margin:24px auto;overflow:visible}svg text{fill:var(--text);font:19px system-ui,sans-serif}.grid{stroke:var(--line);stroke-width:.6}.max{stroke:var(--accent);stroke-width:5}.median{stroke:var(--muted);stroke-width:4}.dot{fill:var(--accent)}.lunar{fill:var(--bg);stroke:var(--text);stroke-width:1.4}.notice{border-left:3px solid var(--accent);padding-left:16px}li{margin-bottom:8px}.fixtures{overflow-wrap:anywhere;font-size:.85rem}@media(prefers-color-scheme:dark){:root{--bg:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--line:#475569}a{color:#a78bfa}}@media(max-width:450px){main,nav{padding:12px}table{font-size:.75rem}th,td{padding:8px 3px}th:first-child{min-width:0}small{font-size:.65rem}}
</style></head><body><nav><a href="../index.html">API docs</a><a href="https://github.com/Anonyfox/celestine">GitHub</a></nav><main>
<h1>Celestine accuracy</h1><p>Celestine finds ${all.foundCount === all.canonCount ? `all ${all.canonCount}` : `${all.foundCount} of ${all.canonCount}`} solar and lunar eclipses of 2020–2030 in the NASA Five Millennium Canon; the worst greatest-eclipse time differs by ${f(all.max)} s. Against JPL Horizons, Sun through Pluto stay within ${f(worst[1].max)}″ in longitude (worst: ${escapeHtml(worst[0])}) and the Moon within ${f(r.positions.Moon.max)}″. ${escapeHtml(angleHeadline)}</p>
<p class="meta">Celestine ${escapeHtml(r.version)} · run ${escapeHtml(r.runDate.slice(0, 10))} (UTC) · Node ${escapeHtml(r.nodeVersion)}</p>
<p class="meta">Reproduce: <code>npm run build &amp;&amp; npm run bench:accuracy</code></p>
${r.missing.length ? `<p class="notice">Incomplete benchmark: ${r.missing.length} required reference fixtures are missing. Check mode fails until those references are generated. No node or ERFA angle accuracy claim is available.</p>` : ''}
<h2>Summary</h2>${table(
    ['Area / reference', 'Worst residual'],
    [
      ['Eclipses vs NASA canon', `${all.foundCount}/${all.canonCount}, ${f(all.max)} s`],
      ['Sun–Pluto vs Horizons', `${f(worst[1].max)}″ (${worst[0]})`],
      ['Moon vs Horizons', `${f(r.positions.Moon.max)}″`],
      ['Chiron precise vs Horizons', `${f(r.positions['Chiron precise'].max)}″`],
      ['Mean node vs ERFA faom03', r.node.mean ? `${f(r.node.mean.max)}″` : 'Unavailable'],
      ['ASC/MC vs ERFA', Number.isFinite(angleMax) ? `${f(angleMax)}″` : 'Unavailable'],
      ['ΔT 1955–2026 vs USNO tables', `${f(r.deltaT['1955–2026'].max)} s`],
      ['Lunar phases vs USNO', `${f(r.timing['USNO phases'].max)} s`],
      [
        'Sign ingresses vs Horizons (excluding Pluto)',
        `${f(Math.abs(worstIngress.error) / 60)} min`,
      ],
    ],
  )}
<h2>Eclipses</h2><p>NASA Five Millennium solar and lunar canons, greatest-eclipse instants in TT, 2020-01-01 inclusive through 2031-01-01 exclusive. Each reference is matched once to the nearest same-kind event within one day. Residuals compare TT directly, without applying NASA’s ΔT to civil times.</p>
${table(
  [
    'Kind',
    'Canon / found',
    'Type agrees',
    'Max / median (s)',
    'Magnitude max |Δ|',
    'Umbral max |Δ|',
    'Penumbral max |Δ|',
  ],
  Object.entries(r.eclipses).map(([name, s]) => [
    name,
    `${s.canonCount} / ${s.foundCount}`,
    `${s.typeAgreement}/${s.count}`,
    `${f(s.max)} / ${f(s.median)}`,
    f(s.maxMagnitudeError, 6),
    f(s.maxUmbralMagnitudeError, 6),
    f(s.maxPenumbralMagnitudeError, 6),
  ]),
)}
<h3>2026–2028 catalog validation</h3><p>TD is TT. UT residuals use NASA’s predicted ΔT separately from Celestine’s model. Magnitude is solar, lunar umbral, or lunar penumbral for penumbral-only events.</p>
${table(
  [
    'Date',
    'Kind',
    'NASA / Celestine type',
    'TD error (s)',
    'UT error (s)',
    'Magnitude Δ',
    'Gamma Δ',
  ],
  r.eclipses2026To2028.map((e) => [
    e.date,
    e.kind,
    `${e.referenceType} / ${e.type}`,
    f(e.error),
    f(e.utError),
    f(e.magnitudeError, 6),
    f(e.gammaError, 6),
  ]),
)}
${stripChart(all.rows)}
<h2>Positions</h2><p>Apparent geocentric longitude and latitude, TT input, mean ecliptic and mean equinox of date. These reuse the Horizons LT+S vectors and frame transformations checked by the precision tests, including their independent quantity-31 cross-check. Longitude residuals wrap to ±180°. Precise Chiron uses only epochs inside PRECISE_RANGE. Every committed sample is measured.</p>
${table(
  ['Body', 'N', 'Lon max (″)', 'Lon median (″)', 'Lat max (″)'],
  Object.entries(r.positions).map(([name, s]) => [
    [name, `${s.start} to ${s.end}`],
    s.count,
    f(s.max),
    f(s.median),
    f(s.maxLatitude),
  ]),
)}${positionsChart(r.positions)}
<h2>Lunar node</h2><p>Public getNorthNode is the true-node default. Its finite perturbation series is compared with the instantaneous geometric osculating node of the Moon about Earth from Horizons ELEMENTS. These definitions differ; the residual includes that model difference. Orbit normals are rotated from fixed ICRF/J2000 ecliptic coordinates to mean ecliptic and equinox of date with ERFA ecm06 (IAU 2006), using TT. Mean node is compared with ERFA faom03, the IERS 2003 fundamental argument already referred to the mean equinox of date.</p>
${Object.keys(r.node).length ? residualTable(r.node, '″') : '<p>Required Horizons and ERFA node fixtures are unavailable; no residual measured.</p>'}
<h2>Ascendant and MC</h2><p>ERFA gmst82 and obl80 mirror chart conventions: UT treated as UT1, mean sidereal time plus east-positive longitude, mean obliquity evaluated at UT. No GAST, nutation or ΔT enters the angles. Independent vector geometry determines the eastern horizon intersection. The reference grid has 208 cases spanning 1900–2100, latitudes −65° to +65° and varied longitudes. Celestine uses its public calculateAngles with its own GMST and obliquity. This isolates implementation residuals under that convention, without validating Earth-rotation forecasts.</p>
${Object.keys(r.angles).length ? residualTable(r.angles, '″') : '<p>Required pyerfa angle fixture is unavailable; no residual measured.</p>'}
<h2>ΔT</h2><p>TT minus UT1 model against the USNO historic and monthly tables, including their overlap as separate observations. Decimal years use JD = 2451545 + (year − 2000) × 365.25, exactly as the existing tests. Residuals measure agreement with those tables, not observational uncertainty. The pre-1800 rows characterize a reference disagreement; the model follows NASA’s newer historical polynomial there.</p>${residualTable(r.deltaT, 's')}${deltaChart(r.deltaT)}
<h2>Event timing</h2><p>All events in the committed fixtures are used; no sampling. USNO phases and seasons compare returned jdUT against minute-rounded reference UT (up to 30 s of the residual can be rounding). Searches convert UT year boundaries to TT. Horizons stations use ±10-day TT windows; ingresses use ±0.2-day TT windows. Mean-frame comparisons use jdMean; true-equinoctial comparisons use native jd and includeNutation: true. Station types and USNO event counts must agree.</p>
${table(
  ['Reference / frame', 'N', 'Max |error|', 'Median'],
  Object.entries(r.timing).map(([name, s]) => [
    name,
    s.count,
    `${f(s.max / (name.includes('ingresses') ? 60 : 1))} ${name.includes('ingresses') ? 'min' : s.unit}`,
    `${f(s.median / (name.includes('ingresses') ? 60 : 1))} ${name.includes('ingresses') ? 'min' : s.unit}`,
  ]),
)}
${bodyTimingTable(r.timing, 'ingresses')}${bodyTimingTable(r.timing, 'stations')}
<h2>Known gaps</h2><ul>
<li>Default Chiron reaches ${(chiron.max / 3600).toFixed(2)}° longitude error over ${escapeHtml(chiron.start)} to ${escapeHtml(chiron.end)} against Horizons${r.chironRecent ? `; in 2020–2030, ${r.chironRecent.count} samples reach ${(r.chironRecent.max / 3600).toFixed(2)}°` : ''}. Opt-in celestine/precise reduces the maximum to ${f(r.positions['Chiron precise'].max)}″ on ${r.positions['Chiron precise'].count} common samples.</li>
${r.node.true ? `<li>Celestine’s true node is a truncated perturbation series; against the Horizons osculating node, the definition Swiss Ephemeris uses for its true node, its maximum residual is ${f(r.node.true.max)}″ (${f(r.node.true.max / 3600)}°), median ${f(r.node.true.median)}″, so charts using the true node can differ by up to that amount from Horizons-derived values. The mean node matches ERFA faom03 within ${f(r.node.mean.max)}″.</li>` : ''}
<li>Against Horizons across both frames, Pluto stations differ by up to ${f(maximum(timingRows(r.timing, 'stations', 'Pluto')))} min and ingresses by up to ${f(maximum(timingRows(r.timing, 'ingresses', 'Pluto')) / 3600)} h; the worst non-Pluto ingress differs by ${f(Math.abs(worstIngress.error) / 60)} min (${escapeHtml(worstIngress.body)}). At Pluto’s slow ingress motion, a 3″ longitude error can move the crossing by hours.</li>
<li>Before 1800, ΔT differs from the older USNO table by up to ${f(r.deltaT['1657–1799'].max)} s. Future ΔT is extrapolated and unmeasured here.</li>
<li>Moon longitude reaches ${f(r.positions.Moon.max)}″ worst residual against Horizons, about ${(r.positions.Moon.max / worst[1].max).toFixed(1)}× the worst planet (${escapeHtml(worst[0])}).</li></ul>
<h2>Method</h2><p>Residuals are absolute for maxima and medians. Medians average the two central values for even counts. Signed residuals and every measured row are preserved in <a href="accuracy.json">accuracy.json</a>, together with thresholds, fixture paths, version and run date. Longitude and angular residuals use the shortest wrapped separation. Results are deterministic apart from the run date and recorded runtime version.</p>
<p>References: <a href="https://ssd.jpl.nasa.gov/api/horizons.api">JPL Horizons API</a>; <a href="https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html">NASA solar canon</a>; <a href="https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html">NASA lunar canon</a>; <a href="https://github.com/liberfa/pyerfa">pyerfa</a> and <a href="https://github.com/liberfa/erfa">ERFA</a>; <a href="https://aa.usno.navy.mil/data/api">USNO API</a>; <a href="https://maia.usno.navy.mil/ser7/historic_deltat.data">USNO historic ΔT</a> and <a href="https://maia.usno.navy.mil/ser7/deltat.data">monthly ΔT</a>. Fixture READMEs document retrieval and frame conversion.</p>
<p>Thresholds are deterministic regression guards, approximately 1.5 times the measured worst residual rounded upward to a clean value. They are not physical uncertainty estimates. Eclipse counts, unique matches, types, station types and USNO counts are also checked.</p>
<details><summary>Guard thresholds (${thresholds.length} metrics)</summary>${table(
    ['Metric', 'Measured max', 'Threshold', 'Unit'],
    thresholds,
  )}</details>
<p>Reproduce with <code>npm run build &amp;&amp; npm run bench:accuracy</code>. Validate thresholds with <code>node scripts/bench/accuracy.mjs --check</code>. The report reads committed fixtures without network requests. Documentation deployment runs this check after TypeDoc.</p>
<ul class="fixtures">${r.fixtures.map((path) => `<li><a href="${repo}${escapeHtml(path)}">${escapeHtml(path.split('/').pop())}</a></li>`).join('')}${r.missing.map((path) => `<li>Missing: ${escapeHtml(path)}</li>`).join('')}</ul><p class="fixtures">Provenance: <a href="${repo}src/events/__fixtures__/README.md">event fixtures</a>, <a href="${repo}src/ephemeris/__fixtures__/horizons/README.md">position fixtures</a>, <a href="${repo}src/time/__fixtures__/delta-t/README.md">ΔT tables</a>, <a href="${repo}src/houses/__fixtures__/README.md">angle convention</a>, <a href="${repo}src/ephemeris/__fixtures__/horizons-node/README.md">node conversion</a>.</p>
</main></body></html>`;
}
