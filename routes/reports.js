// Role: read-only reporting endpoints (dashboard summary and CSV export).
// All numbers come from the co2_kg values stored with each entry.
const express = require('express');
const { isValidIsoDate } = require('../services/calculator');

// Spreadsheet programs run cells starting with = + - @ as formulas. Prefixing a
// quote neutralises "CSV injection" from user-supplied notes.
function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

module.exports = function reportsRouter(db) {
  const router = express.Router();

  function range(req, res) {
    const { from, to } = req.query;
    if (from !== undefined && !isValidIsoDate(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' }) && null;
    if (to !== undefined && !isValidIsoDate(to)) return res.status(400).json({ error: 'to must be YYYY-MM-DD' }) && null;
    if (from && to && from > to) return res.status(400).json({ error: 'from must not be after to' }) && null;
    return { from: from ?? null, to: to ?? null };
  }

  router.get('/summary', (req, res) => {
    const params = range(req, res);
    if (!params) return;

    const where = '(@from IS NULL OR entry_date >= @from) AND (@to IS NULL OR entry_date <= @to)';
    const byCategory = db
      .prepare(
        `SELECT category, ROUND(SUM(co2_kg), 3) AS co2_kg, COUNT(*) AS entries
         FROM entries WHERE ${where} GROUP BY category ORDER BY co2_kg DESC`
      )
      .all(params);
    const byMonth = db
      .prepare(
        `SELECT substr(entry_date, 1, 7) AS month, ROUND(SUM(co2_kg), 3) AS co2_kg
         FROM entries WHERE ${where} GROUP BY month ORDER BY month`
      )
      .all(params);

    const total = Math.round(byCategory.reduce((sum, r) => sum + r.co2_kg, 0) * 1000) / 1000;
    const count = byCategory.reduce((sum, r) => sum + r.entries, 0);
    res.json({ from: params.from, to: params.to, total_co2_kg: total, entry_count: count, by_category: byCategory, by_month: byMonth });
  });

  router.get('/export.csv', (req, res) => {
    const rows = db.prepare('SELECT * FROM entries ORDER BY entry_date, id').all();
    const header = ['id', 'category', 'amount', 'unit', 'entry_date', 'co2_kg', 'note'];
    const lines = [header.join(',')];
    for (const r of rows) lines.push(header.map((h) => csvCell(r[h])).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="carbonlog-entries.csv"');
    res.send(lines.join('\n') + '\n');
  });

  return router;
};

module.exports.csvCell = csvCell;
