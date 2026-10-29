import { expect } from '@playwright/test';
import { Locator, Page } from 'playwright';

export type LoanProduct = 'Home Loan' | 'Personal Loan' | 'Car Loan';

/** The Home / Personal / Car loan switcher above the calculator. */
export class LoanProductTabs {
  private readonly nav: Locator;

  constructor(private readonly page: Page) {
    this.nav = page.locator('ul.loanproduct-nav');
  }

  tab(product: LoanProduct): Locator {
    return this.nav.getByRole('link', { name: product, exact: true });
  }

  async select(product: LoanProduct) {
    await this.tab(product).click();
    // `has:` is resolved relative to each <li>, so it takes an unscoped link locator.
    const tabItem = this.nav.locator('li').filter({ has: this.page.getByRole('link', { name: product, exact: true }) });
    await expect(tabItem).toHaveClass(/\bactive\b/);
    // The amount field is relabelled per product ("Personal Loan Amount"), which confirms the form switched.
    await expect(this.page.getByText(`${product} Amount`, { exact: true })).toBeVisible();
  }
}
