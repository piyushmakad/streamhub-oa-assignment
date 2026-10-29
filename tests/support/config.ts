import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

/**
 * Environment configuration. Nothing in the tests hardcodes a URL — everything comes from
 * config/env/.env.<TEST_ENV> (default "qa"), optionally overridden by config/env/.env.local
 * and then by real environment variables (highest priority, e.g. in CI).
 */
const envName = process.env.TEST_ENV ?? 'qa';
const envDir = path.resolve(__dirname, '../../config/env');
const envFile = path.join(envDir, `.env.${envName}`);

if (!fs.existsSync(envFile)) {
  throw new Error(`Unknown TEST_ENV "${envName}": ${envFile} does not exist.`);
}

// dotenv never overrides variables already set, so load the most specific file first.
dotenv.config({ path: path.join(envDir, '.env.local'), quiet: true });
dotenv.config({ path: envFile, quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`Missing required config "${name}" for TEST_ENV=${envName}.`);
  return value;
}

const bool = (name: string, fallback = false) => (process.env[name] ?? String(fallback)).toLowerCase() === 'true';
const int = (name: string) => {
  const n = Number(required(name));
  if (!Number.isInteger(n)) throw new Error(`Config "${name}" must be an integer.`);
  return n;
};

export const config = {
  envName,
  api: {
    baseUrl: required('API_BASE_URL'),
    port: int('API_PORT'),
    startInProcess: bool('START_API'),
  },
  emi: {
    baseUrl: required('EMI_BASE_URL'),
  },
  browser: {
    name: required('BROWSER') as 'chromium' | 'firefox' | 'webkit',
    headless: bool('HEADLESS', true),
    viewport: { width: int('VIEWPORT_WIDTH'), height: int('VIEWPORT_HEIGHT') },
    defaultTimeoutMs: int('DEFAULT_TIMEOUT_MS'),
    navigationTimeoutMs: int('NAVIGATION_TIMEOUT_MS'),
    blockAds: bool('BLOCK_ADS', true),
  },
  selfHealing: {
    enabled: bool('SELF_HEAL'),
    model: process.env.HEAL_MODEL ?? 'claude-opus-5-5',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
  },
  paths: {
    reports: path.resolve(__dirname, '../../reports'),
  },
} as const;

export type Config = typeof config;
