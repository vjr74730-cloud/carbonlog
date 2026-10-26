// Role: entry point. Opens the database, seeds factors if the table is empty, starts HTTP.
const { openDb } = require('./db/connection');
const { seed } = require('./db/seed');
const { createApp } = require('./app');

const db = openDb();
seed(db); // INSERT OR IGNORE, so existing (possibly edited) factors are kept

const port = Number(process.env.PORT) || 3000;
createApp(db).listen(port, () => {
  console.log(`CarbonLog running at http://localhost:${port}`);
});
