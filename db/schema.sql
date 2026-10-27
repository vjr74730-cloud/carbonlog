-- Database schema for CarbonLog.
-- co2_kg is stored at creation time so later factor changes never rewrite history.

CREATE TABLE IF NOT EXISTS emission_factors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  kg_co2_per_unit REAL NOT NULL CHECK (kg_co2_per_unit >= 0),
  source TEXT NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  unit TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  note TEXT,
  co2_kg REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category) REFERENCES emission_factors(category)
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(entry_date);

CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL UNIQUE,
  reduction_percent REAL NOT NULL CHECK (reduction_percent >= 0 AND reduction_percent <= 100)
);

-- Live updates: one revision number for the whole database. Triggers raise it on EVERY
-- change to entries, factors or targets, whichever server instance or tab made it.
-- Browsers poll GET /api/changes every 5 seconds and reload when the number changes.
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO app_meta (key, value) VALUES ('revision', 0);

CREATE TRIGGER IF NOT EXISTS rev_entries_insert AFTER INSERT ON entries BEGIN UPDATE app_meta SET value = value + 1 WHERE key = 'revision'; END;
CREATE TRIGGER IF NOT EXISTS rev_entries_update AFTER UPDATE ON entries BEGIN UPDATE app_meta SET value = value + 1 WHERE key = 'revision'; END;
CREATE TRIGGER IF NOT EXISTS rev_entries_delete AFTER DELETE ON entries BEGIN UPDATE app_meta SET value = value + 1 WHERE key = 'revision'; END;
CREATE TRIGGER IF NOT EXISTS rev_factors_update AFTER UPDATE ON emission_factors BEGIN UPDATE app_meta SET value = value + 1 WHERE key = 'revision'; END;
CREATE TRIGGER IF NOT EXISTS rev_targets_insert AFTER INSERT ON targets BEGIN UPDATE app_meta SET value = value + 1 WHERE key = 'revision'; END;
CREATE TRIGGER IF NOT EXISTS rev_targets_update AFTER UPDATE ON targets BEGIN UPDATE app_meta SET value = value + 1 WHERE key = 'revision'; END;
CREATE TRIGGER IF NOT EXISTS rev_targets_delete AFTER DELETE ON targets BEGIN UPDATE app_meta SET value = value + 1 WHERE key = 'revision'; END;
