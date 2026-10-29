-- =====================================================================
-- Scenario 2 — IPL 2024 player performance streaks
-- Players who scored 30+ runs in at least 3 consecutive matches; return the
-- player's name and the date the streak started.
--
-- Technique: "gaps and islands".
--   1. Number every 2024 appearance of each player in date order          -> match_seq
--   2. Keep only the 30+ innings and number those again                     -> rn
--   3. For consecutive 30+ innings, match_seq - rn is constant              -> streak_grp
--   4. Group by (player, streak_grp); a group of 3+ rows is a streak.
--
-- Interpretation (documented in README):
--  * "consecutive" = consecutive matches the PLAYER appeared in. An appearance where
--    the player did not bat (runs IS NULL) breaks the streak, as it is not a 30+ score.
--  * Only season 2024 counts — a run spanning the end of 2023 does not chain into 2024.
--  * A player with two separate streaks is returned once per streak.
-- =====================================================================
WITH appearances AS (
  SELECT
    p.player_id,
    p.player_name,
    m.match_id,
    m.match_date,
    s.runs,
    ROW_NUMBER() OVER (PARTITION BY p.player_id ORDER BY m.match_date, m.match_id) AS match_seq
  FROM batting_scores AS s
  JOIN matches        AS m ON m.match_id  = s.match_id
  JOIN players        AS p ON p.player_id = s.player_id
  WHERE m.season = 2024
),
scoring_innings AS (
  SELECT
    *,
    match_seq - ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY match_seq) AS streak_grp
  FROM appearances
  WHERE runs >= 30
),
streaks AS (
  SELECT
    player_id,
    player_name,
    MIN(match_date) AS streak_start_date,
    MAX(match_date) AS streak_end_date,
    COUNT(*)        AS matches_in_streak,
    SUM(runs)       AS runs_in_streak
  FROM scoring_innings
  GROUP BY player_id, player_name, streak_grp
  HAVING COUNT(*) >= 3
)
SELECT player_name, streak_start_date, streak_end_date, matches_in_streak, runs_in_streak
FROM streaks
ORDER BY streak_start_date, player_name;
