// API tests: start the real Express app on a random port with an in-memory database
// and call it with fetch. Needs `npm install` first (express + better-sqlite3).
const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb } = require('../db/connection');
const { seed } = require('../db/seed');
const { createApp } = require('../app');

let server, base, db;

test.before(async () => {
  db = openDb(':memory:');
  seed(db);
  server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* csv or empty */ }
  return { status: res.status, json, text, headers: res.headers };
}

const valid = { category: 'electricity', amount: 100, unit: 'kWh', entry_date: '2025-03-15', note: 'office' };

test('CRUD roundtrip: create, read, update (recalculates), delete', async () => {
  const created = await call('POST', '/api/entries', valid);
  assert.equal(created.status, 201);
  assert.equal(created.json.co2_kg, 38); // 100 kWh x 0.38
  const id = created.json.id;

  const read = await call('GET', `/api/entries/${id}`);
  assert.equal(read.status, 200);
  assert.equal(read.json.note, 'office');

  const list = await call('GET', '/api/entries');
  assert.ok(list.json.some((e) => e.id === id));

  const updated = await call('PUT', `/api/entries/${id}`, { ...valid, amount: 2, unit: 'MWh' });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.co2_kg, 760); // 2 MWh = 2000 kWh

  const deleted = await call('DELETE', `/api/entries/${id}`);
  assert.equal(deleted.status, 204);
  assert.equal((await call('GET', `/api/entries/${id}`)).status, 404);
  assert.equal((await call('DELETE', `/api/entries/${id}`)).status, 404);
});

