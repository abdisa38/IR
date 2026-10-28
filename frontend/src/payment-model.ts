export type PaymentMethod = 'telebirr' | 'cbe' | 'cash'
export type PaymentStatus = 'Unpaid' | 'Awaiting Payment' | 'Verification Pending' | 'Paid' | 'Failed' | 'Refunded'
export const paymentStatuses: PaymentStatus[] = ['Unpaid', 'Awaiting Payment', 'Verification Pending', 'Paid', 'Failed', 'Refunded']
export const foodStatuses = ['Submitted', 'Accepted', 'Preparing', 'Ready for Pickup', 'Ready to Serve', 'Out for Delivery', 'Completed', 'Cancelled']
export function foodStatusesFor(mode: 'dine' | 'pickup' | 'delivery') {
  return foodStatuses.filter(status => status !== 'Ready for Pickup' || mode === 'pickup').filter(status => status !== 'Ready to Serve' || mode === 'dine').filter(status => status !== 'Out for Delivery' || mode === 'delivery')
}
export function canStartPayment(status: PaymentStatus, amountKnown: boolean, cancelled: boolean) {
  return amountKnown && !cancelled && (status === 'Unpaid' || status === 'Failed')
}
export function receiptHeading(status: PaymentStatus) {
  return status === 'Paid' ? 'Paid receipt · simulated' : status === 'Refunded' ? 'Refund record · simulated' : 'Payment-pending order summary'
}
