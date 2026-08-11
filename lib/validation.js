export function requiredText(value, name, { min = 1, max = 255 } = {}) {
  const text = String(value || '').trim();
  if (text.length < min || text.length > max) {
    throw new Error(`${name} must be between ${min} and ${max} characters`);
  }
  return text;
}

export function positiveInteger(value, name = 'id') {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error(`Invalid ${name}`);
  return number;
}

export function optionalPositiveInteger(value, name = 'id') {
  if (value === null || value === undefined || value === '') return null;
  return positiveInteger(value, name);
}

export function validEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
  return email;
}

export function validImageFile(file, { maxBytes = 5 * 1024 * 1024 } = {}) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) return null;
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  if (!allowedTypes.has(file.type) || file.size > maxBytes) throw new Error('Invalid image file');
  return file;
}

