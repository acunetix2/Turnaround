/**
 * Shared formatting utilities for the Turnaround frontend.
 * All currency values are KES (Kenyan Shillings).
 */
import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns';

// ── Currency ──────────────────────────────────────────────────────────────────

/**
 * Format a number as KES currency.
 * formatCurrency(64200) → "KES 64,200"
 */
export function formatCurrency(value: number): string {
  const abs = Math.abs(Math.round(value));
  const formatted = abs.toLocaleString('en-KE');
  return value < 0 ? `-KES ${formatted}` : `KES ${formatted}`;
}

// ── Duration ──────────────────────────────────────────────────────────────────

/**
 * Format a duration in minutes as a human-readable string.
 * formatMinutes(0)   → "0m"
 * formatMinutes(45)  → "45m"
 * formatMinutes(60)  → "1h 0m"
 * formatMinutes(312) → "5h 12m"
 */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

// ── Date & Time ───────────────────────────────────────────────────────────────

/**
 * Format an ISO datetime string to a readable locale string.
 * Returns "—" for invalid/missing values.
 */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    if (!isValid(d)) return iso;
    return format(d, 'd MMM yyyy, HH:mm');
  } catch {
    return iso;
  }
}

/**
 * Short date label for chart axes.
 * formatDateShort("2025-08-15") → "15 Aug"
 */
export function formatDateShort(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    if (!isValid(d)) return iso ?? '';
    return format(d, 'd MMM');
  } catch {
    return iso ?? '';
  }
}

/**
 * Relative time from now.
 * formatRelative("2025-08-15T09:00:00Z") → "about 2 hours ago"
 */
export function formatRelative(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? parseISO(iso) : iso;
    if (!isValid(d)) return iso ?? '—';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return iso ?? '—';
  }
}

/**
 * Format a date as YYYY-MM-DD for API params.
 */
export function formatDateParam(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
