## Summary

Describe the problem and resulting behavior.

## Checklist

- [ ] `npm run check` passes locally.
- [ ] Precision is unchanged or tighter against Horizons; if ephemeris changed, paste maximum arcsecond errors before/after.
- [ ] Paste gzip size before/after for each affected entry point.
- [ ] If a hot path changed, paste performance medians before/after.
- [ ] Public API changes are additions only, or changes are explained below.
- [ ] No budget, tolerance, or regression guard has been loosened.
- [ ] User-visible changes have a CHANGELOG `[Unreleased]` entry.
- [ ] New behavior has tests.

Measurements and API explanation:
