export interface ParsedSalary {
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
}

const NO_SALARY: ParsedSalary = { salary_min: null, salary_max: null, salary_currency: 'KES' };

/**
 * Best-effort parse of free-text salary strings like "KSHS.70,000",
 * "KSHS. 50,000-80,000", or "$50,000 - $80,000" into min/max/currency.
 * Returns nulls (not a thrown error) when nothing numeric is found — salary is
 * optional on the `jobs` table.
 */
export function parseSalary(raw: string | undefined | null): ParsedSalary {
  if (!raw) return NO_SALARY;
  const text = raw.trim();
  if (!text || /negotiable|competitive|not stated|n\/a/i.test(text)) return NO_SALARY;

  const currency = /\$|usd/i.test(text) ? 'USD' : /kshs?|ksh|kes/i.test(text) ? 'KES' : 'KES';

  const numbers = text
    .match(/[\d,]+(?:\.\d+)?/g)
    ?.map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!numbers || numbers.length === 0) return NO_SALARY;
  if (numbers.length === 1) return { salary_min: numbers[0], salary_max: numbers[0], salary_currency: currency };

  return { salary_min: Math.min(numbers[0], numbers[1]), salary_max: Math.max(numbers[0], numbers[1]), salary_currency: currency };
}
