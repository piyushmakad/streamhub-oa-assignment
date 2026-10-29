import { expect } from '@playwright/test';
import { Locator, Page } from 'playwright';
import { monthName, parseMonthYear } from '../../support/utils/number-format';

/** "Schedule showing EMI payments starting from" — a bootstrap-datepicker in month/year mode. */
export class StartMonthPicker {
  readonly input: Locator;
  private readonly monthsView: Locator;

  constructor(private readonly page: Page) {
    this.input = page.getByLabel('Schedule showing EMI payments starting from');
    // Only one datepicker is open at a time; its month grid is the visible ".datepicker-months".
    this.monthsView = page.locator('.datepicker-dropdown .datepicker-months');
  }

  async current(): Promise<{ month: number; year: number }> {
    return parseMonthYear(await this.input.inputValue());
  }

  async select(text: string) {
    const target = parseMonthYear(text);
    await this.input.scrollIntoViewIfNeeded();
    await this.input.click();
    await expect(this.monthsView).toBeVisible();

    const yearSwitch = this.monthsView.locator('.datepicker-switch');
    for (let guard = 0; guard < 50; guard++) {
      const shownYear = Number(await yearSwitch.textContent());
      if (shownYear === target.year) break;
      await this.monthsView.locator(shownYear < target.year ? '.next' : '.prev').click();
      await expect(yearSwitch).not.toHaveText(String(shownYear));
    }
    await expect(yearSwitch).toHaveText(String(target.year));

    await this.monthsView.locator('span.month').filter({ hasText: new RegExp(`^${monthName(target.month)}$`) }).click();
    await expect(this.input).toHaveValue(`${monthName(target.month)} ${target.year}`);
    await expect(this.monthsView).toBeHidden();
  }
}
