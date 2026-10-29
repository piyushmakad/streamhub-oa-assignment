import { expect } from '@playwright/test';
import { Page } from 'playwright';
import { BasePage } from './BasePage';
import { config } from '../support/config';
import { LoanProductTabs } from './components/LoanProductTabs';
import { LoanInputPanel } from './components/LoanInputPanel';
import { ResultSummary } from './components/ResultSummary';
import { PieChart } from './components/PieChart';
import { BarChart } from './components/BarChart';
import { StartMonthPicker } from './components/StartMonthPicker';

/** https://emicalculator.net/ — composed of one component object per area of the page. */
export class EmiCalculatorPage extends BasePage {
  readonly tabs: LoanProductTabs;
  readonly inputs: LoanInputPanel;
  readonly summary: ResultSummary;
  readonly pieChart: PieChart;
  readonly barChart: BarChart;
  readonly startMonth: StartMonthPicker;

  constructor(page: Page) {
    super(page);
    this.tabs = new LoanProductTabs(page);
    this.inputs = new LoanInputPanel(page);
    this.summary = new ResultSummary(page);
    this.pieChart = new PieChart(page);
    this.barChart = new BarChart(page);
    this.startMonth = new StartMonthPicker(page);
  }

  async open() {
    await this.goto(config.emi.baseUrl);
    await this.declineConsentIfShown();
    await expect(this.page.getByRole('heading', { name: 'Loan EMI', exact: true })).toBeVisible();
    await expect(this.summary.emi).toHaveText(/\d/);
  }

  /** Picks the most privacy-preserving option if a consent dialog appears (usually it is blocked with the ad hosts). */
  private async declineConsentIfShown() {
    const decline = this.page.getByRole('button', { name: /do not consent|reject all|decline/i });
    if (await decline.isVisible({ timeout: 1500 }).catch(() => false)) await decline.click();
  }

  /** Waits until the summary reflects the latest input (the site recalculates asynchronously). */
  async waitForEmi(expected: number, tolerance = 1) {
    await expect
      .poll(async () => Math.abs((await this.summary.read()).emi - expected), { message: `EMI should be ≈ ${Math.round(expected)}` })
      .toBeLessThanOrEqual(tolerance);
  }
}
