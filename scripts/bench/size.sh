#!/bin/sh
# min+gz of full ESM bundle, and of a tree-shaken entry importing calculateChart
cd "$(dirname "$0")/../.."
npx esbuild dist/index.js --minify --format=esm --log-level=error > /tmp/cel-min.js
printf "full ESM min: %s B, min+gz: %s B\n" $(wc -c </tmp/cel-min.js) $(gzip -9c /tmp/cel-min.js | wc -c)
echo "import {calculateChart} from '$PWD/dist/index.js'; console.log(calculateChart);" > "${TMPDIR:-/tmp}/cel-entry.mjs"
npx esbuild "${TMPDIR:-/tmp}/cel-entry.mjs" --bundle --minify --format=esm --log-level=error > /tmp/cel-chart.js
printf "calculateChart bundle min: %s B, min+gz: %s B\n" $(wc -c </tmp/cel-chart.js) $(gzip -9c /tmp/cel-chart.js | wc -c)
for f in mercury pluto; do npx esbuild src/ephemeris/planets/$f.ts --bundle --minify --format=esm --log-level=error | gzip -9c | wc -c | xargs printf "$f.ts bundle min+gz: %s B\n"; done
