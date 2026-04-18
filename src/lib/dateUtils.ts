/**
 * Central date formatting utilities for Alghwairy Financial System.
 * All date display should go through these helpers to ensure
 * consistent locale-aware formatting across the entire application.
 */

/** Maps app lang string to BCP-47 locale tag */
export const langToLocale = (lang: string): string =>
  lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';

/**
 * Format a date string or Date object to a short date.
 * e.g. Arabic → ١٨/٠٤/٢٠٢٦ (if ar-SA) or 18/04/2026 (if ar-SA-u-nu-latn)
 */
export const fmtDate = (date: string | Date | undefined | null, lang: string): string => {
  if (!date) return '—';
  const locale = langToLocale(lang);
  let d: Date;
  try {
    d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      // Fallback for some non-standard strings
      const parts = String(date).split(/[-/]/);
      if (parts.length === 3) {
        // Assume YYYY-MM-DD or DD-MM-YYYY
        if (parts[0].length === 4) d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        else d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
  } catch {
    return '—';
  }

  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format a date string to a human-readable long date.
 */
export const fmtDateLong = (date: string | Date | undefined | null, lang: string): string => {
  if (!date) return '—';
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
export const fmtTime = (date: string | Date | undefined | null, lang: string): string => {
  if (!date) return '—';
  const locale = langToLocale(lang);
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
};

/**
 * Format number with locale thousands separator
 */
export const fmtNumber = (value: number, lang: string, decimals = 2): string =>
  value.toLocaleString(langToLocale(lang), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
