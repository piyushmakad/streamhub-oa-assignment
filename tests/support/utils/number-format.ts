/** Parses Indian-formatted currency/number text such as "₹ 3,32,005", "1,07,96,711" or "46.3%". */
export function parseIndianNumber(text: string): number {
  const cleaned = text.replace(/[₹,%\s]/g, '');
  const n = Number(cleaned);
  if (cleaned === '' || Number.isNaN(n)) throw new Error(`Cannot parse a number from "${text}"`);
  return n;
}

/**
 * Parses amounts written the way the assessment writes them: "25L" (lakh), "1.5Cr" (crore),
 * or a plain number ("2500000").
 */
export function parseLoanAmount(text: string): number {
  const m = text.trim().match(/^(\d+(?:\.\d+)?)\s*(L|Lakh|Cr|Crore)?$/i);
  if (!m) throw new Error(`Unsupported loan amount "${text}" — use e.g. 25L, 1.5Cr or 2500000`);
  const value = Number(m[1]);
  const unit = (m[2] ?? '').toLowerCase();
  if (unit.startsWith('l')) return Math.round(value * 100_000);
  if (unit.startsWith('c')) return Math.round(value * 10_000_000);
  return value;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jul 2027" -> { month: 6, year: 2027 } (month is 0-based). */
export function parseMonthYear(text: string): { month: number; year: number } {
  const m = text.trim().match(/^([A-Za-z]{3})\s+(\d{4})$/);
  const month = m ? MONTHS.indexOf(m[1][0].toUpperCase() + m[1].slice(1, 3).toLowerCase()) : -1;
  if (!m || month < 0) throw new Error(`Expected a month like "Jul 2027", got "${text}"`);
  return { month, year: Number(m[2]) };
}

export const monthName = (month: number) => MONTHS[month];
