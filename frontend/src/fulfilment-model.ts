import { isValidPhone } from './validation'
export type Fulfilment = 'pickup' | 'delivery'
export type GuestAddress = { area: string; landmark: string; directions: string }
export function validateOffsite(name: string, phone: string) {
  if (!name.trim()) return 'Please enter your name.'
  if (!isValidPhone(phone)) return 'Enter a phone number so the team can coordinate your order.'
  return ''
}
export function validateAddress(address: GuestAddress) {
  if (!address.area.trim()) return 'Enter your area or neighborhood.'
  if (!address.landmark.trim()) return 'Add a nearby landmark to help the team find you.'
  if (!address.directions.trim()) return 'Add your house, building or other identifying directions.'
  return ''
}
export function fulfilmentStages(mode: Fulfilment) {
  return ['Submitted', 'Accepted', 'Preparing', mode === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery', 'Completed']
}
