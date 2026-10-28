export function isValidPhone(value: string) {
  const normalized = value.trim()
  const digits = normalized.replace(/\D/g, '')
  return /^\+?[\d\s()-]+$/.test(normalized) && digits.length >= 7 && digits.length <= 15
}
