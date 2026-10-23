import { readFileSync, writeFileSync } from 'node:fs';

export const budgets = JSON.parse(readFileSync('budgets.json', 'utf8'));
export const updating = process.argv.includes('--update');
export function update(section, values, higherIsTighter = false) {
  const loosened = [];
  function compare(old, next, path) {
    for (const [key, value] of Object.entries(old)) {
      const label = `${path}.${key}`;
      if (!(key in next)) loosened.push(`${label} removed`);
      else if (typeof value === 'object') compare(value, next[key], label);
      else if (higherIsTighter ? next[key] < value : next[key] > value)
        loosened.push(`${label}: ${value} → ${next[key]}`);
    }
  }
  compare(budgets[section], values, section);
  if (loosened.length && process.env.BUDGET_INCREASE_APPROVED !== '1')
    throw new Error(
      `Refusing looser budgets without BUDGET_INCREASE_APPROVED=1:\n${loosened.join('\n')}`,
    );
  budgets[section] = values;
  writeFileSync('budgets.json', `${JSON.stringify(budgets, null, 2)}\n`);
}
export function gate(rows) {
  console.table(rows);
  if (rows.some((row) => row.status === 'FAIL')) process.exitCode = 1;
}
