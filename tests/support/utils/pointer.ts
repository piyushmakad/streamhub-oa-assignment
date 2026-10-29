import { Locator, Page } from 'playwright';

/**
 * Moves the mouse to a point that is genuinely on top of `target`, i.e. one where
 * document.elementFromPoint hits it. Hovering the bounding-box centre is unreliable for
 * pie slices (the centre of a >50% slice's box can lie inside the other slice) and for thin
 * stacked bars that a chart line passes over.
 */
export async function hoverPrecisely(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const point = await target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const steps = 12;
    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const x = r.left + (r.width * j) / steps;
        const y = r.top + (r.height * i) / steps;
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === el || el.contains(hit))) return { x, y };
      }
    }
    return null;
  });
  if (!point) throw new Error('Element has no unobstructed point to hover');
  await page.mouse.move(point.x, point.y, { steps: 5 });
}
