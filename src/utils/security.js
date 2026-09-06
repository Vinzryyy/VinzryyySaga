export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  let sanitized = input.replace(/\0/g, '').trim();
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  return sanitized;
};
