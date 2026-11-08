import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { requireManager } from '../middleware/authorize.js'

const router = Router()

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// POST /api/upload - handles base64 image upload or verified URL
router.post('/', requireManager, async (req: Request, res: Response) => {
  try {
    const { image, filename } = req.body

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ success: false, message: 'Image payload is required' })
    }

    // 1. If it's a data URL (e.g. data:image/jpeg;base64,...)
    if (image.startsWith('data:image/')) {
      const matches = image.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, message: 'Invalid base64 image format' })
      }

      let ext = matches[1].toLowerCase()
      if (ext === 'jpeg') ext = 'jpg'
      if (ext === 'svg+xml') ext = 'svg'

      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')

      // Limit max size to 10MB
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Image size exceeds 10MB limit' })
      }

      const safeName = filename
        ? `${Date.now()}-${filename.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`
        : `dish-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

      const filePath = path.join(uploadsDir, safeName)
      fs.writeFileSync(filePath, buffer)

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http'
      const host = req.get('host')
      const publicUrl = `/uploads/${safeName}`
      const fullUrl = `${protocol}://${host}${publicUrl}`

      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        url: fullUrl,
        fullUrl,
        publicUrl,
        filename: safeName,
      })
    }

    // 2. If it's an HTTP/HTTPS URL
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return res.json({
        success: true,
        message: 'Remote image URL verified',
        url: image,
        fullUrl: image,
      })
    }

    // 3. Fallback for relative paths
    if (image.startsWith('/')) {
      return res.json({
        success: true,
        message: 'Path verified',
        url: image,
        fullUrl: image,
      })
    }

    return res.status(400).json({ success: false, message: 'Unsupported image format. Provide a file upload or valid URL.' })
  } catch (error: any) {
    console.error('Image upload error:', error)
    return res.status(500).json({ success: false, message: 'Failed to process image upload', error: error.message })
  }
})

export default router
