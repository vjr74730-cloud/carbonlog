// Role: the ONLY place where CO2 is calculated and entry input is validated.
// The frontend never computes emissions; it just displays what the server returns.

class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Units accepted per category, with the multiplier that converts them into the
// category's base unit (the unit of its emission factor). Matching is
// case-sensitive on purpose: "MWh" (megawatt-hours) and "mWh" (milliwatt-hours)
// differ by a factor of a billion, so we never guess.
const UNIT_TABLE = {
  electricity:     { kWh: 1, MWh: 1000 },
  natural_gas:     { kWh: 1, MWh: 1000 },
  car_travel:      { km: 1, miles: 1.609344 },
  flight:          { km: 1, miles: 1.609344 },
  train_travel:    { km: 1, miles: 1.609344 },
  purchased_goods: { EUR: 1 },
};

const MAX_AMOUNT = 1e9; // sanity limit; anything above is almost certainly a typo

function allowedUnits(category) {
  return Object.keys(UNIT_TABLE[category] || {});
}

// Round to 3 decimals so floating-point noise (0.1 + 0.2) never reaches the UI.
function round3(x) {
  return Math.round(x * 1000) / 1000;
}

/**
 * co2_kg = amount (converted to the factor's base unit) x kg CO2 per unit.
 * `factor` is a row of emission_factors: { category, unit, kg_co2_per_unit }.
 */
function calculateCo2(category, amount, unit, factor) {
  const units = UNIT_TABLE[category];
  if (!units) throw new ValidationError(`Unknown category "${category}"`, 'category');

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('Amount must be a number greater than 0', 'amount');
  }
  if (amount > MAX_AMOUNT) {
    throw new ValidationError(`Amount must not exceed ${MAX_AMOUNT.toLocaleString('en-US')}`, 'amount');
  }
  if (!Object.prototype.hasOwnProperty.call(units, unit)) {
    throw new ValidationError(
      `Unit "${unit}" is not valid for ${category}. Allowed: ${allowedUnits(category).join(', ')}`,
      'unit'
    );
  }
  // Guard against a misconfigured factor row (its unit must be this category's base unit).
  if (units[factor.unit] !== 1) {
    throw new Error(`Emission factor unit "${factor.unit}" does not match base unit for ${category}`);
  }

  const baseAmount = amount * units[unit];
  return round3(baseAmount * factor.kg_co2_per_unit);
}

function todayString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-30).
function isValidIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Validates the shape of an entry body. Category existence and unit validity are
 * checked later (they need the database row). Returns { value, fields }.
 */
function validateEntryInput(body, today = todayString()) {
  const fields = {};
  const b = body && typeof body === 'object' ? body : {};

  if (typeof b.category !== 'string' || !b.category) fields.category = 'Category is required';
  if (typeof b.unit !== 'string' || !b.unit) fields.unit = 'Unit is required';

  const amount = typeof b.amount === 'string' && b.amount.trim() !== '' ? Number(b.amount) : b.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    fields.amount = 'Amount must be a number greater than 0';
  } else if (amount > MAX_AMOUNT) {
    fields.amount = `Amount must not exceed ${MAX_AMOUNT.toLocaleString('en-US')}`;
  }

  if (!isValidIsoDate(b.entry_date)) fields.entry_date = 'Date must be a valid date (YYYY-MM-DD)';
  else if (b.entry_date > today) fields.entry_date = 'Date must not be in the future';

  let note = null;
  if (b.note !== undefined && b.note !== null && b.note !== '') {
    if (typeof b.note !== 'string' || b.note.length > 200) fields.note = 'Note must be text of at most 200 characters';
    else note = b.note.trim();
  }

  return {
    value: { category: b.category, amount, unit: b.unit, entry_date: b.entry_date, note },
    fields,
  };
}

module.exports = {
  ValidationError,
  UNIT_TABLE,
  MAX_AMOUNT,
  allowedUnits,
  calculateCo2,
  validateEntryInput,
  isValidIsoDate,
  todayString,
};
