// Role: REST routes for emission entries (full CRUD).
//
// DATA FLOW for creating an entry (the roundtrip to explain in the video):
//   form submit (public/app.js)
//     -> fetch POST /api/entries (JSON)
//     -> this route
//     -> validateEntryInput (shape, date, amount)
//     -> factor lookup in SQLite (category must exist)
//     -> calculateCo2 (unit check/conversion, the ONLY CO2 calculation)
//     -> INSERT with parameterized SQL (co2_kg stored at creation time)
//     -> 201 + saved row as JSON
//     -> frontend reloads the list and dashboard
const express = require('express');
const { calculateCo2, validateEntryInput, isValidIsoDate, ValidationError } = require('../services/calculator');
const { csvToEntries } = require('../services/csv-import');

module.exports = function entriesRouter(db) {
  const router = express.Router();

  const getFactor = db.prepare('SELECT * FROM emission_factors WHERE category = ?');
  const getEntry = db.prepare('SELECT * FROM entries WHERE id = ?');
  const insertEntry = db.prepare(
    `INSERT INTO entries (category, amount, unit, entry_date, note, co2_kg)
     VALUES (@category, @amount, @unit, @entry_date, @note, @co2_kg)`
  );
  const updateEntry = db.prepare(
    `UPDATE entries SET category=@category, amount=@amount, unit=@unit,
       entry_date=@entry_date, note=@note, co2_kg=@co2_kg WHERE id=@id`
  );
  const deleteEntry = db.prepare('DELETE FROM entries WHERE id = ?');

  function parseId(req) {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  // Validates body, looks up the factor, computes CO2. Returns { row } or { fields }.
  function prepareRow(body) {
    const { value, fields } = validateEntryInput(body);
    if (Object.keys(fields).length) return { fields };

    const factor = getFactor.get(value.category);
    if (!factor) return { fields: { category: `Unknown category "${value.category}"` } };

    try {
      value.co2_kg = calculateCo2(value.category, value.amount, value.unit, factor);
    } catch (err) {
      if (err instanceof ValidationError) return { fields: { [err.field || 'amount']: err.message } };
      throw err;
    }
    return { row: value };
  }

  function sendInvalid(res, fields) {
    return res.status(400).json({
      error: 'Validation failed: ' + Object.values(fields).join('; '),
      fields,
    });
  }

  // Optional filters: ?from=YYYY-MM-DD&to=YYYY-MM-DD&category=electricity
  router.get('/', (req, res) => {
    const { from, to, category } = req.query;
    if (from !== undefined && !isValidIsoDate(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' });
    if (to !== undefined && !isValidIsoDate(to)) return res.status(400).json({ error: 'to must be YYYY-MM-DD' });
    if (category !== undefined && typeof category !== 'string') return res.status(400).json({ error: 'category must be text' });

    const rows = db
      .prepare(
        `SELECT * FROM entries
         WHERE (@from IS NULL OR entry_date >= @from)
           AND (@to IS NULL OR entry_date <= @to)
           AND (@category IS NULL OR category = @category)
         ORDER BY entry_date DESC, id DESC`
      )
      .all({ from: from ?? null, to: to ?? null, category: category ?? null });
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const row = getEntry.get(id);
    if (!row) return res.status(404).json({ error: 'Entry not found' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    const { row, fields } = prepareRow(req.body);
    if (fields) return sendInvalid(res, fields);
    const info = insertEntry.run(row);
    res.status(201).json(getEntry.get(info.lastInsertRowid));
  });

  // CSV import: all rows or nothing. Every row goes through the same prepareRow() as the
  // form, so an import cannot store anything the form would reject. The body is the raw
  // file text (Content-Type: text/csv), parsed here by a route-specific text parser.
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insertEntry.run(row);
  });
  router.post('/import', express.text({ type: ['text/csv', 'text/plain', 'application/csv'], limit: '512kb' }), (req, res) => {
    if (typeof req.body !== 'string') return res.status(400).json({ error: 'Send the file content as text/csv' });

    const { rows, errors } = csvToEntries(req.body);
    if (errors.length) return res.status(400).json({ error: errors[0].message, rows: errors.map((e) => ({ line: e.line, fields: { file: e.message } })) });

    const valid = [], invalid = [];
    for (const { line, body } of rows) {
      const { row, fields } = prepareRow(body);
      if (fields) invalid.push({ line, fields });
      else valid.push(row);
    }
    if (invalid.length) {
      return res.status(400).json({
        error: `Nothing was imported: ${invalid.length} of ${rows.length} rows have errors`,
        rows: invalid.slice(0, 50),
      });
    }
    insertMany(valid);                       // one transaction: either every row is saved or none
    res.status(201).json({ imported: valid.length });
  });

  // Editing recalculates CO2 with the CURRENT factor (the user changed the data on purpose).
  router.put('/:id', (req, res) => {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (!getEntry.get(id)) return res.status(404).json({ error: 'Entry not found' });

    const { row, fields } = prepareRow(req.body);
    if (fields) return sendInvalid(res, fields);
    updateEntry.run({ ...row, id });
    res.json(getEntry.get(id));
  });

  router.delete('/:id', (req, res) => {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const info = deleteEntry.run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Entry not found' });
    res.status(204).end();
  });

  return router;
};
