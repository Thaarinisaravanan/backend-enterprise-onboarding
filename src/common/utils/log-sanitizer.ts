const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'authorization',
  'accesstoken',
  'refreshtoken',
  'creditcard',
  'cardnumber',
  'cvv',
  'ssn',
  'apikey',
  'api_key',
  'private_key',
  'privatekey',
]);

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''));
}

export function sanitizeForLog(obj: unknown, depth = 0): unknown {
  if (depth > 5) return '[DEEP]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeForLog(item, depth + 1));

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    sanitized[key] = isSensitiveKey(key) ? '[REDACTED]' : sanitizeForLog(value, depth + 1);
  }
  return sanitized;
}
