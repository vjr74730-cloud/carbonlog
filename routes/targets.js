// Role: yearly reduction target and progress against the previous year (the baseline).
// Progress compares year-to-date emissions with the FULL previous year, so early in
// the year it looks better than it is. This is stated as a limitation in the README.
const express = require('express');

module.exports = function targetsRouter(db) {
  const router = express.Router();

  const sumForYear = db.prepare(
    "SELECT COALESCE(SUM(co2_kg), 0) AS total FROM entries WHERE substr(entry_date, 1, 4) = ?"
  );
  const getTarget = db.prepare('SELECT * FROM targets WHERE year = ?');

  function parseYear(req) {
    const y = Number(req.params.year);
    return Number.isInteger(y) && y >= 1990 && y <= 2100 ? y : null;
  }

  function progress(year) {
    const target = getTarget.get(year);
    const baseline = Math.round(sumForYear.get(String(year - 1)).total * 1000) / 1000;
    const current = Math.round(sumForYear.get(String(year)).total * 1000) / 1000;
    const pct = target ? target.reduction_percent : null;
    return {
      year,
      reduction_percent: pct,
      baseline_year: year - 1,
      baseline_co2_kg: baseline,
      current_co2_kg: current,
      target_co2_kg: pct !== null && baseline > 0 ? Math.round(baseline * (1 - pct / 100) * 1000) / 1000 : null,
      achieved_reduction_percent: baseline > 0 ? Math.round(((baseline - current) / baseline) * 1000) / 10 : null,
    };
  }

  router.get('/:year', (req, res) => {
    const year = parseYear(req);
    if (!year) return res.status(400).json({ error: 'Invalid year' });
    res.json(progress(year));
  });

  router.put('/:year', (req, res) => {
    const year = parseYear(req);
    if (!year) return res.status(400).json({ error: 'Invalid year' });
    const raw = req.body && req.body.reduction_percent;
    const pct = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ error: 'reduction_percent must be a number between 0 and 100' });
    }
    db.prepare(
      `INSERT INTO targets (year, reduction_percent) VALUES (?, ?)
       ON CONFLICT(year) DO UPDATE SET reduction_percent = excluded.reduction_percent`
    ).run(year, pct);
    res.json(progress(year));
  });

  return router;
};
