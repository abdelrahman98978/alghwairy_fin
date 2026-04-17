/**
 * Central date formatting utilities for Alghwairy Financial System.
 * All date display should go through these helpers to ensure
 * consistent locale-aware formatting across the entire application.
 */

/** Maps app lang string to BCP-47 locale tag */
export const langToLocale = (lang: string): string =>
  lang === 'ar' ? 'ar-SA' : 'en-GB';

/**
 * Format a date string or Date object to a short date.
 * e.g. Arabic → ١٨/٤/٢٠٢٦  |  English → 18/04/2026
 */
export const fmtDate = (date: string | Date, lang: string): string => {
  const locale = langToLocale(lang);
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format a date string to a human-readable long date.
 * e.g. Arabic → الجمعة، ١٨ أبريل ٢٠٢٦  |  English → Friday, 18 April 2026
 */
export const fmtDateLong = (date: string | Date, lang: string): string => {
  const locale = langToLocale(lang);
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format time only (HH:MM)
 */
export const fmtTime = (date: string | Date, lang: string): string => {
  const locale = langToLocale(lang);
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format number with locale thousands separator
 */
export const fmtNumber = (value: number, lang: string, decimals = 2): string =>
  value.toLocaleString(langToLocale(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
