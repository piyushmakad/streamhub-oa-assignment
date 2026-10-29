import { expect } from '@playwright/test';
import { Locator, Page } from 'playwright';
import { parseIndianNumber } from '../../support/utils/number-format';

export type LoanField = 'amount' | 'interest' | 'tenure';

/**
 * Loan amount / interest / tenure inputs and their jQuery-UI sliders.
 * Inputs are found by their visible <label>; sliders by their element id (the widget has no
 * accessible role or label, and its id is the only stable hook the site provides).
 */
export class LoanInputPanel {
  constructor(private readonly page: Page) {}

  input(field: LoanField): Locator {
    switch (field) {
      case 'amount':
        return this.page.getByLabel(/^(Home|Personal|Car) Loan Amount$/);
      case 'interest':
        return this.page.getByLabel('Interest Rate', { exact: true });
      case 'tenure':
        return this.page.getByLabel('Loan Tenure', { exact: true });
    }
  }

  slider(field: LoanField): Locator {
    const id = { amount: 'loanamountslider', interest: 'loaninterestslider', tenure: 'loantermslider' }[field];
    return this.page.locator(`#${id}`);
  }

  private handle(field: LoanField): Locator {
    return this.slider(field).locator('.ui-slider-handle');
  }

  async value(field: LoanField): Promise<number> {
    return parseIndianNumber(await this.input(field).inputValue());
  }

  async ensureTenureInYears() {
    const years = this.page.locator('#loanyears');
    if (!(await years.isChecked())) await years.check({ force: true });
  }

  /** Types a value into the text box (Test Case 1). Blur triggers the site's recalculation. */
  async type(field: LoanField, value: number) {
    const input = this.input(field);
    await input.fill(String(value));
    await input.press('Tab');
    await expect.poll(() => this.value(field), { message: `${field} input should read ${value}` }).toBe(value);
  }

  /**
   * Sets a value by operating the slider itself (Test Case 2):
   *  1. read the slider's range via the keyboard (End = max, Home = min),
   *  2. drag the handle to the proportional position for the target,
   *  3. nudge with the arrow keys until the bound input shows the exact value.
   * The site's sliders are linear, but step 3 makes this correct even if the drag lands a step off.
   */
  async slideTo(field: LoanField, target: number) {
    const handle = this.handle(field);
    await handle.scrollIntoViewIfNeeded();
    await handle.focus();
    await handle.press('End');
    const max = await this.value(field);
    await handle.press('Home');
    const min = await this.value(field);
    if (target < min || target > max) throw new Error(`${field}: ${target} is outside the slider range ${min}–${max}`);

    const track = await this.slider(field).boundingBox();
    const knob = await handle.boundingBox();
    if (!track || !knob) throw new Error(`${field} slider is not visible`);
    const targetX = track.x + (track.width * (target - min)) / (max - min);
    const y = knob.y + knob.height / 2;
    await this.page.mouse.move(knob.x + knob.width / 2, y);
    await this.page.mouse.down();
    await this.page.mouse.move(targetX, y, { steps: 15 });
    await this.page.mouse.up();

    for (let i = 0; i < 200; i++) {
      const current = await this.value(field);
      if (Math.abs(current - target) < 1e-9) return;
      await handle.press(current < target ? 'ArrowRight' : 'ArrowLeft');
      const next = await this.value(field);
      // Crossing the target means it is not on the slider's step grid.
      if ((current < target && next > target) || (current > target && next < target)) {
        throw new Error(`${field}: ${target} is not reachable with the slider's step (jumped ${current} -> ${next})`);
      }
    }
    throw new Error(`${field}: could not reach ${target} with the slider`);
  }
}
