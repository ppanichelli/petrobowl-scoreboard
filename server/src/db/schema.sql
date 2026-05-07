-- PetroBowl Scoreboard — Database Schema

CREATE TABLE IF NOT EXISTS teams (
  id           TEXT PRIMARY KEY,
  full_name    TEXT NOT NULL,
  short_name   TEXT NOT NULL,
  city         TEXT NOT NULL,
  country      TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK(length(country_code) = 2),
  logo_url       TEXT NOT NULL DEFAULT '/assets/logos/default.png',
  logo_small_url TEXT NOT NULL DEFAULT '/assets/logos/default_small.png'
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id                  TEXT PRIMARY KEY,
  team_a_id           TEXT NOT NULL REFERENCES teams(id),
  team_b_id           TEXT NOT NULL REFERENCES teams(id),
  stage               TEXT NOT NULL CHECK(stage IN ('group','quarterfinal','semifinal','third_place','final','tiebreaker','loser_bracket')),
  total_questions     INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup','live','finished')),
  score_a             INTEGER NOT NULL DEFAULT 0,
  score_b             INTEGER NOT NULL DEFAULT 0,
  winner_id           TEXT REFERENCES teams(id),
  is_draw             INTEGER NOT NULL DEFAULT 0,
  parent_match_id     TEXT REFERENCES matches(id),
  batch_id            TEXT,
  prospecting_open    INTEGER NOT NULL DEFAULT 1,
  frozen_odds_a       INTEGER,
  frozen_odds_b       INTEGER,
  frozen_prospects_a  INTEGER,
  frozen_prospects_b  INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at         TEXT,
  group_name          TEXT
);

CREATE TABLE IF NOT EXISTS actions (
  id              TEXT PRIMARY KEY,
  match_id        TEXT NOT NULL REFERENCES matches(id),
  sequence        INTEGER NOT NULL,
  question_number INTEGER NOT NULL,
  action_type     TEXT NOT NULL CHECK(action_type IN ('correct_a','correct_b','incorrect_a','incorrect_b','skip','undo','reset')),
  is_undone       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  pin              TEXT PRIMARY KEY CHECK(length(pin) = 6),
  display_name     TEXT,
  country_code     TEXT CHECK(length(country_code) = 2),
  total_points     INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  first_login_at   TEXT
);

CREATE TABLE IF NOT EXISTS prospects (
  id                  TEXT PRIMARY KEY,
  pin                 TEXT NOT NULL REFERENCES participants(pin),
  match_id            TEXT NOT NULL REFERENCES matches(id),
  prospected_team_id  TEXT NOT NULL REFERENCES teams(id),
  is_locked           INTEGER NOT NULL DEFAULT 0,
  payout              INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(pin, match_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id                TEXT PRIMARY KEY,
  match_id          TEXT NOT NULL REFERENCES matches(id),
  pin               TEXT NOT NULL REFERENCES participants(pin),
  cumulative_points INTEGER NOT NULL,
  rank              INTEGER NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
