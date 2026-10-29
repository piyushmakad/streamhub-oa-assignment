import { Locator, Page } from 'playwright';
import { HealableLocatorSpec, Suggestion, ValidationResult } from './types';

const POSITIONAL = /nth-child|nth-of-type|:nth\(|>>\s*nth=|^\s*xpath=|^\s*\/\/|\[\d+\]/i;

export function toLocator(page: Page, s: Suggestion): Locator {
  switch (s.strategy) {
    case 'role':
      return page.getByRole(s.value as Parameters<Page['getByRole']>[0], { name: s.name, exact: true });
    case 'label':
      return page.getByLabel(s.value, { exact: true });
    case 'testid':
      return page.getByTestId(s.value);
    case 'text':
      return page.getByText(s.value, { exact: true });
    case 'css':
      return page.locator(s.value);
  }
}

export function describe(s: Suggestion): string {
  switch (s.strategy) {
    case 'role':
      return `page.getByRole('${s.value}', { name: '${s.name}', exact: true })`;
    case 'label':
      return `page.getByLabel('${s.value}', { exact: true })`;
    case 'testid':
      return `page.getByTestId('${s.value}')`;
    case 'text':
      return `page.getByText('${s.value}', { exact: true })`;
    case 'css':
      return `page.locator('${s.value}')`;
  }
}

/**
 * Gate every suggestion before it is used. A heal is only accepted if ALL checks pass:
 *  - not positional (we are not going to "heal" into another brittle selector),
 *  - resolves to exactly one element (no ambiguity),
 *  - that element is visible,
 *  - it has the traits the test declared (tag, editability, text pattern).
 */
export async function validate(page: Page, spec: HealableLocatorSpec, s: Suggestion): Promise<ValidationResult> {
  const checks: ValidationResult['checks'] = [];
  const add = (check: string, passed: boolean, detail?: string) => {
    checks.push({ check, passed, detail });
    return passed;
  };
  const done = () => ({ suggestion: s, accepted: checks.every((c) => c.passed), checks });

  if (!add('not positional', !(s.strategy === 'css' && POSITIONAL.test(s.value)), s.value)) return done();
  if (!add('confidence ≥ 0.3', s.confidence >= 0.3, String(s.confidence))) return done();

  let locator: Locator;
  try {
    locator = toLocator(page, s);
  } catch (e) {
    add('builds a locator', false, String(e));
    return done();
  }
  const count = await locator.count().catch(() => 0);
  if (!add('matches exactly one element', count === 1, `matched ${count}`)) return done();
  if (!add('is visible', await locator.isVisible())) return done();

  const traits = await locator.evaluate((el) => ({
    tag: el.tagName.toLowerCase(),
    text: ((el as HTMLElement).innerText ?? el.textContent ?? '').trim(),
    editable: (el as HTMLInputElement).readOnly === false && !(el as HTMLInputElement).disabled && ['input', 'textarea'].includes(el.tagName.toLowerCase()),
  }));
  if (spec.expect.tags) add(`tag is one of ${spec.expect.tags.join('/')}`, spec.expect.tags.includes(traits.tag), traits.tag);
  if (spec.expect.editable) add('is editable', traits.editable);
  if (spec.expect.textPattern) add(`text matches ${spec.expect.textPattern}`, spec.expect.textPattern.test(traits.text), traits.text.slice(0, 60));
  return done();
}
