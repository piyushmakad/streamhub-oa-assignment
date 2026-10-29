import { ErrorDetail, validationError } from './errors';

type RawQuery = Record<string, unknown>;

/**
 * Small declarative query validator. Each endpoint declares the parameters it accepts;
 * anything else (unknown names, repeated keys, wrong types, out-of-range values) is a 400.
 * All problems are collected and reported together rather than failing on the first one.
 */
export type ParamRule =
  | { kind: 'int'; min?: number; max?: number; default?: number }
  | { kind: 'number'; min?: number; max?: number }
  | { kind: 'enum'; values: readonly string[]; caseInsensitive?: boolean; default?: string }
  | { kind: 'string'; minLength?: number; maxLength?: number };

export type Schema = Record<string, ParamRule>;

export function validateQuery<S extends Schema>(query: RawQuery, schema: S): Record<keyof S, any> {
  const details: ErrorDetail[] = [];
  const out: Record<string, unknown> = {};

  for (const name of Object.keys(query)) {
    if (!(name in schema)) {
      details.push({ param: name, message: `Unknown query parameter '${name}'. Allowed: ${Object.keys(schema).join(', ')}.` });
    }
  }

  for (const [name, rule] of Object.entries(schema)) {
    const raw = query[name];
    if (raw === undefined) {
      if ('default' in rule && rule.default !== undefined) out[name] = rule.default;
      continue;
    }
    if (Array.isArray(raw) || typeof raw !== 'string') {
      details.push({ param: name, message: `'${name}' must be supplied once as a single value.` });
      continue;
    }
    const value = raw.trim();
    if (value === '') {
      details.push({ param: name, message: `'${name}' must not be empty.` });
      continue;
    }

    switch (rule.kind) {
      case 'int': {
        if (!/^-?\d+$/.test(value)) {
          details.push({ param: name, message: `'${name}' must be an integer.` });
          break;
        }
        const n = Number(value);
        if ((rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max)) {
          details.push({ param: name, message: `'${name}' must be between ${rule.min ?? '-∞'} and ${rule.max ?? '∞'}.` });
          break;
        }
        out[name] = n;
        break;
      }
      case 'number': {
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          details.push({ param: name, message: `'${name}' must be a number.` });
          break;
        }
        const n = Number(value);
        if ((rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max)) {
          details.push({ param: name, message: `'${name}' must be between ${rule.min ?? '-∞'} and ${rule.max ?? '∞'}.` });
          break;
        }
        out[name] = n;
        break;
      }
      case 'enum': {
        const match = rule.values.find((v) => (rule.caseInsensitive ? v.toLowerCase() === value.toLowerCase() : v === value));
        if (!match) {
          details.push({ param: name, message: `'${name}' must be one of: ${rule.values.join(', ')}.` });
          break;
        }
        out[name] = match;
        break;
      }
      case 'string': {
        if ((rule.minLength !== undefined && value.length < rule.minLength) || (rule.maxLength !== undefined && value.length > rule.maxLength)) {
          details.push({ param: name, message: `'${name}' must be between ${rule.minLength ?? 0} and ${rule.maxLength ?? '∞'} characters.` });
          break;
        }
        out[name] = value;
        break;
      }
    }
  }

  if (details.length) throw validationError(details);
  return out as Record<keyof S, any>;
}
