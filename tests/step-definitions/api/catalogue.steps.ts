import { DataTable, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { QueryParams } from '../../api/CatalogueApiClient';
import { validateSchema } from '../../api/schemas';

// Gherkin trims table cells, so whitespace-only values need a token.
const TOKENS: Record<string, string> = { '<blank>': '   ', '<empty>': '' };

/** | param | value | rows -> query params; repeated rows become repeated keys. */
function toParams(table: DataTable): QueryParams {
  const params: QueryParams = {};
  for (const { param, value } of table.hashes()) {
    const v = TOKENS[value] ?? value;
    params[param] = param in params ? [params[param]].flat().concat(v) : v;
  }
  return params;
}

async function receive(world: CustomWorld, response: Awaited<ReturnType<CustomWorld['catalogue']['get']>>) {
  world.response = response;
  const text = await response.text();
  try {
    world.responseBody = JSON.parse(text);
  } catch {
    throw new Error(`Expected a JSON body from ${response.url()} (${response.status()}), got: ${text.slice(0, 200)}`);
  }
}

const titles = (world: CustomWorld): any[] => world.body.data;

// ---------- requests ----------
When('I request the titles', async function (this: CustomWorld) {
  await receive(this, await this.catalogue.listTitles());
});

When('I request the titles with:', async function (this: CustomWorld, table: DataTable) {
  await receive(this, await this.catalogue.listTitles(toParams(table)));
});

When('I search titles with a term of {int} characters', async function (this: CustomWorld, length: number) {
  await receive(this, await this.catalogue.listTitles({ q: 'x'.repeat(length) }));
});

When('I request the title with id {string}', async function (this: CustomWorld, id: string) {
  await receive(this, await this.catalogue.getTitle(id));
});

When('I request the title with id {string} and query {string}', async function (this: CustomWorld, id: string, query: string) {
  await receive(this, await this.catalogue.getTitle(id, Object.fromEntries(new URLSearchParams(query))));
});

When('I request the genres', async function (this: CustomWorld) {
  await receive(this, await this.catalogue.listGenres());
});

When('I request the genres with:', async function (this: CustomWorld, table: DataTable) {
  await receive(this, await this.catalogue.listGenres(toParams(table)));
});

When('I call the health endpoint', async function (this: CustomWorld) {
  await receive(this, await this.catalogue.health());
});

When('I send a GET request to {string}', async function (this: CustomWorld, path: string) {
  await receive(this, await this.catalogue.get(path));
});

// ---------- status & shape ----------
Then('the response status should be {int}', function (this: CustomWorld, status: number) {
  expect(this.response!.status(), `Body: ${JSON.stringify(this.responseBody)}`).toBe(status);
  expect(this.response!.headers()['content-type']).toContain('application/json');
});

Then('the response should match the {string} schema', function (this: CustomWorld, schema: string) {
  expect(validateSchema(schema, this.body), `Schema "${schema}" violations`).toEqual([]);
});

Then('the error code should be {string}', function (this: CustomWorld, code: string) {
  expect(this.body.error.code).toBe(code);
  expect(this.body.error.status).toBe(this.response!.status());
});

Then('the error details should name the parameters {string}', function (this: CustomWorld, csv: string) {
  const expected = csv.split(',').map((s) => s.trim()).sort();
  const actual = [...new Set<string>(this.body.error.details.map((d: any) => d.param))].sort();
  expect(actual).toEqual(expected);
});

// ---------- titles ----------
Then('{int} titles should be returned', function (this: CustomWorld, count: number) {
  expect(titles(this)).toHaveLength(count);
});

Then('the total should be {int}', function (this: CustomWorld, total: number) {
  expect(this.body.meta.total).toBe(total);
  expect(titles(this).length).toBe(Math.min(total, this.body.meta.limit));
});

Then('the pagination meta should be:', function (this: CustomWorld, table: DataTable) {
  const [row] = table.hashes();
  const expected = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, /^\d+$/.test(v) ? Number(v) : v]));
  expect(this.body.meta).toEqual(expected);
});

