import { Router } from 'express';
import { MenuItem } from '../models/MenuItem.js';
const router = Router();
// GET /api/menu - fetch all menu items with optional category and search filters
router.get('/', async (req, res) => {
    try {
        const { category, search, availableOnly } = req.query;
        const filter = {};
        if (category && category !== 'all') {
            filter.category = category;
        }
        if (availableOnly === 'true') {
            filter.available = true;
        }
        if (typeof search === 'string' && search.trim()) {
            const q = search.trim();
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { amharicName: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } },
                { 'translations.am': { $regex: q, $options: 'i' } },
                { 'translations.or': { $regex: q, $options: 'i' } },
            ];
        }
        const items = await MenuItem.find(filter).sort({ displayOrder: 1, createdAt: 1 });
        res.json({ success: true, count: items.length, items });
    }
    catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch menu items', error: error.message });
    }
});
// GET /api/menu/:id - fetch single menu item
router.get('/:id', async (req, res) => {
    try {
        const item = await MenuItem.findOne({ id: req.params.id });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json({ success: true, item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching item', error: error.message });
    }
});
// POST /api/menu - create new menu item
router.post('/', async (req, res) => {
    try {
        const { name, amharicName, category, price, description, image, houseSpecial, available, displayOrder } = req.body;
        if (!name || !category || price === undefined) {
            return res.status(400).json({ success: false, message: 'Name, category, and price are required' });
        }
        // Generate unique slug id if not provided
        const id = req.body.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
        const existing = await MenuItem.findOne({ id });
        if (existing) {
            return res.status(409).json({ success: false, message: `An item with ID '${id}' already exists` });
        }
        const newItem = new MenuItem({
            id,
            name,
            amharicName: amharicName || '',
            category,
            price: Number(price),
            description: description || '',
            image: image || '/images/ethiopian-sharing-platter.jpg',
            available: available !== undefined ? Boolean(available) : true,
            houseSpecial: Boolean(houseSpecial),
            displayOrder: displayOrder || 0,
            translations: {
                or: name,
                am: amharicName || name,
                en: name,
            },
        });
        await newItem.save();
        res.status(201).json({ success: true, item: newItem });
    }
    catch (error) {
        console.error('Error creating menu item:', error);
        res.status(500).json({ success: false, message: 'Failed to create menu item', error: error.message });
    }
});
// PUT /api/menu/:id - update existing item
router.put('/:id', async (req, res) => {
    try {
        const { name, amharicName, category, price, description, image, houseSpecial, available, displayOrder } = req.body;
        const item = await MenuItem.findOne({ id: req.params.id });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        if (name)
            item.name = name;
        if (amharicName !== undefined)
            item.amharicName = amharicName;
        if (category)
            item.category = category;
        if (price !== undefined)
            item.price = Number(price);
        if (description !== undefined)
            item.description = description;
        if (image)
            item.image = image;
        if (houseSpecial !== undefined)
            item.houseSpecial = Boolean(houseSpecial);
        if (available !== undefined)
            item.available = Boolean(available);
        if (displayOrder !== undefined)
            item.displayOrder = Number(displayOrder);
        if (amharicName) {
            item.translations = {
                ...item.translations,
                am: amharicName,
            };
        }
        await item.save();
        res.json({ success: true, item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update item', error: error.message });
    }
});
// PATCH /api/menu/:id/toggle-available - toggle item availability
router.patch('/:id/toggle-available', async (req, res) => {
    try {
        const item = await MenuItem.findOne({ id: req.params.id });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        item.available = !item.available;
        await item.save();
        res.json({ success: true, item, available: item.available });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to toggle availability', error: error.message });
    }
});
// PATCH /api/menu/:id/toggle-special - toggle house special badge
router.patch('/:id/toggle-special', async (req, res) => {
    try {
        const item = await MenuItem.findOne({ id: req.params.id });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }
        item.houseSpecial = !item.houseSpecial;
        await item.save();
        res.json({ success: true, item, houseSpecial: item.houseSpecial });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to toggle house special', error: error.message });
    }
});
// DELETE /api/menu/:id - delete item
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await MenuItem.findOneAndDelete({ id: req.params.id });
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json({ success: true, message: `Item '${deleted.name}' deleted successfully` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete item', error: error.message });
    }
});
export default router;
