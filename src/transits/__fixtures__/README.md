# Transit pass checks

`default-search.json` records the complete serialized result of `searchTransits`
at baseline commit `71ff871411b79e0f21526c34a292c450a4ae1ee2`, before pass splitting.
It deliberately preserves merged timings and duplicate entries. It is a compatibility
snapshot, not an astronomical reference. Its `params` field contains the reproduction.
The regression compares compact JSON serialization, including property order.

