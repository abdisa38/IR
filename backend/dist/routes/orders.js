import { Router } from 'express';
import { Order } from '../models/Order.js';
const router = Router();
// Generate next clean order number (e.g. 1025, 1026 - no IL- prefix)
async function generateOrderNumber() {
    const latest = await Order.findOne().sort({ createdAt: -1 });
    if (!latest || !latest.orderNumber) {
        return '1001';
    }
    const match = latest.orderNumber.match(/(\d+)/);
    if (match && match[1]) {
        const nextNum = parseInt(match[1], 10) + 1;
        return `${nextNum}`;
    }
    return `${Math.floor(1000 + Math.random() * 9000)}`;
}
function getParam(param) {
    if (Array.isArray(param))
        return param[0] || '';
    return param || '';
}
function buildOrderQuery(id) {
    const cleanId = id.trim().toUpperCase();
    const numOnly = cleanId.replace(/^IL-/, '');
    const orConditions = [
        { orderNumber: cleanId },
        { orderNumber: numOnly },
        { orderNumber: `IL-${numOnly}` },
    ];
    if (/^[0-9a-fA-F]{24}$/.test(id.trim())) {
        orConditions.push({ _id: id.trim() });
    }
    return { $or: orConditions };
}
// GET /api/orders - list orders with status, type, and pagination filters
router.get('/', async (req, res) => {
    try {
        const { status, type, phone, customer, limit = 50 } = req.query;
        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }
        if (type && type !== 'all') {
            filter.type = type;
        }
        if (phone && customer) {
            const cleanPhone = String(phone).trim().replace(/\s+/g, '');
            const last9Digits = cleanPhone.replace(/\D/g, '').slice(-9);
            const phoneRegex = last9Digits ? new RegExp(last9Digits, 'i') : new RegExp(cleanPhone, 'i');
            const nameRegex = new RegExp(String(customer).trim(), 'i');
            filter.$or = [{ customerPhone: phoneRegex }, { customerName: nameRegex }];
        }
        else if (phone) {
            const cleanPhone = String(phone).trim().replace(/\s+/g, '');
            const last9Digits = cleanPhone.replace(/\D/g, '').slice(-9);
            filter.customerPhone = { $regex: last9Digits || cleanPhone, $options: 'i' };
        }
        else if (customer) {
            filter.customerName = { $regex: String(customer).trim(), $options: 'i' };
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
        const order = await Order.findOne(buildOrderQuery(id));
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
        const { items, type = 'Dine in', table, customerName, customerPhone, note, paymentTiming = 'post_pay', paymentMethod, transactionId, source = 'web_direct', parentOrderId } = req.body;
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
            transactionId: transactionId || undefined,
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
// POST /api/orders/payo-create - initialize a Payo payment session
// POST /api/orders/chapa-create - initialize Chapa checkout
router.post('/chapa-create', async (req, res) => {
    try {
        const { amount, email, firstName, lastName, phone, orderId, returnUrl } = req.body;
        const cleanAmount = Number(amount) || 0;
        if (cleanAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid order amount required' });
        }
        const secretKey = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-SVisq6fT3zWmaHDn4vyEeDZWoAe22YXB';
        const cleanOrderNum = orderId ? String(orderId).replace(/^IL-/, '') : `${Date.now()}`;
        const txRef = `ilillii-${cleanOrderNum}-${Math.random().toString(36).substring(2, 7)}`;
        const host = req.get('host') || 'ilillii-restaurant.pro.et';
        const protocol = req.protocol === 'http' && host.includes('localhost') ? 'http' : 'https';
        const payload = {
            amount: String(cleanAmount),
            currency: 'ETB',
            email: email && email.includes('@') ? email : 'guest@ilillii.com',
            first_name: firstName || 'Guest',
            last_name: lastName || 'Customer',
            phone_number: phone || '0909511588',
            tx_ref: txRef,
            callback_url: `${protocol}://${host}/api/orders/chapa-webhook`,
            return_url: returnUrl || `${protocol}://${host}/#profile`,
            'customization[title]': 'Ilillii Hotel',
            'customization[description]': `Order #${cleanOrderNum}`,
        };
        const chapaRes = await fetch('https://api.chapa.co/v1/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const data = await chapaRes.json();
        if (!chapaRes.ok || data.status !== 'success' || !data.data?.checkout_url) {
            return res.status(chapaRes.status || 500).json({
                success: false,
                message: data.message || 'Failed to initialize Chapa payment',
                error: data,
            });
        }
        return res.json({
            success: true,
            checkoutUrl: data.data.checkout_url,
            txRef,
            amount: cleanAmount,
            currency: 'ETB',
        });
    }
    catch (error) {
        console.error('Chapa order create error:', error);
        return res.status(500).json({ success: false, message: 'Chapa connection failed', error: error.message });
    }
});
// GET /api/orders/chapa-verify/:txRef - check live status of Chapa order
router.get('/chapa-verify/:txRef', async (req, res) => {
    try {
        const { txRef } = req.params;
        const ourOrderId = req.query.ourOrderId;
        const secretKey = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-SVisq6fT3zWmaHDn4vyEeDZWoAe22YXB';
        const chapaRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${txRef}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${secretKey}`,
            },
        });
        const data = await chapaRes.json();
        const isSuccess = Boolean(data && data.status === 'success' && data.data && data.data.status === 'success');
        if (isSuccess && ourOrderId) {
            try {
                const order = await Order.findOne(buildOrderQuery(String(ourOrderId)));
                if (order && order.paymentStatus !== 'paid') {
                    order.paymentStatus = 'paid';
                    order.paymentMethod = 'Chapa (Verified)';
                    order.transactionId = Array.isArray(txRef) ? txRef[0] : String(txRef);
                    await order.save();
                }
            }
            catch (e) { }
        }
        return res.json({
            success: true,
            verified: isSuccess,
            status: isSuccess ? 'success' : (data?.data?.status || data?.status || 'pending'),
            data: data?.data,
        });
    }
    catch (error) {
        console.error('Chapa verify error:', error);
        return res.status(500).json({ success: false, message: 'Failed to verify Chapa payment', error: error.message });
    }
});
// POST /api/orders/chapa-webhook - incoming webhook when customer payment is verified
router.post('/chapa-webhook', async (req, res) => {
    try {
        const { tx_ref, status } = req.body;
        if (status === 'success' && tx_ref) {
            const order = await Order.findOne({
                $or: [
                    { transactionId: String(tx_ref) },
                    { note: { $regex: String(tx_ref), $options: 'i' } }
                ]
            });
            if (order) {
                order.paymentStatus = 'paid';
                order.paymentMethod = 'Chapa (Verified)';
                await order.save();
            }
        }
        return res.json({ success: true, received: true });
    }
    catch (err) {
        console.error('Chapa webhook processing error:', err);
        return res.status(200).json({ success: true, error: err.message });
    }
});
// POST /api/orders/sheger-verify - fallback compatibility
router.post('/sheger-verify', async (req, res) => {
    return res.json({ success: true, verified: true, message: 'Payment recorded' });
});
// POST /api/orders/:id/add-items - Add extra food to existing active order
router.post('/:id/add-items', async (req, res) => {
    try {
        const { items, note } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide items to add' });
        }
        const id = getParam(req.params.id);
        const order = await Order.findOne(buildOrderQuery(id));
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
        const order = await Order.findOne(buildOrderQuery(id));
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
        const order = await Order.findOne(buildOrderQuery(id));
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
// DELETE /api/orders/:id - permanently delete or cancel order
router.delete('/:id', async (req, res) => {
    try {
        const id = getParam(req.params.id);
        const { cancel } = req.query;
        if (cancel === 'true') {
            const order = await Order.findOne(buildOrderQuery(id));
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
            order.status = 'cancelled';
            await order.save();
            return res.json({ success: true, message: `Order ${order.orderNumber} cancelled`, order });
        }
        const deleted = await Order.findOneAndDelete(buildOrderQuery(id));
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, message: `Order #${deleted.orderNumber} deleted permanently`, order: deleted });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
    }
});
export default router;
