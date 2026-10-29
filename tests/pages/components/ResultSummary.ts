import { Locator, Page } from 'playwright';
import { parseIndianNumber } from '../../support/utils/number-format';

/** The "Loan EMI / Total Interest Payable / Total Payment" summary block. */
export class ResultSummary {
  readonly emi: Locator;
  readonly totalInterest: Locator;
  readonly totalPayment: Locator;

  constructor(page: Page) {
    // Each figure is the <span> inside a block with a stable id; the heading text is checked by the steps.
    this.emi = page.locator('#emiamount span');
    this.totalInterest = page.locator('#emitotalinterest span');
    this.totalPayment = page.locator('#emitotalamount span');
  }

  async read() {
    const num = async (l: Locator) => parseIndianNumber((await l.textContent()) ?? '');
    return { emi: await num(this.emi), totalInterest: await num(this.totalInterest), totalPayment: await num(this.totalPayment) };
  }
}
