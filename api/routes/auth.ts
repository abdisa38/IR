import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { Staff } from '../models/Staff.js'
import { validateGoogleTokenInfo } from '../auth-security.js'

const router = Router()
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters")
  }
  return secret
}

// Helper to safely parse string params
function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0]
  return param || ''
}

// POST /api/auth/register - Register with Name, Phone, and Password
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, password } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your full name.' })
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your phone number.' })
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters.' })
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '')
    const cleanEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : undefined

    // Check if phone or email already in use
    const existing = await User.findOne({
      $or: [
        { phone: cleanPhone },
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ],
    })

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this phone number or email already exists. Please sign in.',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const newUser = new User({
      id,
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      password: hashedPassword,
      role: 'customer',
      authProvider: 'local',
      orders: [],
    })

    await newUser.save()

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, role: newUser.role, phone: newUser.phone, email: newUser.email },
      getJwtSecret(),
      { expiresIn: '30d' }
    )

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
        authProvider: newUser.authProvider,
      },
    })
  } catch (error: any) {
    console.error('Error during registration:', error)
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message })
  }
})

// POST /api/auth/login - Sign in with phone/email and password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide phone/email and password.' })
    }

    const cleanId = identifier.trim()
    const lower = cleanId.toLowerCase()

    // Check registered Staff collection credentials
    const staffDoc = await Staff.findOne({
      $or: [
        { username: lower },
        { phone: cleanId },
        { email: lower },
      ],
    }).select("+password")
    let staffPasswordValid = false
    if (staffDoc?.password && staffDoc.status === "Active" && typeof password === "string" && password.length >= 8 && Buffer.byteLength(password, 'utf8') <= 72) {
      if (/^\$2[aby]\$/.test(staffDoc.password)) {
        staffPasswordValid = await bcrypt.compare(password, staffDoc.password)
      } else if (staffDoc.password === password) {
        staffPasswordValid = true
        staffDoc.password = await bcrypt.hash(password, 10)
        await staffDoc.save()
      }
    }

    if (staffDoc && staffPasswordValid) {
      const assignedRole = staffDoc.role.toLowerCase()
      const staffToken = jwt.sign(
        { id: staffDoc._id.toString(), name: staffDoc.name, role: assignedRole },
        getJwtSecret(),
        { expiresIn: '30d' }
      )
      return res.json({
        success: true,
        message: 'Signed in as Staff',
        token: staffToken,
        user: {
          id: staffDoc._id.toString(),
          name: staffDoc.name,
          role: assignedRole,
          isStaff: true,
        },
      })
    }

    // Customer lookup
    const user = await User.findOne({
      $or: [
        { phone: cleanId.replace(/\s+/g, '') },
        { email: lower },
      ],
    })

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect phone/email or password. Please verify and try again.',
      })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please verify and try again.',
      })
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, phone: user.phone, email: user.email },
      getJwtSecret(),
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    })
  } catch (error: any) {
    console.error('Error during login:', error)
    res.status(500).json({ success: false, message: 'Login failed', error: error.message })
  }
})

// POST /api/auth/google - Sign in / Register with Google OAuth
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is required' })
    }

    const expectedGoogleClientId = process.env.GOOGLE_CLIENT_ID
    if (!expectedGoogleClientId) {
      return res.status(503).json({ success: false, message: "Google sign-in is not configured" })
    }

    let tokenInfo: any
    try {
      const tokenInfoUrl = new URL("https://oauth2.googleapis.com/tokeninfo")
      tokenInfoUrl.searchParams.set("id_token", credential)
      const gRes = await fetch(tokenInfoUrl)
      if (!gRes.ok) {
        return res.status(401).json({ success: false, message: "Invalid Google credential" })
      }
      // Google's tokeninfo endpoint verifies the ID token signature before returning claims.
      tokenInfo = await gRes.json()
    } catch {
      return res.status(401).json({ success: false, message: "Unable to verify Google credential" })
    }

    const googleData = validateGoogleTokenInfo(tokenInfo, expectedGoogleClientId)
    if (!googleData) {
      return res.status(401).json({ success: false, message: "Google credential claims are invalid" })
    }

    const googleId = googleData.sub || `g-${Date.now()}`
    const email = (googleData.email || '').toLowerCase()
    const name = googleData.name || googleData.given_name || email.split('@')[0] || 'Guest'
    const avatar = googleData.picture || ''

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [
        { googleId },
        ...(email ? [{ email }] : []),
      ],
    })

    if (!user) {
      user = new User({
        id: `usr-g-${Date.now()}`,
        name,
        email,
        googleId,
        avatar,
        authProvider: 'google',
        role: 'customer',
        orders: [],
      })
      await user.save()
    } else {
      // Update Google metadata
      user.googleId = googleId
      if (avatar && !user.avatar) user.avatar = avatar
      if (!user.authProvider) user.authProvider = 'google'
      await user.save()
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, email: user.email, avatar: user.avatar },
      getJwtSecret(),
      { expiresIn: '30d' }
    )

    res.json({
      success: true,
      message: 'Signed in with Google successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatar,
        role: user.role,
        authProvider: 'google',
      },
    })
  } catch (error: any) {
    console.error('Error during Google authentication:', error)
    res.status(500).json({ success: false, message: 'Google authentication failed', error: error.message })
  }
})

// GET /api/auth/me - Retrieve authenticated user profile and past orders
router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" })
    }

    const token = authHeader.slice(7)
    const decoded = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload & {
      id?: string
      role?: string
    }
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({ success: false, message: "Invalid authentication token" })
    }

    if (decoded.role !== "customer") {
      const staff = await Staff.findById(decoded.id).select("-password")
      if (!staff || staff.status !== "Active") {
        return res.status(401).json({ success: false, message: "Staff account is unavailable" })
      }
      return res.json({
        success: true,
        user: {
          id: staff._id.toString(),
          name: staff.name,
          role: staff.role.toLowerCase(),
          isStaff: true,
        },
        orders: [],
      })
    }

    const user = await User.findById(decoded.id).select("-password")
    if (!user || user.role !== "customer") {
      return res.status(401).json({ success: false, message: "User account is unavailable" })
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      orders: [],
    })
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" })
  }
})

export default router
