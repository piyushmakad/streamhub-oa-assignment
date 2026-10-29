import { expect } from '@playwright/test';
import { Locator, Page } from 'playwright';
import { parseIndianNumber } from '../../support/utils/number-format';
import { hoverPrecisely } from '../../support/utils/pointer';

export interface PieSlice {
  name: string;
  percent: number;
}

/**
 * "Break-up of Total Payment" pie (Highcharts SVG). The highcharts-* class names are part of
 * the charting library's public styling API, so they are far more stable than the page's layout.
 */
export class PieChart {
  readonly root: Locator;
  readonly svg: Locator;
  readonly slices: Locator;
  readonly dataLabels: Locator;
  readonly legendItems: Locator;
  private readonly tooltip: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#emipiechart');
    this.svg = this.root.locator('svg.highcharts-root');
    this.slices = this.root.locator('.highcharts-series-group path.highcharts-point');
    this.dataLabels = this.root.locator('.highcharts-data-label');
    this.legendItems = this.root.locator('.highcharts-legend-item');
    this.tooltip = this.root.locator('.highcharts-tooltip');
  }

  /** Hovers each slice and reads the tooltip, e.g. "Principal Loan Amount: 63.1%". */
  async readSlicesFromTooltips(): Promise<PieSlice[]> {
    const result: PieSlice[] = [];
    const count = await this.slices.count();
    for (let i = 0; i < count; i++) {
      await hoverPrecisely(this.page, this.slices.nth(i));
      await expect(this.tooltip).toBeVisible();
      await expect(this.tooltip).not.toHaveText(result.length ? new RegExp(`^${result[result.length - 1].name}:`) : /^$/);
      const text = ((await this.tooltip.textContent()) ?? '').trim();
      const m = text.match(/^(.+?):\s*([\d.]+)\s*%$/);
      if (!m) throw new Error(`Unexpected pie tooltip text "${text}"`);
      result.push({ name: m[1].trim(), percent: Number(m[2]) });
    }
    return result;
  }

  /** The percentage labels drawn on the slices. */
  async readDataLabelPercents(): Promise<number[]> {
    return (await this.dataLabels.allTextContents()).map(parseIndianNumber);
  }

  /**
   * The absolute ₹ value behind each slice, read from the rendered chart's own data model.
   * The UI only ever shows percentages, so this is how the slice amounts are extracted.
   */
  async readSliceAmounts(): Promise<{ name: string; amount: number }[]> {
    return this.root.evaluate((el) => {
      const chart = (window as any).Highcharts?.charts?.find((c: any) => c && c.renderTo === el);
      if (!chart) throw new Error('No Highcharts chart is bound to #emipiechart');
      return chart.series[0].points.map((p: any) => ({ name: String(p.name), amount: Number(p.y) }));
    });
  }
}