Then(
  /^every returned title should satisfy "([^"]+)" (equals|contains|at least|at most) "([^"]*)"$/,
  function (this: CustomWorld, field: string, operator: string, expected: string) {
    assertEvery(titles(this), field, operator, expected);
  },
);

function assertEvery(items: any[], field: string, operator: string, expected: string) {
  for (const item of items) {
    const actual = item[field];
    const where = `title id ${item.id} ${field}=${JSON.stringify(actual)}`;
    switch (operator) {
      case 'equals':
        expect(String(actual), where).toBe(expected);
        break;
      case 'contains':
        expect(String(actual).toLowerCase(), where).toContain(expected.toLowerCase());
        break;
      case 'at least':
        expect(actual, where).toBeGreaterThanOrEqual(Number(expected));
        break;
      case 'at most':
        expect(actual, where).toBeLessThanOrEqual(Number(expected));
        break;
      default:
        throw new Error(`Unknown operator "${operator}"`);
    }
  }
}

Then('the returned titles should be sorted by {string} in {string} order', function (this: CustomWorld, field: string, order: string) {
  const items = titles(this);
  const dir = order === 'desc' ? -1 : 1;
  for (let i = 1; i < items.length; i++) {
    const [a, b] = [items[i - 1], items[i]];
    const cmp = typeof a[field] === 'string' ? a[field].localeCompare(b[field]) : a[field] - b[field];
    const ordered = dir * cmp < 0 || (cmp === 0 && a.id < b.id);
    expect(ordered, `Out of order at index ${i}: ${a[field]} (id ${a.id}) then ${b[field]} (id ${b.id})`).toBe(true);
  }
});

Then('the returned title ids should be {string}', function (this: CustomWorld, csv: string) {
  expect(titles(this).map((t) => t.id)).toEqual(csv.split(',').map(Number));
});

Then('the returned title should have id {int} and title {string}', function (this: CustomWorld, id: number, title: string) {
  expect(this.body.data).toMatchObject({ id, title });
});

When(
  'I page through all titles {int} at a time sorted by {string} in {string} order',
  async function (this: CustomWorld, limit: number, sort: string, order: string) {
    const seen: number[] = [];
    let page = 1;
    let totalPages = 1;
    let total = 0;
    do {
      const res = await this.catalogue.listTitles({ page: String(page), limit: String(limit), sort, order });
      expect(res.status()).toBe(200);
      const body = await res.json();
      totalPages = body.meta.totalPages;
      total = body.meta.total;
      seen.push(...body.data.map((t: any) => t.id));
      page++;
    } while (page <= totalPages);
    this.responseBody = { seen, total };
  },
);

Then('every title in the catalogue should have been returned exactly once', function (this: CustomWorld) {
  const { seen, total } = this.body;
  expect(seen).toHaveLength(total);
  expect(new Set(seen).size).toBe(total);
});

// ---------- genres ----------
Then('the genres should be sorted by {string} in {string} order', function (this: CustomWorld, sort: string, order: string) {
  const genres: { name: string; count: number }[] = this.body.data;
  const dir = order === 'desc' ? -1 : 1;
  for (let i = 1; i < genres.length; i++) {
    const [a, b] = [genres[i - 1], genres[i]];
    if (sort === 'name') {
      expect(dir * a.name.localeCompare(b.name), `${a.name} before ${b.name}`).toBeLessThan(0);
    } else {
      const byCount = dir * (a.count - b.count);
      // Equal counts are always tie-broken by name ascending.
      expect(byCount < 0 || (byCount === 0 && a.name.localeCompare(b.name) < 0), `${a.name}(${a.count}) before ${b.name}(${b.count})`).toBe(true);
    }
  }
});

Then('each genre count should equal the titles total for that genre', async function (this: CustomWorld) {
  for (const genre of this.body.data as { name: string; count: number }[]) {
    const res = await this.catalogue.listTitles({ genre: genre.name, limit: '1' });
    expect((await res.json()).meta.total, `genre ${genre.name}`).toBe(genre.count);
  }
});

Then('the genre counts should add up to the total number of titles', async function (this: CustomWorld) {
  const sum = (this.body.data as { count: number }[]).reduce((acc, g) => acc + g.count, 0);
  const all = await (await this.catalogue.listTitles({ limit: '1' })).json();
  expect(sum).toBe(all.meta.total);
});
