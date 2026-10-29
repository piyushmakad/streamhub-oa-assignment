-- =====================================================================
-- Scenario 1 — Round-trip transfers
-- Account A sends money to B, and B sends a similar amount (within 10%)
-- back to A within 24 hours.
--
-- Interpretation (documented in README):
--  * "within 10%" is measured against the ORIGINAL amount and is inclusive:
--      |returned - sent| <= 10% of sent.
--    Written as  |r - s| * 10 <= s  so it is exact integer arithmetic (no float edge cases).
--  * the return must happen AFTER the original and no more than 24h later (inclusive).
--  * whoever sent first is "Account A"; every qualifying return is listed, so one
--    outbound transfer answered twice produces two rows.
-- =====================================================================
SELECT
  out_t.txn_id                                             AS outbound_txn_id,
  out_t.from_account                                       AS account_a,
  out_t.to_account                                         AS account_b,
  out_t.amount                                             AS amount_sent,
  out_t.txn_time                                           AS sent_at,
  ret_t.txn_id                                             AS return_txn_id,
  ret_t.amount                                             AS amount_returned,
  ret_t.txn_time                                           AS returned_at,
  ROUND((julianday(ret_t.txn_time) - julianday(out_t.txn_time)) * 24, 2)      AS hours_between,
  ROUND(ABS(ret_t.amount - out_t.amount) * 100.0 / out_t.amount, 2)           AS pct_difference
FROM transactions AS out_t
JOIN transactions AS ret_t
  ON  ret_t.from_account = out_t.to_account
  AND ret_t.to_account   = out_t.from_account
  AND ret_t.txn_time     >  out_t.txn_time
  AND ret_t.txn_time     <= datetime(out_t.txn_time, '+24 hours')
  AND ABS(ret_t.amount - out_t.amount) * 10 <= out_t.amount
ORDER BY out_t.txn_time, ret_t.txn_time;

-- PostgreSQL equivalent of the time predicates (txn_time as TIMESTAMP):
--   AND ret_t.txn_time >  out_t.txn_time
--   AND ret_t.txn_time <= out_t.txn_time + INTERVAL '24 hours'
--   hours_between = ROUND(EXTRACT(EPOCH FROM ret_t.txn_time - out_t.txn_time) / 3600, 2)
