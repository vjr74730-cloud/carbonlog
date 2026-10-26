// Unit tests for services/calculator.js. They need no database and no dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCo2, validateEntryInput, isValidIsoDate, ValidationError, MAX_AMOUNT } = require('../services/calculator');

const electricity = { category: 'electricity', unit: 'kWh', kg_co2_per_unit: 0.38 };
const car = { category: 'car_travel', unit: 'km', kg_co2_per_unit: 0.17 };

test('normal case: 100 kWh x 0.38 = 38 kg', () => {
  assert.equal(calculateCo2('electricity', 100, 'kWh', electricity), 38);
});

test('unit conversion: 2 MWh is treated as 2000 kWh', () => {
  assert.equal(calculateCo2('electricity', 2, 'MWh', electricity), 760);
});

test('unit conversion: miles are converted to km before applying the factor', () => {
  // 100 miles = 160.9344 km; x 0.17 = 27.358848 -> 27.359
  assert.equal(calculateCo2('car_travel', 100, 'miles', car), 27.359);
});

// AI-generated code often confuses units. These tests pin the correct behaviour.
test('UNIT MIX-UP: the same number in MWh is exactly 1000x the kWh result', () => {
  const kwh = calculateCo2('electricity', 5, 'kWh', electricity);
  const mwh = calculateCo2('electricity', 5, 'MWh', electricity);
  assert.equal(mwh, kwh * 1000);
});

test('UNIT MIX-UP: a distance unit is rejected for electricity', () => {
  assert.throws(() => calculateCo2('electricity', 10, 'km', electricity), ValidationError);
});

test('UNIT MIX-UP: unit matching is case-sensitive (MWH and mWh are rejected)', () => {
  assert.throws(() => calculateCo2('electricity', 1, 'MWH', electricity), ValidationError);
  assert.throws(() => calculateCo2('electricity', 1, 'mWh', electricity), ValidationError);
});

test('invalid unit and unknown category are rejected with a field name', () => {
  assert.throws(() => calculateCo2('electricity', 1, 'liters', electricity), (e) => e instanceof ValidationError && e.field === 'unit');
  assert.throws(() => calculateCo2('teleportation', 1, 'km', electricity), (e) => e instanceof ValidationError && e.field === 'category');
});

test('zero, negative, NaN, Infinity and non-numbers are rejected', () => {
  for (const bad of [0, -5, NaN, Infinity, -Infinity, '10', null, undefined]) {
    assert.throws(() => calculateCo2('electricity', bad, 'kWh', electricity), ValidationError, `amount ${String(bad)}`);
  }
});

test('very large amounts: the limit is accepted, above it is rejected', () => {
  assert.equal(calculateCo2('electricity', MAX_AMOUNT, 'kWh', electricity), 380000000);
  assert.throws(() => calculateCo2('electricity', MAX_AMOUNT + 1, 'kWh', electricity), ValidationError);
});

test('decimal rounding to 3 places, without floating-point noise', () => {
  assert.equal(calculateCo2('electricity', 1, 'kWh', { ...electricity, kg_co2_per_unit: 0.123456 }), 0.123);
  assert.equal(calculateCo2('electricity', 1, 'kWh', { ...electricity, kg_co2_per_unit: 0.123556 }), 0.124);
  assert.equal(calculateCo2('electricity', 0.1, 'kWh', { ...electricity, kg_co2_per_unit: 3 }), 0.3); // 0.1 * 3 = 0.30000000000000004
});

test('a factor row with the wrong base unit is a server error, not silently accepted', () => {
  assert.throws(() => calculateCo2('electricity', 1, 'kWh', { ...electricity, unit: 'km' }), (e) => !(e instanceof ValidationError));
});

test('isValidIsoDate accepts real dates and rejects impossible ones', () => {
  assert.equal(isValidIsoDate('2026-02-28'), true);
  assert.equal(isValidIsoDate('2024-02-29'), true);
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(isValidIsoDate('2026-13-01'), false);
  assert.equal(isValidIsoDate('18.10.2026'), false);
  assert.equal(isValidIsoDate(20261018), false);
});

test('validateEntryInput: valid body, future date, and bad fields', () => {
  const ok = validateEntryInput({ category: 'electricity', amount: '12.5', unit: 'kWh', entry_date: '2026-10-01', note: ' office ' }, '2026-10-18');
  assert.deepEqual(ok.fields, {});
  assert.equal(ok.value.amount, 12.5);
  assert.equal(ok.value.note, 'office');

  const future = validateEntryInput({ category: 'electricity', amount: 1, unit: 'kWh', entry_date: '2026-10-19' }, '2026-10-18');
  assert.ok(future.fields.entry_date);

  const bad = validateEntryInput({ amount: -1, entry_date: 'nope', note: 'x'.repeat(201) }, '2026-10-18');
  assert.ok(bad.fields.category && bad.fields.unit && bad.fields.amount && bad.fields.entry_date && bad.fields.note);

  assert.ok(validateEntryInput(null).fields.category);
});
