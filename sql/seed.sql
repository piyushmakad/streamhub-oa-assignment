-- =====================================================================
-- Seed data. Every row exists to exercise a specific rule; the expected
-- outcome is noted next to it and asserted in tests/features/sql/*.feature.
-- =====================================================================

-- ---------- Scenario 1: transfers ----------
INSERT INTO accounts VALUES
 ('ACC-A','Asha'),('ACC-B','Bilal'),('ACC-C','Chen'),('ACC-D','Dara'),('ACC-E','Esha'),('ACC-F','Farid'),
 ('ACC-G','Gita'),('ACC-H','Hari'),('ACC-I','Ines'),('ACC-J','Jai'),('ACC-K','Kavya'),('ACC-L','Leo'),
 ('ACC-M','Mira'),('ACC-N','Nikhil'),('ACC-O','Omar'),('ACC-P','Priya'),('ACC-Q','Quinn'),('ACC-R','Rhea'),
 ('ACC-S','Sahil'),('ACC-U','Uma'),('ACC-V','Varun');

INSERT INTO transactions (txn_id, from_account, to_account, amount, txn_time) VALUES
 -- MATCH: 5% lower, 8 hours later
 (1,  'ACC-A','ACC-B', 1000, '2024-03-01 10:00:00'),
 (2,  'ACC-B','ACC-A',  950, '2024-03-01 18:00:00'),
 -- MATCH (boundaries are inclusive): exactly +10% and exactly 24h later
 (3,  'ACC-C','ACC-D', 5000, '2024-03-02 09:00:00'),
 (4,  'ACC-D','ACC-C', 5500, '2024-03-03 09:00:00'),
 -- NO MATCH: 10.5% more
 (5,  'ACC-E','ACC-F', 2000, '2024-03-04 12:00:00'),
 (6,  'ACC-F','ACC-E', 2210, '2024-03-04 20:00:00'),
 -- NO MATCH: same amount but 24h 1m later
 (7,  'ACC-G','ACC-H', 3000, '2024-03-05 08:00:00'),
 (8,  'ACC-H','ACC-G', 3000, '2024-03-06 08:01:00'),
 -- NO MATCH: same direction twice is not a round trip
 (9,  'ACC-I','ACC-J', 1500, '2024-03-07 10:00:00'),
 (10, 'ACC-I','ACC-J', 1500, '2024-03-07 11:00:00'),
 -- NO MATCH: money moves on to a third account, not back
 (11, 'ACC-K','ACC-L',  800, '2024-03-08 10:00:00'),
 (12, 'ACC-L','ACC-M',  800, '2024-03-08 11:00:00'),
 -- MATCH, initiated by O: inserted out of time order on purpose; O->N happens first
 (13, 'ACC-N','ACC-O', 1200, '2024-03-09 15:00:00'),
 (14, 'ACC-O','ACC-N', 1250, '2024-03-09 09:00:00'),
 -- MATCH x2: one outbound transfer answered by two qualifying returns
 (15, 'ACC-P','ACC-Q',10000, '2024-03-10 10:00:00'),
 (16, 'ACC-Q','ACC-P', 9500, '2024-03-10 12:00:00'),
 (17, 'ACC-Q','ACC-P',10400, '2024-03-10 22:00:00'),
 -- MATCH: exactly -10%
 (18, 'ACC-R','ACC-S',  600, '2024-03-11 10:00:00'),
 (19, 'ACC-S','ACC-R',  540, '2024-03-11 10:30:00'),
 -- MATCH: crosses midnight
 (20, 'ACC-U','ACC-V',  700, '2024-03-12 23:30:00'),
 (21, 'ACC-V','ACC-U',  690, '2024-03-13 00:15:00'),
 -- NO MATCH: a later B->A long after txn 1's window
 (22, 'ACC-B','ACC-A', 1000, '2024-03-05 10:00:00');

-- ---------- Scenario 2: IPL-style 2024 season ----------
INSERT INTO teams VALUES
 ('CSK','Chennai Super Kings'),('RCB','Royal Challengers Bengaluru'),('MI','Mumbai Indians'),('KKR','Kolkata Knight Riders');

INSERT INTO players VALUES
 (1,'Arjun Mehta','CSK'),(2,'Ravi Iyer','CSK'),
 (3,'Kabir Rao','RCB'),(4,'Dev Sharma','RCB'),
 (5,'Rohan Kulkarni','MI'),(6,'Sameer Khan','MI'),
 (7,'Vikram Nair','KKR'),(8,'Aditya Bose','KKR');

INSERT INTO matches VALUES
 -- 2023 season (must never contribute to a 2024 streak)
 (101, 2023, '2023-05-20', 'CSK','RCB'),
 (102, 2023, '2023-05-25', 'MI','KKR'),
 -- 2024 season
 (1,  2024, '2024-03-22', 'CSK','RCB'),
 (2,  2024, '2024-03-23', 'MI','KKR'),
 (3,  2024, '2024-03-25', 'RCB','KKR'),
 (4,  2024, '2024-03-26', 'CSK','MI'),
 (5,  2024, '2024-03-29', 'RCB','MI'),
 (6,  2024, '2024-03-30', 'KKR','CSK'),
 (7,  2024, '2024-04-02', 'RCB','CSK'),
 (8,  2024, '2024-04-03', 'KKR','MI'),
 (9,  2024, '2024-04-06', 'KKR','RCB'),
 (10, 2024, '2024-04-07', 'MI','CSK'),
 (11, 2024, '2024-04-10', 'MI','RCB'),
 (12, 2024, '2024-04-11', 'CSK','KKR'),
 (13, 2024, '2024-04-14', 'MI','KKR');

INSERT INTO batting_scores (match_id, player_id, runs) VALUES
 -- 2023
 (101,1,99),(101,2,40),(101,3,50),(101,4,12),
 (102,5,33),(102,6,8),(102,7,31),(102,8,0),

 -- Arjun Mehta (CSK: 1,4,6,7,10,12) 45,32,30 | 12 | 50 | 8   -> streak from 2024-03-22 (30 counts)
 (1,1,45),(4,1,32),(6,1,30),(7,1,12),(10,1,50),(12,1,8),
 -- Ravi Iyer (CSK) 2023:40 then 35,31 | 10 | 33,44,61         -> streak from 2024-04-02 only (seasons don't chain)
 (1,2,35),(4,2,31),(6,2,10),(7,2,33),(10,2,44),(12,2,61),

 -- Kabir Rao (RCB: 1,3,5,7,9,11) 30,30 | 29 | 30,30 | 2       -> none (29 breaks it)
 (1,3,30),(3,3,30),(5,3,29),(7,3,30),(9,3,30),(11,3,2),
 -- Dev Sharma (RCB) 55,70,31,40 | 5 | 90                      -> one 4-match streak from 2024-03-22
 (1,4,55),(3,4,70),(5,4,31),(7,4,40),(9,4,5),(11,4,90),

 -- Rohan Kulkarni (MI: 2,4,5,8,10,11,13) 31,44,39 | 7 | 36,41,58 -> two streaks: 2024-03-23 and 2024-04-07
 (2,5,31),(4,5,44),(5,5,39),(8,5,7),(10,5,36),(11,5,41),(13,5,58),
 -- Sameer Khan (MI) 35,42 | 12 | 50 | DNB | 60,33            -> none (did-not-bat breaks it)
 (2,6,35),(4,6,42),(5,6,12),(8,6,50),(10,6,NULL),(11,6,60),(13,6,33),

 -- Vikram Nair (KKR: 2,3,6,8,9,12,13) 30,30,30 | 1,2,3,4       -> exactly 3, from 2024-03-23
 (2,7,30),(3,7,30),(6,7,30),(8,7,1),(9,7,2),(12,7,3),(13,7,4),
 -- Aditya Bose (KKR) 100,5,100,5,100,5,100                    -> none (never consecutive)
 (2,8,100),(3,8,5),(6,8,100),(8,8,5),(9,8,100),(12,8,5),(13,8,100);
