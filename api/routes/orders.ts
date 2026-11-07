import { Router, Request, Response } from 'express'
import { Order } from '../models/Order.js'

const router = Router()

// Generate next clean order number (e.g. 1025, 1026 - no IL- prefix)
async function generateOrderNumber(): Promise<string> {
  const latest = await Order.findOne().sort({ createdAt: -1 })
  if (!latest || !latest.orderNumber) {
    return '1001'
  }
  const match = latest.orderNumber.match(/(\d+)/)
  if (match && match[1]) {
    const nextNum = parseInt(match[1], 10) + 1
    return `${nextNum}`
  }
  return `${Math.floor(1000 + Math.random() * 9000)}`
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || ''
  return param || ''
}

// GET /api/orders - list orders with status, type, and pagination filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, limit = 50 } = req.query
    const filter: Record<string, any> = {}

    if (status && status !== 'all') {
      filter.status = status
    }
    if (type && type !== 'all') {
      filter.type = type
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    res.json({ success: true, count: orders.length, orders })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message })
  }
})

// GET /api/orders/:identifier - lookup by orderNumber or MongoDB ID
router.get('/:identifier', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.identifier)
    const cleanId = id.trim().toUpperCase()
    const numOnly = cleanId.replace(/^IL-/, '')
    const order = await Order.findOne({
      $or: [
        { orderNumber: cleanId },
        { orderNumber: numOnly },
        { orderNumber: `IL-${numOnly}` },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    res.json({ success: true, order })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to find order', error: error.message })
  }
})

// POST /api/orders - customer places new order
router.post('/', async (req: Request, res: Response) => {
  try {
    const { items, type = 'Dine in', table, customerName, customerPhone, note, paymentTiming = 'post_pay', paymentMethod, transactionId } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' })
    }

    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0)
    const total = subtotal
    const orderNumber = await generateOrderNumber()

    const normalizedTiming = (paymentTiming === 'pay_before' || paymentTiming === 'pre_pay') ? 'pre_pay' : 'post_pay'
    const normalizedPaymentStatus = normalizedTiming === 'pre_pay' ? 'paid' : 'pay_after_eating'
    const normalizedPaymentMethod = paymentMethod || (normalizedTiming === 'pre_pay' ? 'Cash / Transfer' : 'Pay after eating')

    const newOrder = new Order({
      orderNumber,
      type: type === 'Pickup' ? 'Pickup' : 'Dine in',
      table: table || '',
      customerName: customerName || (table ? `Table ${table}` : 'Guest'),
      customerPhone: customerPhone || '',
      items: items.map((i: any, index: number) => ({
        menuItemId: String(i.menuItemId || i.id || i.dishId || i._id || `item-${index + 1}`),
        name: i.name || 'Dish',
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        image: i.image || '',
      })),
      subtotal,
      total,
      status: 'pending',
      paymentStatus: normalizedPaymentStatus,
      paymentTiming: normalizedTiming,
      paymentMethod: normalizedPaymentMethod,
      transactionId: transactionId || undefined,
      note: note || '',
    })

    await newOrder.save()
    console.log(`[Order Created] ${orderNumber} - ${items.length} items - ${total} ETB - Table: ${table || 'N/A'}`)

    res.status(201).json({ success: true, order: newOrder })
  } catch (error: any) {
    console.error('Error creating order:', error)
    res.status(500).json({ success: false, message: 'Failed to place order', error: error.message })
  }
})

// POST /api/orders/sheger-verify - quick-verify transaction with ShegerPay
router.post('/sheger-verify', async (req: Request, res: Response) => {
  try {
    const { transaction_id, amount } = req.body
    if (!transaction_id) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' })
    }

    const shegerKey = process.env.SHEGER_API_KEY || 'sk_live__vQeXOv3TpF-Td1izdQZE_GFw-eZxftq'
    const cleanId = String(transaction_id).trim()
    const cleanAmount = Number(amount) || 0

    const shegerRes = await fetch('https://api.shegerpay.com/api/v1/quick-verify', {
      method: 'POST',
      headers: {
        'X-API-Key': shegerKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction_id: cleanId,
        amount: cleanAmount,
      }),
    })

    const data = await shegerRes.json()
    const isVerified = Boolean(data && (data.valid === true || data.status === 'verified' || data.status === 'success'))

    return res.json({
      success: true,
      verified: isVerified,
      sheger: data,
      message: isVerified ? 'Transaction verified successfully by ShegerPay' : (data.reason || 'Verification processing'),
    })
  } catch (error: any) {
    console.error('ShegerPay quick-verify error:', error)
    return res.status(500).json({ success: false, message: 'ShegerPay verification request failed', error: error.message })
  }
})

