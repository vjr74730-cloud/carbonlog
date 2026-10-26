// Seeds the six emission factors. Safe to run repeatedly (INSERT OR IGNORE).
// Values are APPROXIMATE and must be verified before real use
// (e.g. against Umweltbundesamt / DEFRA published factors).
const { openDb } = require('./connection');

const FACTORS = [
  { category: 'electricity',   unit: 'kWh', kg: 0.380, source: 'Approx. German grid mix (UBA-style estimate), verify before use', year: 2023 },
  { category: 'natural_gas',   unit: 'kWh', kg: 0.201, source: 'Approx. combustion factor (UBA/DEFRA-style estimate), verify before use', year: 2023 },
  { category: 'car_travel',    unit: 'km',  kg: 0.170, source: 'Approx. average petrol/diesel car (DEFRA-style estimate), verify before use', year: 2023 },
  { category: 'flight',        unit: 'km',  kg: 0.150, source: 'Approx. average passenger flight incl. uplift (DEFRA-style estimate), verify before use', year: 2023 },
  { category: 'train_travel',  unit: 'km',  kg: 0.035, source: 'Approx. long-distance rail (UBA-style estimate), verify before use', year: 2023 },
  { category: 'purchased_goods', unit: 'EUR', kg: 0.400, source: 'Rough spend-based average, very uncertain, verify before use', year: 2023 },
];

function seed(db) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO emission_factors (category, unit, kg_co2_per_unit, source, year) VALUES (?, ?, ?, ?, ?)'
  );
  const run = db.transaction(() => {
    for (const f of FACTORS) insert.run(f.category, f.unit, f.kg, f.source, f.year);
  });
  run();
}

module.exports = { seed, FACTORS };

if (require.main === module) {
  const db = openDb();
  seed(db);
  console.log(`Seeded ${FACTORS.length} emission factors.`);
}
