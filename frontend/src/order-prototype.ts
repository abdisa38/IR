import { isValidPhone } from './validation'
// Explicit demo fixtures only. These are not the hotel's verified table registry.
export const demoTables = ['05', '08', '12'] as const
export function tableFromUrl(search: string) {
  const params = new URLSearchParams(search)
  const value = params.get('demoTable')
  return {
    table: value && demoTables.includes(value as typeof demoTables[number]) ? value : null,
    invalid: params.has('table') || (value !== null && !demoTables.includes(value as typeof demoTables[number])),
  }
}
export const orderStages = ['Submitted', 'Accepted', 'Preparing', 'Ready to Serve', 'Completed']
export function validateGuest(name: string, phone: string) {
  if (!name.trim()) return 'Please enter your name so staff know who the order is for.'
  if (phone.trim() && !isValidPhone(phone)) return 'Check your phone number, or leave it blank. It is optional.'
  return ''
}
