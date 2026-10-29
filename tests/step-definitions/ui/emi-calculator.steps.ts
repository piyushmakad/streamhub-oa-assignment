import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { LoanProduct } from '../../pages/components/LoanProductTabs';
import { amortiseByCalendarYear, loanTotals, LoanInput } from '../../support/utils/emi-calculator';
import { parseLoanAmount, parseMonthYear } from '../../support/utils/number-format';

/** The site rounds each displayed figure to the rupee; our unrounded maths may differ by that rounding. */
const RUPEE_TOLERANCE = 2;

function loanOf(world: CustomWorld): LoanInput {
  if (!world.loan) throw new Error('No loan has been entered in this scenario');
  return world.loan;
}

function schedule(world: CustomWorld) {
  const start = world.startMonth;
  if (!start) throw new Error('No schedule start month has been chosen in this scenario');
  return amortiseByCalendarYear(loanOf(world), start.month, start.year);
}

function evidence(world: CustomWorld, title: string, rows: Record<string, unknown>) {
  world.attach(`${title}\n${Object.entries(rows).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`, 'text/plain');
}

// ---------- navigation ----------
Given('I launch the EMI calculator', async function (this: CustomWorld) {
  await this.ui.open();
});

When('I navigate to the {string} tab', async function (this: CustomWorld, product: LoanProduct) {
  await this.ui.tabs.select(product);
});

// ---------- input ----------
When(
  'I enter a loan amount of {string}, an interest rate of {float}% and a tenure of {int} years',
  async function (this: CustomWorld, amount: string, rate: number, years: number) {
    this.loan = { principal: parseLoanAmount(amount), annualRatePercent: rate, tenureYears: years };
    await this.ui.inputs.ensureTenureInYears();
    await this.ui.inputs.type('amount', this.loan.principal);
    await this.ui.inputs.type('interest', rate);
    await this.ui.inputs.type('tenure', years);
  },
);

When(
  'I use the sliders to set a loan amount of {string}, an interest rate of {float}% and a tenure of {int} years',
  async function (this: CustomWorld, amount: string, rate: number, years: number) {
    this.loan = { principal: parseLoanAmount(amount), annualRatePercent: rate, tenureYears: years };
    await this.ui.inputs.ensureTenureInYears();
    await this.ui.inputs.slideTo('amount', this.loan.principal);
    await this.ui.inputs.slideTo('interest', rate);
    await this.ui.inputs.slideTo('tenure', years);
    // Read back all three: moving one slider must not have disturbed another.
    expect(await this.ui.inputs.value('amount')).toBe(this.loan.principal);
    expect(await this.ui.inputs.value('interest')).toBe(rate);
    expect(await this.ui.inputs.value('tenure')).toBe(years);
  },
);

// ---------- summary figures ----------
Then('the displayed EMI should match my independently calculated EMI', async function (this: CustomWorld) {
  const expected = loanTotals(loanOf(this)).emi;
  await expect
    .poll(async () => Math.abs((await this.ui.summary.read()).emi - expected), {
      message: `Displayed EMI should be within ₹${RUPEE_TOLERANCE} of calculated ₹${expected.toFixed(2)}`,
    })
    .toBeLessThanOrEqual(RUPEE_TOLERANCE);
  evidence(this, 'EMI check', { calculated: expected.toFixed(2), displayed: (await this.ui.summary.read()).emi });
});

Then('the displayed total interest and total payment should match my calculation', async function (this: CustomWorld) {
  const expected = loanTotals(loanOf(this));
  const shown = await this.ui.summary.read();
  evidence(this, 'Totals check', {
    'calculated total interest': expected.totalInterest.toFixed(2),
    'displayed total interest': shown.totalInterest,
    'calculated total payment': expected.totalPayment.toFixed(2),
    'displayed total payment': shown.totalPayment,
  });
  expect(Math.abs(shown.totalInterest - expected.totalInterest)).toBeLessThanOrEqual(RUPEE_TOLERANCE);
  expect(Math.abs(shown.totalPayment - expected.totalPayment)).toBeLessThanOrEqual(RUPEE_TOLERANCE);
});

// ---------- pie chart ----------
Then('the pie chart should be visible and available', async function (this: CustomWorld) {
  const pie = this.ui.pieChart;
  await pie.root.scrollIntoViewIfNeeded();
  await expect(pie.root).toBeVisible();
  await expect(pie.svg).toBeVisible();
  await expect(pie.slices.first()).toBeVisible();
});

Then('the pie chart should have {int} sections: {string} and {string}', async function (this: CustomWorld, count: number, a: string, b: string) {
  await expect(this.ui.pieChart.slices).toHaveCount(count);
  await expect(this.ui.pieChart.legendItems).toHaveText([a, b]);
});

