const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./load-typescript.cjs');
const { calculateChargeSettlement } = load('lib/charge-settlement.ts');
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/src/test/resources/settlement-cases.json'), 'utf8'));
for (const example of fixtures) {
  test(example.name, () => {
    const result = calculateChargeSettlement(example.plannedSupport, example.paidTotal, example.actualCost);
    for (const [key, expected] of Object.entries(example.expected)) assert.equal(result[key], expected, key);
    assert.equal(result.appliedSupport + result.participantExpense, example.actualCost);
    assert.equal(result.balanceChange, example.paidTotal - example.actualCost);
  });
}
test('invalid and fractional amounts are rejected', () => {
  assert.throws(() => calculateChargeSettlement(-1, 60000, 100000));
  assert.throws(() => calculateChargeSettlement(0, 1.5, 100000));
  assert.throws(() => calculateChargeSettlement(0, 1, NaN));
});
