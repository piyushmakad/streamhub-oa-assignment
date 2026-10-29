import Ajv, { ValidateFunction } from 'ajv';

/** JSON Schemas for every response shape the API promises. `additionalProperties: false` catches accidental leaks. */
const title = {
  type: 'object',
  required: ['id', 'title', 'type', 'genre', 'language', 'releaseYear', 'rating'],
  additionalProperties: false,
  properties: {
    id: { type: 'integer', minimum: 1 },
    title: { type: 'string', minLength: 1 },
    type: { enum: ['movie', 'series'] },
    genre: { type: 'string', minLength: 1 },
    language: { type: 'string', minLength: 1 },
    releaseYear: { type: 'integer', minimum: 1900, maximum: 2100 },
    rating: { type: 'number', minimum: 0, maximum: 10 },
    durationMinutes: { type: 'integer', minimum: 1 },
    seasons: { type: 'integer', minimum: 1 },
  },
  // Movies carry a duration, series carry a season count.
  oneOf: [
    { properties: { type: { const: 'movie' } }, required: ['durationMinutes'], not: { required: ['seasons'] } },
    { properties: { type: { const: 'series' } }, required: ['seasons'], not: { required: ['durationMinutes'] } },
  ],
};

const schemas = {
  'title list': {
    type: 'object',
    required: ['data', 'meta'],
    additionalProperties: false,
    properties: {
      data: { type: 'array', items: title },
      meta: {
        type: 'object',
        required: ['page', 'limit', 'total', 'totalPages', 'sort', 'order'],
        additionalProperties: false,
        properties: {
          page: { type: 'integer', minimum: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
          total: { type: 'integer', minimum: 0 },
          totalPages: { type: 'integer', minimum: 1 },
          sort: { enum: ['id', 'title', 'releaseYear', 'rating'] },
          order: { enum: ['asc', 'desc'] },
        },
      },
    },
  },
  'single title': {
    type: 'object',
    required: ['data'],
    additionalProperties: false,
    properties: { data: title },
  },
  'genre list': {
    type: 'object',
    required: ['data', 'meta'],
    additionalProperties: false,
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'count'],
          additionalProperties: false,
          properties: { name: { type: 'string' }, count: { type: 'integer', minimum: 1 } },
        },
      },
      meta: {
        type: 'object',
        required: ['total', 'sort', 'order'],
        additionalProperties: false,
        properties: { total: { type: 'integer' }, sort: { enum: ['name', 'count'] }, order: { enum: ['asc', 'desc'] } },
      },
    },
  },
  error: {
    type: 'object',
    required: ['error'],
    additionalProperties: false,
    properties: {
      error: {
        type: 'object',
        required: ['status', 'code', 'message', 'details'],
        additionalProperties: false,
        properties: {
          status: { type: 'integer', minimum: 400, maximum: 599 },
          code: { enum: ['VALIDATION_ERROR', 'NOT_FOUND', 'INTERNAL_ERROR'] },
          message: { type: 'string', minLength: 1 },
          details: {
            type: 'array',
            items: {
              type: 'object',
              required: ['param', 'message'],
              additionalProperties: false,
              properties: { param: { type: 'string' }, message: { type: 'string', minLength: 1 } },
            },
          },
        },
      },
    },
  },
  health: {
    type: 'object',
    required: ['status'],
    additionalProperties: false,
    properties: { status: { const: 'ok' } },
  },
} as const;

export type SchemaName = keyof typeof schemas;

const ajv = new Ajv({ allErrors: true });
const compiled = new Map<string, ValidateFunction>();

export function validateSchema(name: string, body: unknown): string[] {
  if (!(name in schemas)) throw new Error(`Unknown schema "${name}". Known: ${Object.keys(schemas).join(', ')}`);
  let validate = compiled.get(name);
  if (!validate) {
    validate = ajv.compile(schemas[name as SchemaName]);
    compiled.set(name, validate);
  }
  return validate(body) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message}`);
}
