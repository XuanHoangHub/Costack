/**
 * Security & Data Sanitization Utilities for Apexa OS
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
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes input string by stripping script tags, javascript: protocols, and inline event handlers.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Validates whether a given URL is safe to navigate to or render as href.
 * Only permits http:, https:, mailto:, and relative path URLs.
 */
export function isSafeUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  
  // Reject javascript: or data: URIs
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  
  // Allow safe protocols or relative URLs
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

/**
 * Returns a safe href for anchor tags, defaulting to '#' if invalid.
 */
export function getSafeHref(url?: string): string {
  if (isSafeUrl(url)) return url!;
  return '#';
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
