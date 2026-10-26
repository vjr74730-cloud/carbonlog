// Role: read and update emission factors.
// Only the numeric value, source and year are editable; category and unit are fixed
// because changing a unit would silently invalidate every conversion rule.
// Updating a factor does NOT touch existing entries (see README, design decisions).
const express = require('express');
const { allowedUnits } = require('../services/calculator');

module.exports = function factorsRouter(db) {
  const router = express.Router();

  const withUnits = (row) => ({ ...row, allowed_units: allowedUnits(row.category) });

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM emission_factors ORDER BY category').all();
    res.json(rows.map(withUnits));
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
    const existing = db.prepare('SELECT * FROM emission_factors WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Factor not found' });

    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const kg = typeof b.kg_co2_per_unit === 'string' && b.kg_co2_per_unit.trim() !== '' ? Number(b.kg_co2_per_unit) : b.kg_co2_per_unit;
    const year = typeof b.year === 'string' && b.year.trim() !== '' ? Number(b.year) : b.year;
    const errors = [];
    if (typeof kg !== 'number' || !Number.isFinite(kg) || kg < 0 || kg > 1000) errors.push('kg_co2_per_unit must be a number between 0 and 1000');
    if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) errors.push('year must be a valid year');
    if (typeof b.source !== 'string' || !b.source.trim() || b.source.length > 300) errors.push('source is required (max 300 characters)');
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    db.prepare('UPDATE emission_factors SET kg_co2_per_unit = ?, source = ?, year = ? WHERE id = ?').run(
      kg,
      b.source.trim(),
      year,
      id
    );
    res.json(withUnits(db.prepare('SELECT * FROM emission_factors WHERE id = ?').get(id)));
  });

  return router;
};
