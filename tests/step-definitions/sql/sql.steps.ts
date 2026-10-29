import { DataTable, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { openSeededDb, QueryName, runQuery } from '../../../sql/db';

When('I run the {string} query against the seeded database', async function (this: CustomWorld, name: QueryName) {
  const db = await openSeededDb();
  this.sqlRows = runQuery(db, name).rows;
  db.close();
  this.attach(JSON.stringify(this.sqlRows, null, 2), 'application/json');
});

Then('the query should return exactly these rows:', function (this: CustomWorld, table: DataTable) {
  const expected = table.hashes();
  const columns = Object.keys(expected[0]);
  // Compare only the columns the feature lists, as strings, in order.
  const actual = this.sqlRows!.map((r) => Object.fromEntries(columns.map((c) => [c, String(r[c])])));
  expect(actual).toEqual(expected);
});

Then('no returned row should involve transactions {string}', function (this: CustomWorld, csv: string) {
  const excluded = new Set(csv.split(',').map(Number));
  for (const r of this.sqlRows!) {
    expect(excluded.has(Number(r.outbound_txn_id)), `outbound txn ${r.outbound_txn_id}`).toBe(false);
    expect(excluded.has(Number(r.return_txn_id)), `return txn ${r.return_txn_id}`).toBe(false);
  }
});

Then('no returned row should be for players {string}', function (this: CustomWorld, csv: string) {
  const excluded = new Set(csv.split(','));
  for (const r of this.sqlRows!) expect(excluded.has(String(r.player_name)), String(r.player_name)).toBe(false);
});
