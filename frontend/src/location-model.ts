import { isValidPhone } from './validation'
export function validateContact(name: string, contact: string, message: string) {
  const errors: Record<string, string> = {}
  if (!name.trim()) errors.name = 'Please enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()) && !isValidPhone(contact)) errors.contact = 'Enter a phone number or email so the team can reply.'
  if (!message.trim()) errors.message = 'Please add your message.'
  return errors
}
export function validateZone(name: string, fee: string, minimum: string) {
  if (!name.trim()) return 'Add a draft zone name.'
  if (fee === '' || !Number.isFinite(Number(fee)) || Number(fee) < 0) return 'Enter a non-negative draft fee in ETB, or leave the zone unconfigured.'
  if (minimum !== '' && (!Number.isFinite(Number(minimum)) || Number(minimum) < 0)) return 'Minimum order must be a non-negative amount, if supplied.'
  return ''
}