// POST /api/orders/:id/add-items - Add extra food to existing active order
router.post('/:id/add-items', async (req: Request, res: Response) => {
  try {
    const { items, note } = req.body
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide items to add' })
    }

    const id = getParam(req.params.id)
    const cleanId = id.trim().toUpperCase()
    const numOnly = cleanId.replace(/^IL-/, '')

    const order = await Order.findOne({
      $or: [
        { orderNumber: cleanId },
        { orderNumber: numOnly },
        { orderNumber: `IL-${numOnly}` },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    const additionalItems = items.map((i: any, index: number) => ({
      menuItemId: String(i.menuItemId || i.id || `item-${Date.now()}-${index}`),
      name: i.name || 'Additional dish',
      price: Number(i.price) || 0,
      quantity: Number(i.quantity) || 1,
      image: i.image || '',
    }))

    order.items.push(...additionalItems)
    const additionalSubtotal = additionalItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    order.subtotal += additionalSubtotal
    order.total += additionalSubtotal

    if (note) {
      order.note = order.note ? `${order.note} | Extra: ${note}` : `Extra: ${note}`
    }

    // Reopen preparation stage so kitchen sees new food
    if (['ready', 'completed'].includes(order.status)) {
      order.status = 'preparing'
    }

    await order.save()
    console.log(`[Order Updated with Additional Items] ${order.orderNumber} - New Total: ${order.total} ETB`)
    res.json({ success: true, message: 'Additional items added to order', order })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to add items to order', error: error.message })
  }
})

// PATCH /api/orders/:id/status - update status (pending, accepted, preparing, ready, completed, cancelled)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    const valid = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${valid.join(', ')}` })
    }

    const id = getParam(req.params.id)
    const cleanId = id.trim().toUpperCase()
    const numOnly = cleanId.replace(/^IL-/, '')

    const order = await Order.findOne({
      $or: [
        { orderNumber: cleanId },
        { orderNumber: numOnly },
        { orderNumber: `IL-${numOnly}` },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    order.status = status
    await order.save()

    res.json({ success: true, order })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message })
  }
})

// PATCH /api/orders/:id/payment - update payment status
router.patch('/:id/payment', async (req: Request, res: Response) => {
  try {
    const { paymentStatus, paymentMethod } = req.body
    const valid = ['unpaid', 'paid', 'pay_after_eating']
    if (paymentStatus && !valid.includes(paymentStatus)) {
      return res.status(400).json({ success: false, message: `Invalid payment status. Must be one of: ${valid.join(', ')}` })
    }

    const id = getParam(req.params.id)
    const cleanId = id.trim().toUpperCase()
    const numOnly = cleanId.replace(/^IL-/, '')

    const order = await Order.findOne({
      $or: [
        { orderNumber: cleanId },
        { orderNumber: numOnly },
        { orderNumber: `IL-${numOnly}` },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    if (paymentStatus) order.paymentStatus = paymentStatus
    if (paymentMethod) order.paymentMethod = paymentMethod
    await order.save()

    res.json({ success: true, order })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update payment status', error: error.message })
  }
})

// DELETE /api/orders/:id - cancel order
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req.params.id)
    const cleanId = id.trim().toUpperCase()
    const numOnly = cleanId.replace(/^IL-/, '')

    const order = await Order.findOne({
      $or: [
        { orderNumber: cleanId },
        { orderNumber: numOnly },
        { orderNumber: `IL-${numOnly}` },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    })

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }

    order.status = 'cancelled'
    await order.save()

    res.json({ success: true, message: `Order ${order.orderNumber} cancelled`, order })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message })
  }
})

export default router