Then('the numerical values of both pie chart sections should be greater than zero', async function (this: CustomWorld) {
  const pie = this.ui.pieChart;
  const fromTooltips = await pie.readSlicesFromTooltips();
  const labels = await pie.readDataLabelPercents();
  const amounts = await pie.readSliceAmounts();
  evidence(this, 'Pie chart values', {
    tooltips: fromTooltips.map((s) => `${s.name}=${s.percent}%`).join(', '),
    'slice labels': labels.map((p) => `${p}%`).join(', '),
    'slice amounts (₹)': amounts.map((s) => `${s.name}=${Math.round(s.amount)}`).join(', '),
  });
  expect(fromTooltips).toHaveLength(2);
  for (const s of fromTooltips) expect(s.percent, `${s.name} tooltip %`).toBeGreaterThan(0);
  for (const p of labels) expect(p, 'slice label %').toBeGreaterThan(0);
  for (const s of amounts) expect(s.amount, `${s.name} ₹`).toBeGreaterThan(0);
});

Then('the pie chart split should match my calculated principal and interest share', async function (this: CustomWorld) {
  const loan = loanOf(this);
  const { totalInterest, totalPayment } = loanTotals(loan);
  const expectedPrincipalPct = (loan.principal / totalPayment) * 100;

  const slices = await this.ui.pieChart.readSlicesFromTooltips();
  const principal = slices.find((s) => s.name === 'Principal Loan Amount')!;
  const interest = slices.find((s) => s.name === 'Total Interest')!;
  // The chart shows one decimal place.
  expect(principal.percent).toBeCloseTo(expectedPrincipalPct, 1);
  expect(interest.percent).toBeCloseTo(100 - expectedPrincipalPct, 1);

  const amounts = await this.ui.pieChart.readSliceAmounts();
  expect(Math.abs(amounts.find((s) => s.name === 'Principal Loan Amount')!.amount - loan.principal)).toBeLessThanOrEqual(RUPEE_TOLERANCE);
  expect(Math.abs(amounts.find((s) => s.name === 'Total Interest')!.amount - totalInterest)).toBeLessThanOrEqual(RUPEE_TOLERANCE);
});

// ---------- bar chart ----------
When('I change the schedule start month to {string} using the calendar widget', async function (this: CustomWorld, text: string) {
  await this.ui.startMonth.select(text);
  this.startMonth = parseMonthYear(text);
  // The chart re-renders asynchronously; wait until its first year is the new start year.
  await expect.poll(async () => (await this.ui.barChart.years())[0]).toBe(this.startMonth.year);
});

Then('the bar chart should be visible and available', async function (this: CustomWorld) {
  const bar = this.ui.barChart;
  await bar.root.scrollIntoViewIfNeeded();
  await expect(bar.root).toBeVisible();
  await expect(bar.svg).toBeVisible();
  await expect(bar.bars.first()).toBeVisible();
});

Then('the bar chart should show the calendar years {string}', async function (this: CustomWorld, csv: string) {
  const expectedYears = csv.split(',').map(Number);
  // The feature's years must agree with our own amortisation, and the chart with both.
  expect(schedule(this).map((y) => y.year)).toEqual(expectedYears);
  expect(await this.ui.barChart.years()).toEqual(expectedYears);
});

Then('the bar chart should contain {int} bars in total', async function (this: CustomWorld, bars: number) {
  const counted = await this.ui.barChart.barCount();
  evidence(this, 'Bar count', { counted, expected: bars, 'calendar years in schedule': schedule(this).length });
  expect(counted).toBe(bars);
  expect(counted).toBe(schedule(this).length * 2);
});

Then('each calendar year should have one Principal bar and one Interest bar', async function (this: CustomWorld) {
  const years = schedule(this).length;
  expect(await this.ui.barChart.barCountPerSeries()).toEqual([years, years]);
});

When('I hover over the {string} bar for {int}', async function (this: CustomWorld, series: 'Principal' | 'Interest', year: number) {
  this.barTooltip = await this.ui.barChart.hoverBar(year, series);
});

Then('the tooltip should show the year {int}', function (this: CustomWorld, year: number) {
  expect(this.barTooltip?.year).toBe(year);
});

Then("the tooltip's {word} and Total Payment values should match my amortisation schedule", function (this: CustomWorld, series: string) {
  const tip = this.barTooltip!;
  const row = schedule(this).find((y) => y.year === tip.year);
  if (!row) throw new Error(`Year ${tip.year} is not in the calculated schedule`);
  const expectedValue = series === 'Principal' ? row.principal : row.interest;
  evidence(this, `Tooltip for ${tip.year}`, {
    tooltip: tip.raw,
    [`calculated ${series.toLowerCase()}`]: expectedValue.toFixed(2),
    'calculated total payment': row.totalPayment.toFixed(2),
    'months in year': row.months,
  });
  expect(tip.series).toBe(series);
  expect(tip.value).toBeGreaterThan(0);
  expect(Math.abs(tip.value - expectedValue)).toBeLessThanOrEqual(RUPEE_TOLERANCE);
  expect(Math.abs(tip.totalPayment - row.totalPayment)).toBeLessThanOrEqual(RUPEE_TOLERANCE);
});
