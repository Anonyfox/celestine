// TypeScript names symbol-keyed members `__@iterator@1747`; the numeric id is a checker-internal
// counter that shifts whenever unrelated files are added. Normalize to the stable `[Symbol.iterator]`.
const SYMBOL_ID = /__@([A-Za-z_$][\w$]*)@\d+/g;
export const stableApiName = (text) => text.replace(SYMBOL_ID, '[Symbol.$1]');
/** Deep-normalizes keys and string values of an API snapshot. */
export const stableApi = (snapshot) => JSON.parse(stableApiName(JSON.stringify(snapshot)));
