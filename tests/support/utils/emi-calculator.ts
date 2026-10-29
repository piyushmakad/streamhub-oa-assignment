/**
 * Independent EMI / amortisation oracle. The UI tests never trust the numbers the site shows —
 * they compute their own and compare.
 *
 *   EMI = P · r · (1 + r)^n / ((1 + r)^n − 1)     r = annual rate / 12 / 100, n = months
 *
 * Interest is charged in arrears on the opening balance of each month.
 */
export interface LoanInput {
  principal: number;
  annualRatePercent: number;
  tenureYears: number;
}

export interface YearlyBreakdown {
  year: number;
  months: number;
  principal: number;
  interest: number;
  totalPayment: number;
  closingBalance: number;
}

export function monthlyEmi({ principal, annualRatePercent, tenureYears }: LoanInput): number {
  const n = Math.round(tenureYears * 12);
  const r = annualRatePercent / 12 / 100;
  if (n <= 0) throw new Error('Tenure must be at least one month');
  if (r === 0) return principal / n;
  const growth = Math.pow(1 + r, n);
  return (principal * r * growth) / (growth - 1);
}

export function loanTotals(loan: LoanInput) {
  const emi = monthlyEmi(loan);
  const totalPayment = emi * Math.round(loan.tenureYears * 12);
  return { emi, totalPayment, totalInterest: totalPayment - loan.principal };
}

/** Amortisation grouped by calendar year, starting from the given month (0-based) and year. */
export function amortiseByCalendarYear(loan: LoanInput, startMonth: number, startYear: number): YearlyBreakdown[] {
  const emi = monthlyEmi(loan);
  const r = loan.annualRatePercent / 12 / 100;
  const n = Math.round(loan.tenureYears * 12);
  let balance = loan.principal;
  const years = new Map<number, YearlyBreakdown>();

  for (let i = 0; i < n; i++) {
    const year = startYear + Math.floor((startMonth + i) / 12);
    const interest = balance * r;
    const principalPart = emi - interest;
    balance = Math.max(0, balance - principalPart);
    const y = years.get(year) ?? { year, months: 0, principal: 0, interest: 0, totalPayment: 0, closingBalance: 0 };
    y.months += 1;
    y.principal += principalPart;
    y.interest += interest;
    y.totalPayment += emi;
    y.closingBalance = balance;
    years.set(year, y);
  }
  return [...years.values()];
}
