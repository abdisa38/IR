import { isValidPhone } from './validation'
// Explicit demo fixtures only. These are not the hotel's verified table registry.
export const demoTables = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const
export function tableFromUrl(search: string) {
  const params = new URLSearchParams(search)
  const value = params.get('table') || params.get('demoTable')
  if (!value) return { table: null, invalid: false }
  const clean = value.trim()
  if (/^[0-9a-zA-Z_-]{1,10}$/.test(clean)) {
    return { table: clean, invalid: false }
  }
  return { table: null, invalid: true }
}
export const orderStages = ['Submitted', 'Accepted', 'Preparing', 'Ready to Serve', 'Completed']
export function validateGuest(name: string, phone: string) {
  if (!name.trim()) return 'Please enter your name so staff know who the order is for.'
  if (phone.trim() && !isValidPhone(phone)) return 'Check your phone number, or leave it blank. It is optional.'
  return ''
}
