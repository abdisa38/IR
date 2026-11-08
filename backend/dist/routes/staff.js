import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Staff } from '../models/Staff.js';
import { requireManager } from '../middleware/authorize.js';
const router = Router();
const strongPassword = (value) => typeof value === 'string' && value.length >= 12 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
const publicStaff = (staff) => {
    const result = staff.toObject ? staff.toObject() : { ...staff };
    delete result.password;
    delete result.__v;
    return result;
};
// GET /api/staff - fetch all staff
router.get('/', requireManager, async (_req, res) => {
    try {
        const staff = await Staff.find().sort({ role: 1, name: 1 });
        res.json({ success: true, count: staff.length, staff: staff.map(publicStaff) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch staff', error: error.message });
    }
});
// POST /api/staff - create new staff member
router.post('/', requireManager, async (req, res) => {
    try {
        const { name, phone, email, role = 'Waiter', status = 'Active', shift = 'Day Shift', assignedTables = [], username, password } = req.body;
        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and phone number are required' });
        }
        if (!strongPassword(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters' });
        }
        const defaultUsername = (username || name.toLowerCase().replace(/[^a-z0-9]/g, '') || phone).slice(0, 20);
        const newStaff = new Staff({
            name,
            phone,
            email: email || '',
            role,
            status,
            shift,
            assignedTables,
            username: defaultUsername,
            password: await bcrypt.hash(password, 12),
        });
        await newStaff.save();
        res.status(201).json({ success: true, staff: publicStaff(newStaff) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create staff' });
    }
});
// PUT /api/staff/:id - update staff
router.put('/:id', requireManager, async (req, res) => {
    try {
        const { name, phone, email, role, status, shift, assignedTables, username, password } = req.body;
        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        if (password !== undefined && !strongPassword(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 12 characters and include uppercase, lowercase, number, and symbol characters' });
        }
        if (name)
            staff.name = name;
        if (phone)
            staff.phone = phone;
        if (email !== undefined)
            staff.email = email;
        if (role)
            staff.role = role;
        if (status)
            staff.status = status;
        if (shift)
            staff.shift = shift;
        if (assignedTables)
            staff.assignedTables = assignedTables;
        if (username !== undefined)
            staff.username = username;
        if (password !== undefined)
            staff.password = await bcrypt.hash(password, 12);
        await staff.save();
        res.json({ success: true, staff: publicStaff(staff) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update staff' });
    }
});
// PATCH /api/staff/:id/status - toggle status
router.patch('/:id/status', requireManager, async (req, res) => {
    try {
        const { status } = req.body;
        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        staff.status = status || (staff.status === 'Active' ? 'On Break' : 'Active');
        await staff.save();
        res.json({ success: true, staff: publicStaff(staff), status: staff.status });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to change staff status', error: error.message });
    }
});
// DELETE /api/staff/:id - delete staff member
router.delete('/:id', requireManager, async (req, res) => {
    try {
        const deleted = await Staff.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        res.json({ success: true, message: `Staff member '${deleted.name}' deleted` });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete staff member', error: error.message });
    }
});
export default router;
