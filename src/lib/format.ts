import type { Job, Location } from './types';

export function formatSalary(job: Pick<Job, 'salary_min' | 'salary_max' | 'salary_currency'>): string | null {
  const { salary_min, salary_max, salary_currency } = job;
  if (!salary_min && !salary_max) return null;
  const fmt = (n: number) => n.toLocaleString('en-KE');
  if (salary_min && salary_max) {
    return `${salary_currency} ${fmt(salary_min)} – ${fmt(salary_max)} / month`;
  }
  const single = salary_min ?? salary_max ?? 0;
  return `${salary_currency} ${fmt(single)} / month`;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [30, 'day'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let value = seconds;
  let unit = 'second';
  let acc = 1;
  for (const [amount, name] of units) {
    if (value < amount) {
      unit = name;
      break;
    }
    value = Math.floor(value / amount);
    acc *= amount;
    unit = name;
  }
  if (unit === 'second' && value < 30) return 'Just posted';
  return `${value} ${unit}${value !== 1 ? 's' : ''} ago`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function locationLabel(job: Pick<Job, 'is_remote' | 'is_international'> & { locations?: Pick<Location, 'name'> | null }): string {
  if (job.is_international) return 'International — 100% Remote';
  if (job.is_remote) return 'Remote / Online';
  return job.locations?.name ?? 'Kenya';
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
