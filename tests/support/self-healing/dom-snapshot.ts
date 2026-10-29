import { Page } from 'playwright';
import { Candidate } from './types';

/**
 * Collects a compact, model-friendly summary of the visible elements a locator could plausibly
 * target. Raw HTML is far too large and noisy to send to an LLM; this keeps only the attributes
 * that resilient locators are built from (role, label, text, id, name, test id).
 */
export async function collectCandidates(page: Page, limit = 250): Promise<Candidate[]> {
  return page.evaluate((max) => {
    const SELECTOR = 'input, select, textarea, button, a, [role], label, h1, h2, h3, h4, h5, h6, span, p, strong, li, td, text';
    const out: any[] = [];
    const isVisible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const clean = (s: string | null | undefined, n = 60) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n) || undefined;

    for (const el of Array.from(document.querySelectorAll(SELECTOR))) {
      if (out.length >= max) break;
      if (!isVisible(el)) continue;
      const tag = el.tagName.toLowerCase();
      const text = clean((el as HTMLElement).innerText ?? el.textContent);
      // Leaf-ish text containers only; skip big wrappers that just repeat their children's text.
      if (['span', 'p', 'strong', 'li', 'td', 'text'].includes(tag) && (!text || el.children.length > 2)) continue;

      const id = el.id || undefined;
      const labelEl = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : el.closest('label');
      const ancestor = el.parentElement?.closest('[id]');
      out.push({
        index: out.length,
        tag,
        id,
        name: el.getAttribute('name') ?? undefined,
        type: el.getAttribute('type') ?? undefined,
        role: el.getAttribute('role') ?? undefined,
        ariaLabel: el.getAttribute('aria-label') ?? undefined,
        labelText: clean(labelEl?.textContent),
        placeholder: el.getAttribute('placeholder') ?? undefined,
        testId: el.getAttribute('data-testid') ?? undefined,
        text: ['input', 'select', 'textarea'].includes(tag) ? undefined : text,
        classes: clean(typeof el.className === 'string' ? el.className : el.getAttribute('class'), 80),
        ancestorId: ancestor?.id || undefined,
      });
    }
    return out;
  }, limit);
}
