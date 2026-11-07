import { isValidPhone } from './validation'
// Explicit demo fixtures only. These are not the hotel's verified table registry.
export const demoTables = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const
export function tableFromUrl(search: string) {
  let params = new URLSearchParams(search)
  if (typeof window !== 'undefined') {
    if (!params.get('table') && !params.get('demoTable')) {
      const fullUrl = window.location.href
      const qIdx = fullUrl.indexOf('?')
      if (qIdx !== -1) {
        const queryPart = fullUrl.substring(qIdx + 1).split('#')[0]
        params = new URLSearchParams(queryPart)
      }
    }
    if (!params.get('table') && !params.get('demoTable') && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1]
      if (hashQuery) params = new URLSearchParams(hashQuery)
    }
  }
  let value = params.get('table') || params.get('demoTable')
  if (!value && typeof window !== 'undefined') {
    value = sessionStorage.getItem('ilillii_table') || localStorage.getItem('ilillii_table') || null
  }
  if (!value) return { table: null, invalid: false }
  const clean = value.trim()
  if (/^[0-9a-zA-Z_-]{1,10}$/.test(clean)) {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('ilillii_table', clean)
        localStorage.setItem('ilillii_table', clean)
      } catch (e) {}
    }
    return { table: clean, invalid: false }
  }
  return { table: null, invalid: true }
}
export const orderStages = ['Submitted', 'Accepted', 'Preparing', 'Ready to Serve', 'Completed']
export function validateGuest(name: string, phone: string) {
  if (!name || !name.trim()) return 'Please enter your name so the kitchen staff know who this meal is for.'
  if (phone.trim() && !isValidPhone(phone)) return 'Check your phone number, or leave it blank. It is optional.'
  return ''
}
