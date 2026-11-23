CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX scores_board ON scores (game, score DESC);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  game TEXT NOT NULL,
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  seed INTEGER NOT NULL,
  claimed INTEGER NOT NULL,
  log TEXT NOT NULL,
  checkpoint TEXT,
  tick INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE run_results (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  score INTEGER,
  rank INTEGER,
  level INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
