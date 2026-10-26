// Opens the SQLite database and makes sure the schema exists.
// The path can be overridden with CARBONLOG_DB (tests use ":memory:").
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function openDb(file = process.env.CARBONLOG_DB || path.join(__dirname, '..', 'data', 'carbonlog.db')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return db;
}

module.exports = { openDb };
