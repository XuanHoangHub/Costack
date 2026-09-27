/**
 * Security & Data Sanitization Utilities for Apexa
 * Protection against XSS, Injection, Prototype Pollution, and Tabnabbing.
 */

/**
 * Escapes special HTML characters to prevent XSS injection attacks.
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strips HTML tags and dangerous control characters from raw strings.
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitizes input string by removing executable tags and encoding unsafe characters.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return escapeHtml(stripHtml(input));
}

/**
 * Validates whether a given URL is safe to navigate to or render as href.
 * Protects against XSS (javascript:, data:), Open Redirects (//attacker.com, /\\attacker.com),
 * and local file access (file:).
 * Only permits strictly http:, https:, mailto:, tel:, hash links (#), and safe relative paths.
 */
export function isSafeUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Reject protocol-relative URLs (e.g. //attacker.com or /\attacker.com or \\attacker.com)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\\\')) {
    return false;
  }

  // Reject javascript:, data:, vbscript:, blob:, file: even with control chars or whitespace
  const normalizedScheme = trimmed.replace(/[\x00-\x20\s]/g, '').toLowerCase();
  if (
    normalizedScheme.startsWith('javascript:') ||
    normalizedScheme.startsWith('vbscript:') ||
    normalizedScheme.startsWith('data:') ||
    normalizedScheme.startsWith('blob:') ||
    normalizedScheme.startsWith('file:')
  ) {
    return false;
  }

  // Allow safe hash links (e.g. #section)
  if (trimmed.startsWith('#')) return true;

  // Allow strictly relative paths (e.g. /dashboard, /tasks?id=123)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return true;
  }

  // Validate absolute URLs against a strict whitelist of safe protocols
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Returns a safe href for anchor tags, defaulting to fallback ('#') if invalid.
 */
export function getSafeHref(url?: string, fallback = '#'): string {
  if (isSafeUrl(url)) return url!;
  return fallback;
}

/**
 * Obfuscates sensitive API Keys for safe visual display or logging.
 * Example: "AIzaSyD-abc123XYZ987" -> "AIzaSyD-***...XYZ987"
 */
export function maskApiKey(key?: string): string {
  if (!key || typeof key !== 'string') return '';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Safe JSON parse with prototype pollution prevention.
 */
export function safeJsonParse<T>(jsonStr: string | null, fallback: T): T {
  if (!jsonStr || typeof jsonStr !== 'string') return fallback;
  try {
    const parsed = JSON.parse(jsonStr, (key, value) => {
      // Prevent Prototype Pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
    return parsed as T;
  } catch (e) {
    console.warn('[Security] Safe JSON parse caught corrupted input.');
    return fallback;
  }
}

/**
 * Secure LocalStorage getter with type safety and fallback.
 */
export function getSecureItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return safeJsonParse<T>(item, fallback);
  } catch (e) {
    return fallback;
  }
}

/**
 * Secure LocalStorage setter.
 */
export function setSecureItem(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    const stringified = JSON.stringify(value);
    localStorage.setItem(key, stringified);
  } catch (e) {
    console.error('[Security] Failed to write secure item to storage:', key, e);
  }
}
