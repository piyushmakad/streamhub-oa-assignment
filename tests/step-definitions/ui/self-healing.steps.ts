import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { BROKEN_LOCATORS, LegacyEmiCalculatorPage } from '../../pages/legacy/LegacyEmiCalculatorPage';
import { AuditResult, auditLocators, HealingRefusedError } from '../../support/self-healing/healer';
import { loanTotals } from '../../support/utils/emi-calculator';
import { parseLoanAmount } from '../../support/utils/number-format';

const legacy = (world: CustomWorld) => new LegacyEmiCalculatorPage(world.page!);
let refusal: unknown;
let audit: AuditResult[] = [];

When('I audit every locator in the legacy page object against the live page', async function (this: CustomWorld) {
  audit = await auditLocators(this.page!, Object.values(BROKEN_LOCATORS));
  this.attach(audit.map((r) => `${r.status.padEnd(18)} ${r.key.padEnd(28)} ${r.selector}${r.detail ? `\n${' '.repeat(19)}→ ${r.detail}` : ''}`).join('\n'), 'text/plain');
});

Then('all {int} deliberately broken locators should be detected', function (this: CustomWorld, count: number) {
  expect(audit).toHaveLength(count);
  expect(audit.filter((r) => r.status === 'ok').map((r) => r.key), 'locators that unexpectedly still work').toEqual([]);
});

Then('each broken locator should be handled according to the self-healing mode', function (this: CustomWorld) {
  const statuses = Object.fromEntries(audit.map((r) => [r.key, r.status]));
  if (this.config.selfHealing.enabled) {
    // Four real elements get healed; the hallucinated button must be refused, never substituted.
    expect(statuses).toEqual({
      'legacy.loanAmountInput': 'healed',
      'legacy.interestRateInput': 'healed',
      'legacy.personalLoanTab': 'healed',
      'legacy.emiValue': 'healed',
      'legacy.calculateButton': 'no-safe-candidate',
    });
  } else {
    expect(Object.values(statuses).every((s) => s === 'detected-only')).toBe(true);
  }
});

When('I open the Personal Loan tab using the legacy page object', async function (this: CustomWorld) {
  await legacy(this).openPersonalLoanTab();
});

When(
  'I type a loan amount of {string} and an interest rate of {float}% using the legacy page object',
  async function (this: CustomWorld, amount: string, rate: number) {
    this.loan = { principal: parseLoanAmount(amount), annualRatePercent: rate, tenureYears: 0 };
    await legacy(this).typeLoanAmount(this.loan.principal);
    await legacy(this).typeInterestRate(rate);
  },
);

When('I set a tenure of {int} years using the resilient page object', async function (this: CustomWorld, years: number) {
  this.loan = { ...this.loan!, tenureYears: years };
  await this.ui.inputs.ensureTenureInYears();
  await this.ui.inputs.type('tenure', years);
});

Then('the EMI read through the legacy page object should match my independently calculated EMI', async function (this: CustomWorld) {
  const expected = loanTotals(this.loan!).emi;
  await expect.poll(async () => Math.abs((await legacy(this).readEmi()) - expected), { timeout: 15_000 }).toBeLessThanOrEqual(2);
});

When('I try to click the legacy {string} button', async function (this: CustomWorld, _label: string) {
  refusal = undefined;
  try {
    await legacy(this).clickCalculate();
  } catch (e) {
    // With healing on, a refusal is the expected outcome; anything else (e.g. a plain timeout
    // with healing off) is a genuine failure of this step.
    if (!(e instanceof HealingRefusedError)) throw e;
    refusal = e;
  }
});

Then('the healer should refuse to substitute a different element', function () {
  expect(refusal, 'Expected the healer to refuse rather than click some other button').toBeInstanceOf(HealingRefusedError);
});
