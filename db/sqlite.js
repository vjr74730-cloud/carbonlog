// Role: a tiny wrapper around Node's BUILT-IN SQLite (node:sqlite, Node.js 22.13+), so the app
// needs no native database package. Nothing has to be compiled during `npm install`, which is
// what broke the previous `better-sqlite3` setup on Node.js 26.
//
// It offers the small part of the better-sqlite3 API the app uses:
//   db.prepare(sql).run(params) / .get(params) / .all(params)
//   db.exec(sql)   db.pragma('name = value')   db.transaction(fn)
const { DatabaseSync } = require('node:sqlite');

// Named parameters used in a statement, e.g. "@from" -> "from".
function namedParams(sql) {
  return new Set([...sql.matchAll(/[@$:]([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
}

// node:sqlite rejects unknown keys and `undefined`; keep only the keys the SQL uses.
function bindArgs(names, args) {
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    const out = {};
    for (const k of names) out[k] = args[0][k] === undefined ? null : args[0][k];
    return [out];
  }
  return args.map((a) => (a === undefined ? null : a));
}

// Rows come back with a null prototype; turn them into ordinary objects.
const plain = (row) => (row ? { ...row } : row);

class Statement {
  constructor(stmt, sql) { this.stmt = stmt; this.names = namedParams(sql); }
  run(...args) {
    const info = this.stmt.run(...bindArgs(this.names, args));
    return { changes: Number(info.changes), lastInsertRowid: Number(info.lastInsertRowid) };
  }
  get(...args) { return plain(this.stmt.get(...bindArgs(this.names, args))); }
  all(...args) { return this.stmt.all(...bindArgs(this.names, args)).map(plain); }
}

class Database {
  constructor(file) { this.db = new DatabaseSync(file); }
  prepare(sql) { return new Statement(this.db.prepare(sql), sql); }
  exec(sql) { this.db.exec(sql); return this; }
  pragma(text) { return this.db.prepare(`PRAGMA ${text}`).all().map(plain); }
  // Runs fn inside BEGIN ... COMMIT; any error rolls everything back.
  transaction(fn) {
    return (...args) => {
      this.db.exec('BEGIN');
      try {
        const result = fn(...args);
        this.db.exec('COMMIT');
        return result;
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    };
  }
  close() { this.db.close(); }
}

module.exports = { Database };
