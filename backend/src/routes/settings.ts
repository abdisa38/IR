import { Router, Request, Response } from 'express'
import { Settings } from '../models/Settings.js'

const router = Router()

// GET /api/settings - fetch restaurant settings
router.get('/', async (_req: Request, res: Response) => {
  try {
    let settings = await Settings.findOne()
    if (!settings) {
      settings = await Settings.create({
        restaurantName: 'Ilillii Bar & Restaurant',
        managerPhone: '0909511588',
        location: 'Bale Robe around Awraris and around Wako Gutu Square',
        announcement: 'Welcome to Ilillii Bar & Restaurant · Open Daily 7:00 AM – 11:30 PM',
        currency: 'ETB',
        openingHours: 'Daily 7:00 AM – 11:30 PM',
      })
    }
    res.json({ success: true, settings })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message })
  }
})

// PUT /api/settings - update restaurant settings
router.put('/', async (req: Request, res: Response) => {
  try {
    const { restaurantName, managerPhone, location, announcement, openingHours } = req.body
    let settings = await Settings.findOne()

    if (!settings) {
      settings = new Settings()
    }

    if (restaurantName) settings.restaurantName = restaurantName
    if (managerPhone) settings.managerPhone = managerPhone
    if (location) settings.location = location
    if (announcement !== undefined) settings.announcement = announcement
    if (openingHours) settings.openingHours = openingHours

    await settings.save()
    res.json({ success: true, settings })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message })
  }
})

export default router
