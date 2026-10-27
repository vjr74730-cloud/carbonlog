// Checks the SQL triggers in db/schema.sql that drive live updates. Uses Node's built-in
// SQLite (node:sqlite, Node 22.5+), so it runs without `npm install`; skipped on older Node.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

let DatabaseSync = null;
try { ({ DatabaseSync } = require('node:sqlite')); } catch { /* older Node */ }

test('every write to entries, factors or targets raises the revision; reads do not', { skip: !DatabaseSync && 'node:sqlite not available' }, () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  db.exec(schema);                                   // runs at every start, so it must be repeatable
  const rev = () => db.prepare("SELECT value FROM app_meta WHERE key = 'revision'").get().value;

  assert.equal(rev(), 0);
  db.exec("INSERT INTO emission_factors (category, unit, kg_co2_per_unit, source, year) VALUES ('electricity', 'kWh', 0.38, 'x', 2023)");
  assert.equal(rev(), 0, 'seeding factors is not a user change');
  db.exec("INSERT INTO entries (category, amount, unit, entry_date, co2_kg) VALUES ('electricity', 100, 'kWh', '2026-01-01', 38)");
  assert.equal(rev(), 1);
  db.exec('UPDATE entries SET amount = 2');
  db.exec('UPDATE emission_factors SET kg_co2_per_unit = 0.4');
  db.exec('INSERT INTO targets (year, reduction_percent) VALUES (2026, 10)');
  db.exec('DELETE FROM entries');
  assert.equal(rev(), 5);
  db.prepare('SELECT * FROM entries').all();
  assert.equal(rev(), 5, 'reading changes nothing');
});
