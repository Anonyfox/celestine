# Contributing

Use Node >=20; `.nvmrc` selects the recommended version. Install with `npm ci`.

Before submitting, run the complete regression check:

```sh
npm run check
```

Read [AGENTS.md](AGENTS.md) for the regression contract: precision against JPL
Horizons fixtures, size, performance, API snapshots, and ratchet checks. Budgets
may only tighten without explicit maintainer authorization. Do not hand-edit
reference fixtures or loosen tolerances to make a check pass.

For precision reports, include the input, actual and expected values, reference
source and settings, coordinate frame, and time scale. Include a minimal program
that reproduces the discrepancy.

Add tests for new behavior and a Keep a Changelog entry under `[Unreleased]` in
CHANGELOG.md for user-visible changes. Keep pull requests focused.
