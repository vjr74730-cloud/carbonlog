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
