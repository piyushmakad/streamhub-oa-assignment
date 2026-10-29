@sql
Feature: SQL scenarios return exactly the expected rows
  The seed data (sql/seed.sql) contains one row per rule — matches and near-misses —
  so these assertions pin down both what the queries find and what they must reject.

  Scenario: Round-trip transfers within 10% and 24 hours
    When I run the "round-trip transfers" query against the seeded database
    Then the query should return exactly these rows:
      | outbound_txn_id | account_a | account_b | amount_sent | return_txn_id | amount_returned |
      | 1               | ACC-A     | ACC-B     | 1000        | 2             | 950             |
      | 3               | ACC-C     | ACC-D     | 5000        | 4             | 5500            |
      | 14              | ACC-O     | ACC-N     | 1250        | 13            | 1200            |
      | 15              | ACC-P     | ACC-Q     | 10000       | 16            | 9500            |
      | 15              | ACC-P     | ACC-Q     | 10000       | 17            | 10400           |
      | 18              | ACC-R     | ACC-S     | 600         | 19            | 540             |
      | 20              | ACC-U     | ACC-V     | 700         | 21            | 690             |
    And no returned row should involve transactions "5,6,7,8,9,10,11,12,22"

  Scenario: IPL 2024 players with 30+ runs in 3+ consecutive matches
    When I run the "IPL streaks" query against the seeded database
    Then the query should return exactly these rows:
      | player_name    | streak_start_date | matches_in_streak |
      | Arjun Mehta    | 2024-03-22        | 3                 |
      | Dev Sharma     | 2024-03-22        | 4                 |
      | Rohan Kulkarni | 2024-03-23        | 3                 |
      | Vikram Nair    | 2024-03-23        | 3                 |
      | Ravi Iyer      | 2024-04-02        | 3                 |
      | Rohan Kulkarni | 2024-04-07        | 3                 |
    And no returned row should be for players "Kabir Rao,Sameer Khan,Aditya Bose"
