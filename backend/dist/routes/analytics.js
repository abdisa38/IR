import { Router } from 'express';
import { Order } from '../models/Order.js';
import { MenuItem } from '../models/MenuItem.js';
import { Staff } from '../models/Staff.js';
import { requireManager } from '../middleware/authorize.js';
const router = Router();
// GET /api/analytics - real-time analytics from MongoDB
router.get('/', requireManager, async (_req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [allOrders, todayOrders, totalMenuItems, totalStaff, activeStaff,] = await Promise.all([
            Order.find(),
            Order.find({ createdAt: { $gte: todayStart } }),
            MenuItem.countDocuments(),
            Staff.countDocuments(),
            Staff.countDocuments({ status: 'Active' }),
        ]);
        const totalRevenue = allOrders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + (o.total || 0), 0);
        const todayRevenue = todayOrders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + (o.total || 0), 0);
        const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
        const preparingOrders = allOrders.filter(o => o.status === 'preparing').length;
        const readyOrders = allOrders.filter(o => o.status === 'ready').length;
        const completedOrders = allOrders.filter(o => o.status === 'completed').length;
        // Aggregate top items
        const itemMap = {};
        for (const order of allOrders) {
            if (order.status === 'cancelled')
                continue;
            for (const line of order.items || []) {
                if (!itemMap[line.name]) {
                    itemMap[line.name] = { name: line.name, quantity: 0, revenue: 0 };
                }
                itemMap[line.name].quantity += line.quantity || 1;
                itemMap[line.name].revenue += (line.price || 0) * (line.quantity || 1);
            }
        }
        const topItems = Object.values(itemMap)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        res.json({
            success: true,
            data: {
                totalRevenue,
                todayRevenue,
                totalOrders: allOrders.length,
                todayOrdersCount: todayOrders.length,
                pendingOrders,
                preparingOrders,
                readyOrders,
                completedOrders,
                activeOrders: pendingOrders + preparingOrders,
                totalMenuItems,
                totalStaff,
                activeStaff,
                topItems,
                currency: 'ETB',
            },
        });
    }
    catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({ success: false, message: 'Failed to generate analytics', error: error.message });
    }
});
export default router;
