import { expect } from '@playwright/test';
import { Locator, Page } from 'playwright';
import { parseIndianNumber } from '../../support/utils/number-format';
import { hoverPrecisely } from '../../support/utils/pointer';

export interface BarTooltip {
  year: number;
  series: string;
  value: number;
  totalPayment: number;
  raw: string;
}

/** "EMI Payment / year" stacked column chart (Principal + Interest per calendar year, Balance line). */
export class BarChart {
  readonly root: Locator;
  readonly svg: Locator;
  readonly columnSeries: Locator;
  readonly bars: Locator;
  readonly yearLabels: Locator;
  private readonly tooltip: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#emibarchart');
    this.svg = this.root.locator('svg.highcharts-root');
    // Scoped to the plot's series group so legend swatches are never counted as bars, and to
    // `.highcharts-series` because Highcharts also tags each series' (empty) marker group with
    // `.highcharts-column-series`.
    this.columnSeries = this.root.locator('.highcharts-series-group .highcharts-series.highcharts-column-series');
    this.bars = this.columnSeries.locator('rect.highcharts-point');
    this.yearLabels = this.root.locator('.highcharts-xaxis-labels text');
    this.tooltip = this.root.locator('.highcharts-tooltip');
  }

  async years(): Promise<number[]> {
    return (await this.yearLabels.allTextContents()).map(Number);
  }

  async barCount(): Promise<number> {
    return this.bars.count();
  }

  async barCountPerSeries(): Promise<number[]> {
    const counts: number[] = [];
    for (const series of await this.columnSeries.all()) counts.push(await series.locator('rect.highcharts-point').count());
    return counts;
  }

  /** Hovers one bar and parses "Year : 2028 Principal : ₹ 3,32,005 Total Payment : ₹ 3,92,865". */
  async hoverBar(year: number, seriesName: 'Principal' | 'Interest'): Promise<BarTooltip> {
    const index = (await this.years()).indexOf(year);
    if (index < 0) throw new Error(`Year ${year} is not on the bar chart (years: ${(await this.years()).join(', ')})`);

    // Each column series has one bar per year; the tooltip tells us which series we landed on.
    for (const series of await this.columnSeries.all()) {
      await hoverPrecisely(this.page, series.locator('rect.highcharts-point').nth(index));
      await expect(this.tooltip).toContainText(`Year : ${year}`);
      const tip = BarChart.parseTooltip(((await this.tooltip.textContent()) ?? '').trim());
      if (tip.series === seriesName) return tip;
    }
    throw new Error(`No "${seriesName}" bar found for ${year}`);
  }

  static parseTooltip(raw: string): BarTooltip {
    const m = raw.match(/Year\s*:\s*(\d{4})\s*(Principal|Interest)\s*:\s*₹?\s*([\d,]+)\s*Total Payment\s*:\s*₹?\s*([\d,]+)/);
    if (!m) throw new Error(`Unexpected bar tooltip text "${raw}"`);
    return { year: Number(m[1]), series: m[2], value: parseIndianNumber(m[3]), totalPayment: parseIndianNumber(m[4]), raw };
  }
}
