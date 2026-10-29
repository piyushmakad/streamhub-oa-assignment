import { Locator, Page } from 'playwright';
import { healable } from '../../support/self-healing/healer';
import { HealableLocatorSpec } from '../../support/self-healing/types';
import { parseIndianNumber } from '../../support/utils/number-format';

/**
 * ⚠️ INTENTIONALLY BROKEN — AI self-healing exercise.
 *
 * This "legacy" page object reproduces the kind of locators that rot in real suites. Each one is
 * deliberately wrong or brittle and must stay that way: they are the input to the self-healing
 * POC (tests/support/self-healing) and are excluded from the normal UI run (@broken-locators).
 * The correct, resilient equivalents live in tests/pages/components/*.
 */
const FILE = 'tests/pages/legacy/LegacyEmiCalculatorPage.ts';

export const BROKEN_LOCATORS = {
  // BROKEN #1 — wrong id. Real id is "loanamount"; someone "tidied" it to kebab-case.
  loanAmountInput: {
    key: 'legacy.loanAmountInput',
    selector: '#loan-amount',
    intent: 'Text input where the user types the loan amount',
    sourceFile: FILE,
    expect: { tags: ['input'], editable: true },
  },
  // BROKEN #2 — absolute, positional XPath recorded by a browser plugin. Breaks on any layout change.
  interestRateInput: {
    key: 'legacy.interestRateInput',
    selector: 'xpath=/html/body/div[1]/div[3]/div/div[2]/div/form/div[2]/div[1]/div/input',
    intent: 'Text input for the annual interest rate percentage',
    sourceFile: FILE,
    expect: { tags: ['input'], editable: true },
  },
  // BROKEN #3 — positional CSS with the wrong parent tag (the nav is a <ul>, not a <div>).
  personalLoanTab: {
    key: 'legacy.personalLoanTab',
    selector: 'div.loanproduct-nav > li:nth-child(2) > a',
    intent: 'Personal Loan tab link in the loan product navigation',
    sourceFile: FILE,
    expect: { tags: ['a'], textPattern: /^Personal Loan$/ },
  },
  // BROKEN #4 — wrong element type: the EMI figure is a <span>, not a <strong>.
  emiValue: {
    key: 'legacy.emiValue',
    selector: '#emiamount > p > strong',
    intent: 'The displayed monthly Loan EMI amount figure',
    sourceFile: FILE,
    expect: { tags: ['span', 'strong', 'p'], textPattern: /^[\d,]+$/ },
  },
  // BROKEN #5 — hallucinated element. The calculator recalculates on input; there is no such button.
  // A correct healer must REFUSE to map this onto some other button.
  calculateButton: {
    key: 'legacy.calculateButton',
    selector: 'button:has-text("Calculate EMI")',
    intent: 'Calculate EMI submit button that triggers the calculation',
    sourceFile: FILE,
    expect: { tags: ['button', 'input'], textPattern: /calculate/i },
  },
} satisfies Record<string, HealableLocatorSpec>;

export class LegacyEmiCalculatorPage {
  constructor(private readonly page: Page) {}

  private find(spec: HealableLocatorSpec): Promise<Locator> {
    return healable(this.page, spec);
  }

  async openPersonalLoanTab() {
    await (await this.find(BROKEN_LOCATORS.personalLoanTab)).click({ timeout: 5000 });
  }

  async typeLoanAmount(amount: number) {
    const input = await this.find(BROKEN_LOCATORS.loanAmountInput);
    await input.fill(String(amount), { timeout: 5000 });
    await input.press('Tab');
  }

  async typeInterestRate(rate: number) {
    const input = await this.find(BROKEN_LOCATORS.interestRateInput);
    await input.fill(String(rate), { timeout: 5000 });
    await input.press('Tab');
  }

  async clickCalculate() {
    await (await this.find(BROKEN_LOCATORS.calculateButton)).click({ timeout: 5000 });
  }

  async readEmi(): Promise<number> {
    const value = await this.find(BROKEN_LOCATORS.emiValue);
    return parseIndianNumber((await value.textContent({ timeout: 5000 })) ?? '');
  }
}
