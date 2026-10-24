"""Fetch IANA tzdata2026c, compile with zic, and record independent day bounds.
Requires Python 3.9+, curl, tar and /usr/sbin/zic. Run from the repository root.
Cached archive lives outside the repository; no Celestine code is used.
"""
import datetime as dt
import json
import pathlib
import subprocess
import tempfile
import sys
import zoneinfo

version = '2026c'
archive = pathlib.Path(tempfile.gettempdir()) / f'tzdata{version}.tar.gz'
local = '--local' in sys.argv
if not local and not archive.exists():
    subprocess.run(['curl', '-fLsS', f'https://data.iana.org/time-zones/releases/tzdata{version}.tar.gz', '-o', str(archive)], check=True)
cases = {
    'Europe/Berlin': ['2026-03-29', '2026-10-25'],
    'America/New_York': ['2026-03-08', '2026-11-01'],
    'Australia/Lord_Howe': ['2026-04-05', '2026-10-04'],
    'America/Sao_Paulo': ['2018-11-04'],
    'America/Santiago': ['2022-09-11'],
    'America/Havana': ['2026-03-08', '2026-11-01'],
    'Asia/Beirut': ['2026-03-29'],
    'Pacific/Apia': ['2011-12-29', '2011-12-30'],
    'Asia/Kathmandu': ['2026-01-01', '1986-01-01'],
    'Asia/Kolkata': ['2026-01-01'],
    'Australia/Eucla': ['2026-01-01'],
    'Pacific/Kiritimati': ['2026-01-01'],
    'Africa/Monrovia': ['1972-01-07'],
    'UTC': ['2026-01-01'],
}
rows = []
with tempfile.TemporaryDirectory() as directory:
    root = pathlib.Path(directory)
    if local:
        source = pathlib.Path('/usr/share/zoneinfo/tzdata.zi')
        assert source.read_text().splitlines()[0] == f'# version {version}'
        sources = [str(source)]
    else:
        subprocess.run(['tar', '-xf', str(archive), '-C', directory], check=True)
        sources = [str(root / f) for f in ['africa', 'antarctica', 'asia', 'australasia', 'europe', 'northamerica', 'southamerica', 'etcetera']]
    subprocess.run(['/usr/sbin/zic', '-d', str(root / 'zones'), *sources], check=True)
    for name, dates in cases.items():
        with (root / 'zones' / name).open('rb') as file:
            zone = zoneinfo.ZoneInfo.from_file(file)
        for date in dates:
            target = dt.date.fromisoformat(date)
            # Independent minute walk followed by second-wise boundary refinement.
            origin = dt.datetime.combine(target, dt.time(), dt.timezone.utc) - dt.timedelta(days=2)
            instants = [origin + dt.timedelta(minutes=i) for i in range(5 * 1440)]
            matching = [t for t in instants if t.astimezone(zone).date() == target]
            row = dict(zone=name, date=date)
            if matching:
                start = matching[0]
                while (start - dt.timedelta(seconds=1)).astimezone(zone).date() == target:
                    start -= dt.timedelta(seconds=1)
                end = matching[-1] + dt.timedelta(minutes=1)
                while (end - dt.timedelta(seconds=1)).astimezone(zone).date() != target:
                    end -= dt.timedelta(seconds=1)
                row.update(start=list(start.timetuple()[:6]), end=list(end.timetuple()[:6]), startOffset=start.astimezone(zone).utcoffset().total_seconds()/60, endOffset=end.astimezone(zone).utcoffset().total_seconds()/60, hours=(end-start).total_seconds()/3600)
            rows.append(row)
pathlib.Path('src/events/__fixtures__/local-day/iana.json').write_text(json.dumps(rows, indent=2) + '\n')
subprocess.run(['npx', 'biome', 'format', '--write', 'src/events/__fixtures__/local-day/iana.json'], check=True)