test('validation errors return 400 with { error } and field details', async () => {
  const cases = [
    { ...valid, amount: 0 },
    { ...valid, amount: -3 },
    { ...valid, amount: 'abc' },
    { ...valid, unit: 'km' },                 // unit mix-up: distance unit for electricity
    { ...valid, unit: 'MWH' },                // wrong case
    { ...valid, category: 'unicorn_farts' },  // unknown category
    { ...valid, entry_date: '2025-02-30' },   // impossible date
    { ...valid, entry_date: '2999-01-01' },   // future date
  ];
  for (const body of cases) {
    const r = await call('POST', '/api/entries', body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(typeof r.json.error, 'string');
  }
});

test('malformed JSON and bad ids give clean errors', async () => {
  const res = await fetch(base + '/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
  assert.equal(typeof (await res.json()).error, 'string');
  assert.equal((await call('GET', '/api/entries/abc')).status, 400);
  assert.equal((await call('PUT', '/api/entries/999999', valid)).status, 404);
  assert.equal((await call('GET', '/api/nope')).status, 404);
});

test('SQL injection attempts are treated as plain text', async () => {
  const r = await call('POST', '/api/entries', { ...valid, note: "x'); DROP TABLE entries;--" });
  assert.equal(r.status, 201);
  assert.equal((await call('GET', '/api/entries')).status, 200);
  assert.equal((await call('GET', "/api/entries?category=' OR '1'='1")).json.length, 0);
});

test('updating a factor does NOT change the CO2 of existing entries', async () => {
  const created = await call('POST', '/api/entries', { ...valid, entry_date: '2025-04-01' });
  const factors = (await call('GET', '/api/factors')).json;
  const f = factors.find((x) => x.category === 'electricity');
  assert.deepEqual(f.allowed_units, ['kWh', 'MWh']);

  const upd = await call('PUT', `/api/factors/${f.id}`, { kg_co2_per_unit: 1, source: 'test source', year: 2024 });
  assert.equal(upd.status, 200);
  assert.equal(upd.json.kg_co2_per_unit, 1);

  assert.equal((await call('GET', `/api/entries/${created.json.id}`)).json.co2_kg, 38); // history unchanged
  const fresh = await call('POST', '/api/entries', { ...valid, entry_date: '2025-04-02' });
  assert.equal(fresh.json.co2_kg, 100); // new entries use the new factor

  assert.equal((await call('PUT', `/api/factors/${f.id}`, { kg_co2_per_unit: -1, source: 's', year: 2024 })).status, 400);
  assert.equal((await call('PUT', '/api/factors/9999', { kg_co2_per_unit: 1, source: 's', year: 2024 })).status, 404);
});

test('summary totals by category and month, with date filters', async () => {
  const all = await call('GET', '/api/summary');
  assert.equal(all.status, 200);
  const sum = all.json.by_category.reduce((s, r) => s + r.co2_kg, 0);
  assert.ok(Math.abs(sum - all.json.total_co2_kg) < 0.01);
  assert.ok(all.json.by_month.every((m) => /^\d{4}-\d{2}$/.test(m.month)));

  const none = await call('GET', '/api/summary?from=1999-01-01&to=1999-12-31');
  assert.equal(none.json.total_co2_kg, 0);
  assert.equal(none.json.entry_count, 0);

  assert.equal((await call('GET', '/api/summary?from=bad')).status, 400);
  assert.equal((await call('GET', '/api/summary?from=2025-02-01&to=2025-01-01')).status, 400);
});

test('targets: set a target and see progress against the previous year', async () => {
  await call('POST', '/api/entries', { category: 'electricity', amount: 1000, unit: 'kWh', entry_date: '2020-06-01' }); // baseline
  await call('POST', '/api/entries', { category: 'electricity', amount: 500, unit: 'kWh', entry_date: '2021-06-01' });

  const empty = await call('GET', '/api/targets/2021');
  assert.equal(empty.json.reduction_percent, null);

  const put = await call('PUT', '/api/targets/2021', { reduction_percent: 20 });
  assert.equal(put.status, 200);
  assert.equal(put.json.baseline_year, 2020);
  assert.equal(put.json.achieved_reduction_percent, 50);
  assert.equal(put.json.target_co2_kg, put.json.baseline_co2_kg * 0.8);

  assert.equal((await call('PUT', '/api/targets/2021', { reduction_percent: 150 })).status, 400);
  assert.equal((await call('GET', '/api/targets/abc')).status, 400);
});

test('CSV export has a header, correct content type, and neutralises formulas', async () => {
  await call('POST', '/api/entries', { ...valid, entry_date: '2025-05-01', note: '=HYPERLINK("http://evil")' });
  const r = await call('GET', '/api/export.csv');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/csv/);
  assert.ok(r.text.startsWith('id,category,amount,unit,entry_date,co2_kg,note\n'));
  assert.ok(r.text.includes(`"'=HYPERLINK(""http://evil"")"`));
});

// ---------- CSV import ----------
async function importCsv(text) {
  const res = await fetch(base + '/api/entries/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
  return { status: res.status, json: await res.json() };
}
const countEntries = async () => (await call('GET', '/api/entries')).json.length;

test('CSV import: a valid file is imported and CO2 is calculated by the server', async () => {
  const before = await countEntries();
  const r = await importCsv('category,amount,unit,entry_date,note\nelectricity,100,kWh,2025-06-01,import A\ntrain_travel,420,km,2025-06-02,import B\n');
  assert.equal(r.status, 201);
  assert.equal(r.json.imported, 2);
  assert.equal(await countEntries(), before + 2);
  const list = (await call('GET', '/api/entries')).json;
  assert.equal(list.find((e) => e.note === 'import A').co2_kg, 38);
  assert.equal(list.find((e) => e.note === 'import B').co2_kg, 14.7);
});

test('CSV import is all-or-nothing: one bad row means nothing is saved, and the row is named', async () => {
  const before = await countEntries();
  const r = await importCsv('category,amount,unit,entry_date\nelectricity,100,kWh,2025-06-01\nelectricity,-5,kWh,2025-06-02\nelectricity,1,km,2025-06-03\n');
  assert.equal(r.status, 400);
  assert.match(r.json.error, /Nothing was imported: 2 of 3 rows/);
  assert.deepEqual(r.json.rows.map((x) => x.line), [3, 4]);
  assert.ok(r.json.rows[0].fields.amount);
  assert.ok(r.json.rows[1].fields.unit);
  assert.equal(await countEntries(), before);
});

test('CSV import: our own export can be imported again', async () => {
  const exported = (await call('GET', '/api/export.csv')).text;
  const rowsInExport = exported.trim().split('\n').length - 1;
  const before = await countEntries();
  const r = await importCsv(exported);
  assert.equal(r.status, 201);
  assert.equal(r.json.imported, rowsInExport);
  assert.equal(await countEntries(), before + rowsInExport);
});

test('CSV import rejects a missing header column and a JSON body', async () => {
  const r = await importCsv('category,amount\nelectricity,5\n');
  assert.equal(r.status, 400);
  assert.match(r.json.error, /Missing column/);
  const asJson = await call('POST', '/api/entries/import', { csv: 'x' });
  assert.equal(asJson.status, 400);
});

// ---------- live updates ----------
test('GET /api/changes: the revision rises on every write and is never cached', async () => {
  const r0 = await call('GET', '/api/changes');
  assert.equal(r0.status, 200);
  assert.equal(r0.headers.get('cache-control'), 'no-store');
  const created = await call('POST', '/api/entries', { ...valid, entry_date: '2025-07-01' });
  const r1 = await call('GET', '/api/changes');
  assert.ok(r1.json.revision > r0.json.revision, 'insert raises the revision');
  await call('DELETE', `/api/entries/${created.json.id}`);
  const r2 = await call('GET', '/api/changes');
  assert.ok(r2.json.revision > r1.json.revision, 'delete raises the revision');
  const r3 = await call('GET', '/api/changes');
  assert.equal(r3.json.revision, r2.json.revision, 'reading does not change it');
});
