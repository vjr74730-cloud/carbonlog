// Opens the SQLite database and makes sure the schema exists.
// The path can be overridden with CARBONLOG_DB (tests use ":memory:").
const fs = require('fs');
const path = require('path');
const { Database } = require('./sqlite');   // Node's built-in SQLite, no native package to install

function openDb(file = process.env.CARBONLOG_DB || path.join(__dirname, '..', 'data', 'carbonlog.db')) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  // Several server instances may share one database file: WAL lets readers and a writer
  // work at the same time, and busy_timeout waits briefly instead of failing on a lock.
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return db;
}

module.exports = { openDb };
