import { Router, Request, Response } from 'express'
import { requireStaffAuth } from '../middleware/auth.js'
import { Staff } from '../models/Staff.js'

const router = Router()

// Protect all staff management endpoints
router.use(requireStaffAuth as any)

// GET /api/staff - fetch all staff
router.get('/', async (_req: Request, res: Response) => {
  try {
    const staff = await Staff.find().select('-password').sort({ role: 1, name: 1 })
    res.json({ success: true, count: staff.length, staff })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff', error: error.message })
  }
})

// POST /api/staff - create new staff member
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, role = 'Waiter', status = 'Active', shift = 'Day Shift', assignedTables = [], username, password = '1234' } = req.body

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required' })
    }

    const defaultUsername = (username || name.toLowerCase().replace(/[^a-z0-9]/g, '') || phone).slice(0, 20)

    const newStaff = new Staff({
      name,
      phone,
      email: email || '',
      role,
      status,
      shift,
      assignedTables,
      username: defaultUsername,
      password: password || '1234',
    })

    await newStaff.save()
    res.status(201).json({ success: true, staff: newStaff })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create staff', error: error.message })
  }
})

// PUT /api/staff/:id - update staff
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, role, status, shift, assignedTables, username, password } = req.body
    const staff = await Staff.findById(req.params.id)

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' })
    }

    if (name) staff.name = name
    if (phone) staff.phone = phone
    if (email !== undefined) staff.email = email
    if (role) staff.role = role
    if (status) staff.status = status
    if (shift) staff.shift = shift
    if (assignedTables) staff.assignedTables = assignedTables
    if (username !== undefined) staff.username = username
    if (password !== undefined) staff.password = password

    await staff.save()
    res.json({ success: true, staff })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update staff', error: error.message })
  }
})

// PATCH /api/staff/:id/status - toggle status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    const staff = await Staff.findById(req.params.id)

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found' })
    }

    staff.status = status || (staff.status === 'Active' ? 'On Break' : 'Active')
    await staff.save()

    res.json({ success: true, staff, status: staff.status })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to change staff status', error: error.message })
  }
})

// DELETE /api/staff/:id - delete staff member
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Staff.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Staff member not found' })
    }
    res.json({ success: true, message: `Staff member '${deleted.name}' deleted` })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete staff member', error: error.message })
  }
})

export default router
