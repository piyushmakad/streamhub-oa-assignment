import fs from 'fs';
import path from 'path';
import { Locator, Page } from 'playwright';
import { config } from '../config';
import { collectCandidates } from './dom-snapshot';
import { suggestHeuristically } from './heuristic-engine';
import { suggestWithLlm } from './llm-engine';
import { describe, toLocator, validate } from './validator';
import { HealableLocatorSpec, HealingRecord, Suggestion } from './types';

/**
 * Self-healing locator POC.
 *
 *   detect  → the declared selector does not resolve to exactly one element within a short wait
 *   suggest → LLM engine (if ANTHROPIC_API_KEY is set) else the offline heuristic engine
 *   validate→ every suggestion must pass validator.ts against the live page
 *   apply   → the first validated locator is used for THIS run only; the source file is never
 *             edited. A report with a proposed patch is written for a human to review.
 *
 * With SELF_HEAL=false the original locator is returned unchanged, so the test fails exactly as
 * it would without the healer (the failure is still recorded as "detected-only").
 */
const reportDir = path.join(config.paths.reports, 'self-healing');
const reportJson = path.join(reportDir, `healing-report${config.selfHealing.enabled ? '' : '-detect-only'}.json`);
let records: HealingRecord[] | undefined;

function persist(record: HealingRecord) {
  records ??= []; // first write in this process starts a fresh report
  records.push(record);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportJson, JSON.stringify(records, null, 2));
  fs.writeFileSync(reportJson.replace(/\.json$/, '.md'), toMarkdown(records));
}

async function detect(page: Page, selector: string): Promise<string | undefined> {
  const locator = page.locator(selector);
  try {
    await locator.first().waitFor({ state: 'attached', timeout: 3000 });
  } catch (e) {
    return (e as Error).message.split('\n')[0];
  }
  const count = await locator.count();
  return count === 1 ? undefined : `selector matched ${count} elements (expected exactly 1)`;
}

export async function healable(page: Page, spec: HealableLocatorSpec): Promise<Locator> {
  const failure = await detect(page, spec.selector);
  if (!failure) return page.locator(spec.selector);
  return heal(page, spec, failure);
}

export interface AuditResult {
  key: string;
  selector: string;
  status: 'ok' | HealingRecord['status'];
  detail?: string;
}

/**
 * Drift check: probes every locator up front instead of stopping at the first broken one, so a
 * single run reports all of them. With SELF_HEAL=true each broken locator also goes through the
 * normal heal-and-validate path; a refusal is recorded, not thrown.
 */
export async function auditLocators(page: Page, specs: HealableLocatorSpec[]): Promise<AuditResult[]> {
  const results: AuditResult[] = [];
  for (const spec of specs) {
    const failure = await detect(page, spec.selector);
    if (!failure) {
      results.push({ key: spec.key, selector: spec.selector, status: 'ok' });
      continue;
    }
    try {
      await heal(page, spec, failure);
    } catch (e) {
      if (!(e instanceof HealingRefusedError)) throw e;
    }
    const record = records![records!.length - 1];
    results.push({ key: spec.key, selector: spec.selector, status: record.status, detail: record.healedLocator ?? failure });
  }
  return results;
}

async function heal(page: Page, spec: HealableLocatorSpec, failure: string): Promise<Locator> {
  const base = {
    timestamp: new Date().toISOString(),
    key: spec.key,
    sourceFile: spec.sourceFile,
    brokenSelector: spec.selector,
    intent: spec.intent,
    failure,
  };

  if (!config.selfHealing.enabled) {
    persist({ ...base, engine: 'none', status: 'detected-only', validations: [] });
    console.warn(`  ⚠ broken locator "${spec.key}" (${spec.selector}): ${failure} — self-healing is off`);
    return page.locator(spec.selector);
  }

  const candidates = await collectCandidates(page);
  let engine: HealingRecord['engine'] = 'heuristic';
  let suggestions: Suggestion[];
  if (config.selfHealing.anthropicApiKey) {
    engine = 'llm';
    try {
      suggestions = await suggestWithLlm(spec, failure, candidates, { apiKey: config.selfHealing.anthropicApiKey, model: config.selfHealing.model });
    } catch (e) {
      console.warn(`  ⚠ LLM engine failed (${(e as Error).message}); falling back to heuristics`);
      engine = 'heuristic';
      suggestions = suggestHeuristically(spec, candidates);
    }
  } else {
    suggestions = suggestHeuristically(spec, candidates);
  }

  const validations = [];
  for (const s of suggestions) {
    const result = await validate(page, spec, s);
    validations.push(result);
    if (result.accepted) {
      persist({ ...base, engine, status: 'healed', healedLocator: describe(s), validations });
      console.warn(`  ✚ healed "${spec.key}": ${spec.selector}  →  ${describe(s)}  [${engine}]`);
      return toLocator(page, s);
    }
  }

  persist({ ...base, engine, status: 'no-safe-candidate', validations });
  console.warn(`  ✖ "${spec.key}": no suggestion passed validation — refusing to guess`);
  throw new HealingRefusedError(spec, failure);
}

export class HealingRefusedError extends Error {
  constructor(readonly spec: HealableLocatorSpec, failure: string) {
    super(`Self-healing refused for "${spec.key}" (${spec.selector}): ${failure}. No candidate passed validation.`);
  }
}

function toMarkdown(rs: HealingRecord[]): string {
  const lines = [
    '# Self-healing report',
    '',
    `Mode: ${config.selfHealing.enabled ? 'SELF_HEAL=true' : 'detect only (SELF_HEAL=false)'}  `,
    `Engine available: ${config.selfHealing.anthropicApiKey ? `LLM (${config.selfHealing.model}) with heuristic fallback` : 'heuristic (no ANTHROPIC_API_KEY)'}  `,
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Locator | Status | Engine | Broken selector | Healed locator |',
    '|---|---|---|---|---|',
    ...rs.map((r) => `| \`${r.key}\` | **${r.status}** | ${r.engine} | \`${r.brokenSelector}\` | ${r.healedLocator ? `\`${r.healedLocator}\`` : '—'} |`),
    '',
  ];
  for (const r of rs) {
    lines.push(`## ${r.key} — ${r.status}`, '', `- **Intent:** ${r.intent}`, `- **Detected failure:** ${r.failure}`, `- **Owner:** \`${r.sourceFile}\``);
    if (r.validations.length) {
      lines.push('', '| # | Suggestion | Confidence | Result | Checks |', '|---|---|---|---|---|');
      r.validations.forEach((v, i) =>
        lines.push(
          `| ${i + 1} | \`${describe(v.suggestion)}\` | ${v.suggestion.confidence} | ${v.accepted ? '✅ accepted' : '❌ rejected'} | ${v.checks
            .map((c) => `${c.passed ? '✓' : '✗'} ${c.check}${c.detail ? ` (${c.detail.replace(/\|/g, '\\|')})` : ''}`)
            .join('<br>')} |`,
        ),
      );
    }
    if (r.healedLocator) {
      lines.push('', 'Proposed patch (for human review — never auto-applied):', '', '```diff', `- '${r.brokenSelector}'`, `+ ${r.healedLocator}`, '```');
    }
    lines.push('');
  }
  return lines.join('\n');
}
