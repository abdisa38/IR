import { Router } from 'express';
import { Order } from '../models/Order.js';
const router = Router();
// Generate next order number e.g. IL-1025
async function generateOrderNumber() {
    const latest = await Order.findOne().sort({ createdAt: -1 });
    if (!latest || !latest.orderNumber) {
        return 'IL-1001';
    }
    const match = latest.orderNumber.match(/IL-(\d+)/);
    if (match && match[1]) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `IL-${nextNum}`;
    }
    return `IL-${Math.floor(1000 + Math.random() * 9000)}`;
}
function getParam(param) {
    if (Array.isArray(param))
        return param[0] || '';
    return param || '';
}
// GET /api/orders - list orders with status, type, and pagination filters
router.get('/', async (req, res) => {
    try {
        const { status, type, limit = 50 } = req.query;
        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (type && type !== 'all') {
            filter.type = type;
        }
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(Number(limit));
        res.json({ success: true, count: orders.length, orders });
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
    }
});
// GET /api/orders/:identifier - lookup by orderNumber or MongoDB ID
router.get('/:identifier', async (req, res) => {
    try {
        const id = getParam(req.params.identifier);
        const order = await Order.findOne({
            $or: [
                { orderNumber: id.toUpperCase() },
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            ],
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to find order', error: error.message });
    }
});
// POST /api/orders - customer places new order
router.post('/', async (req, res) => {
    try {
        const { items, type = 'Dine in', table, customerName, customerPhone, note, paymentTiming = 'post_pay', paymentMethod, source = 'web_direct', parentOrderId } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
        }
        const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
        const total = subtotal;
        const orderNumber = await generateOrderNumber();
        const normalizedTiming = (paymentTiming === 'pay_before' || paymentTiming === 'pre_pay') ? 'pre_pay' : 'post_pay';
        const normalizedPaymentStatus = normalizedTiming === 'pre_pay' ? 'paid' : 'pay_after_eating';
        const normalizedPaymentMethod = paymentMethod || (normalizedTiming === 'pre_pay' ? 'Cash / Transfer' : 'Pay after eating');
        const newOrder = new Order({
            orderNumber,
            type: type === 'Pickup' ? 'Pickup' : 'Dine in',
            table: table || '',
            customerName: customerName || (table ? `Table ${table}` : 'Guest'),
            customerPhone: customerPhone || '',
            items: items.map((i, index) => ({
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
            note: note || '',
            source: source === 'table_qr' ? 'table_qr' : 'web_direct',
            parentOrderId: parentOrderId || undefined,
        });
        await newOrder.save();
        console.log(`[Order Created] ${orderNumber} - ${items.length} items - ${total} ETB - Table: ${table || 'N/A'} - Source: ${newOrder.source}`);
        res.status(201).json({ success: true, order: newOrder });
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Failed to place order', error: error.message });
    }
});
// POST /api/orders/:id/add-items - Add extra food to existing active order
router.post('/:id/add-items', async (req, res) => {
    try {
        const { items, note } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide items to add' });
        }
        const id = getParam(req.params.id);
        const order = await Order.findOne({
            $or: [
                { orderNumber: id.toUpperCase() },
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            ],
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const additionalItems = items.map((i, index) => ({
            menuItemId: String(i.menuItemId || i.id || `item-${Date.now()}-${index}`),
            name: i.name || 'Additional dish',
            price: Number(i.price) || 0,
            quantity: Number(i.quantity) || 1,
            image: i.image || '',
        }));
        order.items.push(...additionalItems);
        const additionalSubtotal = additionalItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        order.subtotal += additionalSubtotal;
        order.total += additionalSubtotal;
        if (note) {
            order.note = order.note ? `${order.note} | Extra: ${note}` : `Extra: ${note}`;
        }
        // Reopen preparation stage so kitchen sees new food
        if (['ready', 'completed'].includes(order.status)) {
            order.status = 'preparing';
        }
        await order.save();
        console.log(`[Order Updated with Additional Items] ${order.orderNumber} - New Total: ${order.total} ETB`);
        res.json({ success: true, message: 'Additional items added to order', order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to add items to order', error: error.message });
    }
});
// PATCH /api/orders/:id/status - update status (pending, accepted, preparing, ready, completed, cancelled)
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
        if (!valid.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${valid.join(', ')}` });
        }
        const id = getParam(req.params.id);
        const order = await Order.findOne({
            $or: [
                { orderNumber: id.toUpperCase() },
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            ],
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        order.status = status;
        await order.save();
        res.json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message });
    }
});
// PATCH /api/orders/:id/payment - update payment status
router.patch('/:id/payment', async (req, res) => {
    try {
        const { paymentStatus, paymentMethod } = req.body;
        const valid = ['unpaid', 'paid', 'pay_after_eating'];
        if (paymentStatus && !valid.includes(paymentStatus)) {
            return res.status(400).json({ success: false, message: `Invalid payment status. Must be one of: ${valid.join(', ')}` });
        }
        const id = getParam(req.params.id);
        const order = await Order.findOne({
            $or: [
                { orderNumber: id.toUpperCase() },
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            ],
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        if (paymentStatus)
            order.paymentStatus = paymentStatus;
        if (paymentMethod)
            order.paymentMethod = paymentMethod;
        await order.save();
        res.json({ success: true, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update payment status', error: error.message });
    }
});
// DELETE /api/orders/:id - cancel order
router.delete('/:id', async (req, res) => {
    try {
        const id = getParam(req.params.id);
        const order = await Order.findOne({
            $or: [
                { orderNumber: id.toUpperCase() },
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
            ],
        });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        order.status = 'cancelled';
        await order.save();
        res.json({ success: true, message: `Order ${order.orderNumber} cancelled`, order });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel order', error: error.message });
    }
});
export default router;
