-- =====================================================================
-- Schema for the SQL scenarios (SQLite 3.25+ — window functions required).
-- The same DDL runs on PostgreSQL with TEXT timestamps swapped for TIMESTAMP.
-- =====================================================================

-- ---------- Scenario 1: account transfers ----------
CREATE TABLE accounts (
  account_id   TEXT PRIMARY KEY,
  holder_name  TEXT NOT NULL
);

CREATE TABLE transactions (
  txn_id        INTEGER PRIMARY KEY,
  from_account  TEXT    NOT NULL REFERENCES accounts(account_id),
  to_account    TEXT    NOT NULL REFERENCES accounts(account_id),
  amount        INTEGER NOT NULL CHECK (amount > 0),   -- whole rupees; avoids float comparisons
  txn_time      TEXT    NOT NULL,                      -- ISO-8601 'YYYY-MM-DD HH:MM:SS' (UTC)
  CHECK (from_account <> to_account)
);

-- Supports the self-join: "transfers from X to Y after time T".
CREATE INDEX idx_txn_pair_time ON transactions (from_account, to_account, txn_time);

-- ---------- Scenario 2: IPL-style batting ----------
CREATE TABLE teams (
  team_id  TEXT PRIMARY KEY,           -- e.g. 'CSK'
  name     TEXT NOT NULL
);

CREATE TABLE players (
  player_id    INTEGER PRIMARY KEY,
  player_name  TEXT NOT NULL,
  team_id      TEXT NOT NULL REFERENCES teams(team_id)
);

CREATE TABLE matches (
  match_id      INTEGER PRIMARY KEY,
  season        INTEGER NOT NULL,
  match_date    TEXT    NOT NULL,      -- 'YYYY-MM-DD'
  home_team_id  TEXT    NOT NULL REFERENCES teams(team_id),
  away_team_id  TEXT    NOT NULL REFERENCES teams(team_id)
);

-- One row per player per match they were in the XI for.
-- runs IS NULL means "did not bat" — the player appeared but did not score.
CREATE TABLE batting_scores (
  match_id   INTEGER NOT NULL REFERENCES matches(match_id),
  player_id  INTEGER NOT NULL REFERENCES players(player_id),
  runs       INTEGER CHECK (runs IS NULL OR runs >= 0),
  PRIMARY KEY (match_id, player_id)
);

CREATE INDEX idx_matches_season_date ON matches (season, match_date);
