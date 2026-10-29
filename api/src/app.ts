import express, { NextFunction, Request, Response } from 'express';
import { ApiError, notFound, validationError } from './errors';
import { allTitles, findTitle, GENRES, LANGUAGES, Title } from './repository';
import { validateQuery } from './validation';

const SORTABLE_TITLE_FIELDS = ['id', 'title', 'releaseYear', 'rating'] as const;
const MAX_LIMIT = 50;

const titleQuerySchema = {
  q: { kind: 'string', minLength: 2, maxLength: 100 },
  type: { kind: 'enum', values: ['movie', 'series'], caseInsensitive: true },
  genre: { kind: 'enum', values: GENRES, caseInsensitive: true },
  language: { kind: 'enum', values: LANGUAGES, caseInsensitive: true },
  minRating: { kind: 'number', min: 0, max: 10 },
  yearFrom: { kind: 'int', min: 1900, max: 2100 },
  yearTo: { kind: 'int', min: 1900, max: 2100 },
  sort: { kind: 'enum', values: SORTABLE_TITLE_FIELDS, default: 'id' },
  order: { kind: 'enum', values: ['asc', 'desc'], caseInsensitive: true, default: 'asc' },
  page: { kind: 'int', min: 1, max: 10_000, default: 1 },
  limit: { kind: 'int', min: 1, max: MAX_LIMIT, default: 10 },
} as const;

const genreQuerySchema = {
  sort: { kind: 'enum', values: ['name', 'count'], default: 'name' },
  order: { kind: 'enum', values: ['asc', 'desc'], caseInsensitive: true, default: 'asc' },
} as const;

function compare(a: Title, b: Title, field: (typeof SORTABLE_TITLE_FIELDS)[number], direction: 1 | -1): number {
  const x = a[field];
  const y = b[field];
  const primary = typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number);
  // Ties are always broken by id ascending (whatever the order) so paging is deterministic.
  return primary !== 0 ? direction * primary : a.id - b.id;
}

export function createApp() {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  /** GET /api/titles — search, filter, sort and paginate the catalogue. */
  app.get('/api/titles', (req, res) => {
    const p = validateQuery(req.query as Record<string, unknown>, titleQuerySchema);
    if (p.yearFrom !== undefined && p.yearTo !== undefined && p.yearFrom > p.yearTo) {
      throw validationError([{ param: 'yearFrom', message: "'yearFrom' must be less than or equal to 'yearTo'." }]);
    }

    const q = p.q?.toLowerCase();
    const filtered = allTitles().filter(
      (t) =>
        (q === undefined || t.title.toLowerCase().includes(q)) &&
        (p.type === undefined || t.type === p.type) &&
        (p.genre === undefined || t.genre === p.genre) &&
        (p.language === undefined || t.language === p.language) &&
        (p.minRating === undefined || t.rating >= p.minRating) &&
        (p.yearFrom === undefined || t.releaseYear >= p.yearFrom) &&
        (p.yearTo === undefined || t.releaseYear <= p.yearTo),
    );

    const direction = p.order === 'desc' ? -1 : 1;
    filtered.sort((a, b) => compare(a, b, p.sort, direction));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / p.limit));
    const start = (p.page - 1) * p.limit;
    // A page past the end is a valid request for an empty slice, not an error.
    const data = filtered.slice(start, start + p.limit);

    res.json({
      data,
      meta: { page: p.page, limit: p.limit, total, totalPages, sort: p.sort, order: p.order },
    });
  });

  /** GET /api/titles/:id — one title by numeric id. */
  app.get('/api/titles/:id', (req, res) => {
    const { id } = req.params;
    if (!/^\d+$/.test(id) || Number(id) < 1) {
      throw validationError([{ param: 'id', message: "'id' must be a positive integer." }], 'The path parameter is invalid.');
    }
    if (Object.keys(req.query).length) {
      validateQuery(req.query as Record<string, unknown>, {});
    }
    const title = findTitle(Number(id));
    if (!title) throw notFound(`Title with id ${id} was not found.`);
    res.json({ data: title });
  });

  /** GET /api/genres — genres with how many titles each has. */
  app.get('/api/genres', (req, res) => {
    const p = validateQuery(req.query as Record<string, unknown>, genreQuerySchema);
    const counts = new Map<string, number>();
    for (const t of allTitles()) counts.set(t.genre, (counts.get(t.genre) ?? 0) + 1);
    const direction = p.order === 'desc' ? -1 : 1;
    const data = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      // Ties on count are always broken by name ascending, independent of `order`.
      .sort((a, b) => (p.sort === 'count' ? direction * (a.count - b.count) || a.name.localeCompare(b.name) : direction * a.name.localeCompare(b.name)));
    res.json({ data, meta: { total: data.length, sort: p.sort, order: p.order } });
  });

  app.use((req, _res, next) => next(notFound(`Route ${req.method} ${req.path} does not exist.`)));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const apiError = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error.');
    if (!(err instanceof ApiError)) console.error(err);
    res.status(apiError.status).json(apiError.toBody());
  });

  return app;
}
