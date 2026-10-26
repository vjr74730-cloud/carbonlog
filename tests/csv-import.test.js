// Unit tests for services/csv-import.js. They need no database and no dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const { csvToEntries, parseCsv, detectDelimiter, normalizeAmount, normalizeDate, MAX_ROWS } = require('../services/csv-import');

test('a normal comma-separated file becomes entry bodies with line numbers', () => {
  const { rows, errors } = csvToEntries('category,amount,unit,entry_date,note\nelectricity,100,kWh,2026-03-15,Office\n');
  assert.deepEqual(errors, []);
  assert.deepEqual(rows, [{ line: 2, body: { category: 'electricity', amount: '100', unit: 'kWh', entry_date: '2026-03-15', note: 'Office' } }]);
});

test('our own export can be imported again: id and co2_kg are ignored, formula protection is undone', () => {
  const exported = "id,category,amount,unit,entry_date,co2_kg,note\n7,natural_gas,1200,kWh,2026-02-28,241.2,\"'=SUM(A1)\"\n";
  const { rows } = csvToEntries(exported);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].body.category, 'natural_gas');
  assert.equal(rows[0].body.note, '=SUM(A1)');
  assert.equal('co2_kg' in rows[0].body, false);   // CO2 is always recalculated by the server
});

test('German Excel files: semicolons, decimal commas, thousands dots and DD.MM.YYYY dates', () => {
  assert.equal(detectDelimiter('category;amount;unit;date\n'), ';');
  const { rows } = csvToEntries('Category;Amount;Unit;Date;Note\nNatural gas;1.500,5;kWh;05.03.2026;Heizung\nElectricity;12,25;kWh;31.01.2026;\n');
  assert.deepEqual(rows[0].body, { category: 'natural_gas', amount: '1500.5', unit: 'kWh', entry_date: '2026-03-05', note: 'Heizung' });
  assert.equal(rows[1].body.amount, '12.25');
  const de = csvToEntries('Kategorie;Menge;Einheit;Datum;Notiz\nStrom;1;kWh;01.01.2026;x\n');
  assert.deepEqual(de.errors, []);                          // German column names are understood
  assert.equal(de.rows[0].body.entry_date, '2026-01-01');
  assert.equal(normalizeAmount('1.500', ';'), '1500');      // thousands dot in a ";" file
  assert.equal(normalizeAmount('1.5', ','), '1.5');         // decimal dot in a "," file stays
  assert.equal(normalizeDate('2026-03-15'), '2026-03-15');
});

test('quoted values may contain separators, quotes and line breaks', () => {
  const recs = parseCsv('a,b\n"x, y","say ""hi""\nthere"\n', ',');
  assert.deepEqual(recs[1].cells, ['x, y', 'say "hi"\nthere']);
});

test('units keep their exact spelling so the server can still reject MWH or mWh', () => {
  const { rows } = csvToEntries('category,amount,unit,entry_date\nelectricity,2,MWH,2026-01-01\n');
  assert.equal(rows[0].body.unit, 'MWH');
});

test('file problems are reported: empty file, missing columns, header only, unclosed quote, too many rows', () => {
  assert.match(csvToEntries('').errors[0].message, /empty/);
  assert.match(csvToEntries('category,amount\nelectricity,5\n').errors[0].message, /Missing column\(s\): unit, entry_date/);
  assert.match(csvToEntries('category,amount,unit,entry_date\n').errors[0].message, /no entries/);
  assert.match(csvToEntries('category,amount,unit,entry_date\n"electricity,5,kWh,2026-01-01\n').errors[0].message, /not closed/);
  const many = 'category,amount,unit,entry_date\n' + 'electricity,1,kWh,2026-01-01\n'.repeat(MAX_ROWS + 1);
  assert.match(csvToEntries(many).errors[0].message, /Too many rows/);
});

test('blank lines and a byte-order mark are ignored', () => {
  const { rows, errors } = csvToEntries('﻿category,amount,unit,entry_date\n\nelectricity,1,kWh,2026-01-01\n\n');
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].line, 3);
});
