import { Candidate, HealableLocatorSpec, Suggestion } from './types';

/**
 * Offline suggestion engine used when no LLM key is configured (and in CI).
 * Scores candidates by how well their attributes match the intent and the broken selector,
 * then proposes the most resilient locator each top candidate supports.
 */
const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'for', 'in', 'on', 'to', 'and', 'with', 'text', 'value', 'div', 'span', 'xpath', 'css', 'html', 'body', 'main', 'nth', 'child', 'li', 'p']);

export function tokens(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function score(c: Candidate, spec: HealableLocatorSpec, wanted: string[]): number {
  let s = 0;
  const fields: [string | undefined, number][] = [
    [c.labelText, 4],
    [c.ariaLabel, 4],
    [c.text, 3],
    [c.id, 3],
    [c.name, 2],
    [c.testId, 4],
    [c.placeholder, 2],
    [c.ancestorId, 1.5],
    [c.classes, 0.5],
  ];
  for (const [value, weight] of fields) {
    if (!value) continue;
    const have = new Set(tokens(value));
    const squashed = squash(value);
    for (const t of wanted) if (have.has(t) || squashed.includes(t)) s += weight;
  }
  // "#loan-amount" vs id "loanamount": the same identifier with different punctuation.
  const brokenIds = [...spec.selector.matchAll(/#([\w-]+)/g)].map((m) => squash(m[1]));
  if (c.id && brokenIds.includes(squash(c.id))) s += 6;
  if (c.ancestorId && brokenIds.includes(squash(c.ancestorId))) s += 3;
  if (spec.expect.tags) s += spec.expect.tags.includes(c.tag) ? 3 : -8;
  if (spec.expect.textPattern && c.text) s += spec.expect.textPattern.test(c.text) ? 4 : -2;
  return s;
}

const IMPLICIT_ROLE: Record<string, string> = { a: 'link', button: 'button', select: 'combobox', textarea: 'textbox', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading' };

/** Most resilient first: test id > label > role+name > id > ancestor-scoped css > text. */
function locatorsFor(c: Candidate): Omit<Suggestion, 'confidence' | 'reasoning'>[] {
  const out: Omit<Suggestion, 'confidence' | 'reasoning'>[] = [];
  if (c.testId) out.push({ strategy: 'testid', value: c.testId });
  if (c.labelText && ['input', 'select', 'textarea'].includes(c.tag)) out.push({ strategy: 'label', value: c.labelText });
  const role = c.role ?? IMPLICIT_ROLE[c.tag];
  const name = c.ariaLabel ?? c.text;
  if (role && name) out.push({ strategy: 'role', value: role, name });
  if (c.id) out.push({ strategy: 'css', value: `#${c.id}` });
  if (c.ancestorId) out.push({ strategy: 'css', value: `#${c.ancestorId} ${c.tag}` });
  if (c.text && !['input', 'select', 'textarea'].includes(c.tag)) out.push({ strategy: 'text', value: c.text });
  return out;
}

export function suggestHeuristically(spec: HealableLocatorSpec, candidates: Candidate[], max = 6): Suggestion[] {
  const wanted = [...new Set([...tokens(spec.intent), ...tokens(spec.selector)])];
  const ranked = candidates
    .map((c) => ({ c, s: score(c, spec, wanted) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 4);
  const top = ranked[0]?.s ?? 1;
  const suggestions: Suggestion[] = [];
  for (const { c, s } of ranked) {
    for (const loc of locatorsFor(c)) {
      suggestions.push({
        ...loc,
        confidence: Math.round((s / top) * 100) / 100,
        reasoning: `candidate #${c.index} <${c.tag}${c.id ? ` id=${c.id}` : ''}> scored ${s.toFixed(1)} on tokens [${wanted.join(', ')}]`,
      });
    }
  }
  return suggestions.slice(0, max);
}
