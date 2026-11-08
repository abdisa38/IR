import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import express, { type Express, type Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { connectDB } from '../src/config/db.js'

import apiAnalytics from '../../api/routes/analytics.js'
import apiAuth from '../../api/routes/auth.js'
import apiOrders from '../../api/routes/orders.js'
import { Order as apiOrderModel } from '../../api/models/Order.js'
import apiSettings from '../../api/routes/settings.js'
import apiStaff from '../../api/routes/staff.js'
import { Staff as apiStaffModel } from '../../api/models/Staff.js'
import { User as apiUserModel } from '../../api/models/User.js'

import backendAnalytics from '../src/routes/analytics.js'
import backendAuth from '../src/routes/auth.js'
import backendOrders from '../src/routes/orders.js'
import { Order as backendOrderModel } from '../src/models/Order.js'
import backendSettings from '../src/routes/settings.js'
import backendStaff from '../src/routes/staff.js'
import { Staff as backendStaffModel } from '../src/models/Staff.js'
import { User as backendUserModel } from '../src/models/User.js'
import { validateGoogleTokenInfo as validateApiGoogleTokenInfo } from '../../api/auth-security.js'
import { validateGoogleTokenInfo as validateBackendGoogleTokenInfo } from '../src/auth-security.js'

const secret = 'security-regression-test-secret-at-least-32-characters'
const originalJwtSecret = process.env.JWT_SECRET
const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID
const originalPaymentMode = process.env.PAYMENT_MODE
process.env.JWT_SECRET = secret
process.env.GOOGLE_CLIENT_ID = 'security-test-client-id'

after(() => {
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = originalJwtSecret
  if (originalGoogleClientId === undefined) delete process.env.GOOGLE_CLIENT_ID
  else process.env.GOOGLE_CLIENT_ID = originalGoogleClientId
  if (originalPaymentMode === undefined) delete process.env.PAYMENT_MODE
  else process.env.PAYMENT_MODE = originalPaymentMode
})

type Implementation = {
  name: string
  routers: { auth: Router; staff: Router; orders: Router; analytics: Router; settings: Router }
  Staff: typeof apiStaffModel
  User: typeof apiUserModel
  Order: typeof apiOrderModel
}

const implementations: Implementation[] = [
  {
    name: 'api/',
    routers: { auth: apiAuth, staff: apiStaff, orders: apiOrders, analytics: apiAnalytics, settings: apiSettings },
    Staff: apiStaffModel,
    User: apiUserModel,
    Order: apiOrderModel,
  },
  {
    name: 'backend/src/',
    routers: {
      auth: backendAuth,
      staff: backendStaff,
      orders: backendOrders,
      analytics: backendAnalytics,
      settings: backendSettings,
    },
    Staff: backendStaffModel,
    User: backendUserModel,
    Order: backendOrderModel,
  },
]

function createApp(implementation: Implementation) {
  const app = express()
  app.use(express.json())
  app.use('/auth', implementation.routers.auth)
  app.use('/staff', implementation.routers.staff)
  app.use('/orders', implementation.routers.orders)
  app.use('/analytics', implementation.routers.analytics)
  app.use('/settings', implementation.routers.settings)
  return app
}

async function request(app: Express, path: string, options: RequestInit = {}) {
  const server = app.listen(0, '127.0.0.1')
  try {
    await new Promise<void>(resolve => server.once('listening', resolve))
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    return await fetch(`http://127.0.0.1:${address.port}${path}`, options)
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

function json(method: string, body: unknown, token?: string): RequestInit {
  return {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  }
}

function replaceMethod(target: object, method: string, replacement: (...args: any[]) => any) {
  const descriptor = Object.getOwnPropertyDescriptor(target, method)
  Object.defineProperty(target, method, { configurable: true, writable: true, value: replacement })
  return () => {
    if (descriptor) Object.defineProperty(target, method, descriptor)
    else delete (target as any)[method]
  }
}

function query(value: any) {
  const result: any = {
    select() { return result },
    sort() { return result },
    limit() { return result },
    lean() { return result },
    exec() { return Promise.resolve(value) },
    then(resolve: (value: any) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject)
    },
  }
  return result
}

function mockMethods(t: any, model: object, overrides: Record<string, (...args: any[]) => any>) {
  for (const [method, replacement] of Object.entries(overrides)) {
    t.after(replaceMethod(model, method, replacement))
  }
}

for (const implementation of implementations) {
  test(`${implementation.name} security regressions`, async t => {
    const { Staff, User } = implementation

    await t.test('denies unauthenticated access to sensitive route sets', async () => {
      const app = createApp(implementation)
      for (const [method, path] of [
        ['GET', '/staff'],
        ['GET', '/orders'],
        ['PATCH', '/orders/507f1f77bcf86cd799439011/status'],
        ['GET', '/analytics'],
        ['PUT', '/settings'],
        ['GET', '/auth/me'],
      ] as const) {
        const response = await request(app, path, { method })
        assert.ok([401, 403].includes(response.status), `${method} ${path} returned ${response.status}`)
      }
    })

    await t.test('rejects forged staff tokens', async t => {
      mockMethods(t, Staff, {
        findById: () => query(null),
      })
      mockMethods(t, User, {
        findById: () => query(null),
      })
      const forgedToken = jwt.sign(
        { id: '507f1f77bcf86cd799439011', role: 'manager' },
        'attacker-controlled-signing-key',
      )
      const response = await request(createApp(implementation), '/staff', {
        headers: { Authorization: `Bearer ${forgedToken}` },
      })
      assert.ok([401, 403].includes(response.status))
    })

    await t.test('allows an active staff login and never returns staff passwords', async t => {
      const passwordAtLimit = `Abcdef1!${'é'.repeat(32)}`
      const passwordHash = await bcrypt.hash(passwordAtLimit, 4)
      const staff = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Regression Manager',
        username: 'regression-manager',
        phone: '5550100',
        email: 'manager@example.invalid',
        role: 'Manager',
        status: 'Active',
        password: passwordHash,
        save: async () => undefined,
      }
      mockMethods(t, Staff, {
        findOne: () => query(staff),
        findById: () => query(staff),
        find: () => query([staff]),
      })
      mockMethods(t, User, { findOne: () => query(null) })

      const app = createApp(implementation)
      const login = await request(app, '/auth/login', json('POST', {
        identifier: staff.username,
        password: passwordAtLimit,
      }))
      assert.equal(login.status, 200)
      const loginBody = await login.json() as { token?: string }
      assert.ok(loginBody.token)

      const response = await request(app, '/staff', { headers: { Authorization: `Bearer ${loginBody.token}` } })
      assert.equal(response.status, 200)
      const responseText = await response.text()
      assert.ok(!responseText.includes(passwordHash), 'staff password hash was returned')
      const responseBody = JSON.parse(responseText)
      assert.ok(responseBody.staff.every((member: Record<string, unknown>) => !('password' in member)))

      const oversizedLogin = await request(app, '/auth/login', json('POST', {
        identifier: staff.username,
        password: `${passwordAtLimit}x`,
      }))
      assert.equal(oversizedLogin.status, 401, 'bcrypt-truncating staff login passwords must be rejected')

      const order = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        orderNumber: 'IL-1001',
        status: 'pending',
        save: async () => undefined,
      }
      mockMethods(t, implementation.Order, {
        find: () => query([]),
        findOne: () => query(order),
      })
      const orderRead = await request(app, '/orders', { headers: { Authorization: `Bearer ${loginBody.token}` } })
      assert.equal(orderRead.status, 200, 'active staff should be able to read orders')

      const orderUpdate = await request(app, `/orders/${order._id}/status`, json('PATCH', {
        status: 'preparing',
      }, loginBody.token))
      assert.equal(orderUpdate.status, 200, 'active staff should be able to update order status')
      assert.equal(order.status, 'preparing')

      t.after(replaceMethod(Staff.prototype, 'save', async function (this: any) { return this }))
      const staffCreate = (password: string) => request(app, '/staff', json('POST', {
        name: 'Password Boundary',
        phone: '5550101',
        password,
      }, loginBody.token))
      assert.equal((await staffCreate(`${passwordAtLimit}x`)).status, 400, 'new staff passwords over 72 UTF-8 bytes must be rejected')
      assert.equal((await staffCreate(passwordAtLimit)).status, 201, 'new staff passwords at 72 UTF-8 bytes should remain valid')
    })

    await t.test('requires strong customer registration passwords within bcrypt byte limit', async t => {
      mockMethods(t, User, { findOne: () => query(null) })
      t.after(replaceMethod(User.prototype, 'save', async function (this: any) { return this }))
      const app = createApp(implementation)
      const register = (password: string) => request(app, '/auth/register', json('POST', {
        name: 'Password Boundary',
        phone: '5550200',
        password,
      }))

      assert.equal((await register('A'.repeat(11))).status, 400, 'new passwords shorter than 12 characters must fail')
      assert.equal((await register(`${'A'.repeat(12)}${'é'.repeat(31)}`)).status, 400, 'passwords over 72 UTF-8 bytes must fail')
      assert.equal((await register('A'.repeat(12))).status, 201, '12-character passwords should be accepted')
      assert.equal((await register(`${'A'.repeat(12)}${'é'.repeat(30)}`)).status, 201, 'passwords at 72 UTF-8 bytes should be accepted')
    })

    await t.test('keeps guest order creation and test payment verification public', async t => {
      mockMethods(t, implementation.Order, { findOne: () => query(null) })
      t.after(replaceMethod(implementation.Order.prototype, 'save', async function (this: any) { return this }))

      const app = createApp(implementation)
      const order = await request(app, '/orders', json('POST', {
        items: [{ name: 'Guest meal', price: 20, quantity: 1 }],
        customerName: 'Guest',
      }))
      assert.equal(order.status, 201)

      process.env.PAYMENT_MODE = 'test'
      const payment = await request(app, '/orders/sheger-verify', json('POST', {}))
      assert.equal(payment.status, 200)
      assert.equal((await payment.json() as { verified: boolean }).verified, true)
    })

    await t.test('does not allow default credentials or caller-supplied staff claims to log in', async t => {
      mockMethods(t, Staff, { findOne: () => query(null) })
      mockMethods(t, User, { findOne: () => query(null) })
      const response = await request(createApp(implementation), '/auth/login', json('POST', {
        identifier: 'admin',
        password: '1234',
        role: 'manager',
        isStaff: true,
      }))
      assert.equal(response.status, 401)
      const body = await response.json() as { token?: string }
      assert.equal(body.token, undefined)
    })

    await t.test('rejects staff passwords shorter than eight characters, including legacy plaintext', async () => {
      const staff = {
        username: 'weak-legacy',
        role: 'Manager',
        status: 'Active',
        password: '1234',
        save: async () => { throw new Error('weak legacy password must not be migrated') },
      }
      mockMethods(t, Staff, { findOne: () => query(staff) })
      mockMethods(t, User, { findOne: () => query(null) })
      const response = await request(createApp(implementation), '/auth/login', json('POST', {
        identifier: staff.username,
        password: '1234',
      }))
      assert.equal(response.status, 401)
    })

    await t.test('rejects inactive staff and returns no historical orders from /me', async t => {
      const inactiveStaff = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Disabled Manager',
        role: 'Manager',
        status: 'Disabled',
      }
      mockMethods(t, Staff, { findById: () => query(inactiveStaff) })
      const app = createApp(implementation)
      const staffToken = jwt.sign({ id: inactiveStaff._id.toString(), role: 'manager' }, secret)
      const staffResponse = await request(app, '/auth/me', {
        headers: { Authorization: `Bearer ${staffToken}` },
      })
      assert.equal(staffResponse.status, 401)

      const customer = {
        id: 'customer-1',
        name: 'Shared Name',
        phone: '5550100',
        role: 'customer',
      }
      mockMethods(t, User, {
        findOne: (filter: Record<string, unknown>) => {
          assert.deepEqual(filter, { id: customer.id }, 'customer /me must query by the custom token id')
          return query(customer)
        },
      })
      const customerToken = jwt.sign({ id: customer.id, role: 'customer', name: customer.name, phone: customer.phone }, secret)
      const customerResponse = await request(app, '/auth/me', {
        headers: { Authorization: `Bearer ${customerToken}` },
      })
      assert.equal(customerResponse.status, 200)
      const profile = await customerResponse.json() as { orders?: unknown[] }
      assert.deepEqual(profile.orders, [])
    })

    await t.test('rejects successful tokeninfo responses for an attacker Google client', async t => {
      const originalFetch = globalThis.fetch
      t.after(() => { globalThis.fetch = originalFetch })
      globalThis.fetch = async (input, init) => {
        if (String(input).startsWith('http://127.0.0.1:')) return originalFetch(input, init)
        return new Response(JSON.stringify({
        aud: 'attacker-google-client.apps.googleusercontent.com',
        iss: 'https://accounts.google.com',
        exp: String(Math.floor(Date.now() / 1000) + 3600),
        email_verified: 'true',
        sub: 'attacker-subject',
        email: 'attacker@example.invalid',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      const response = await request(createApp(implementation), '/auth/google', json('POST', {
        credential: 'signed-for-another-client',
        clientId: 'attacker-google-client.apps.googleusercontent.com',
      }))
      assert.equal(response.status, 401)
      const body = await response.json() as { token?: string }
      assert.equal(body.token, undefined)
    })

    await t.test('fails closed when Google rejects the supplied credential', async t => {
      const originalFetch = globalThis.fetch
      t.after(() => { globalThis.fetch = originalFetch })
      globalThis.fetch = async (input, init) => {
        if (String(input).startsWith('http://127.0.0.1:')) return originalFetch(input, init)
        return new Response(JSON.stringify({ error: 'invalid_token' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const response = await request(createApp(implementation), '/auth/google', json('POST', {
        credential: 'not-a-real-google-token',
      }))
      assert.ok(response.status >= 400 && response.status < 500, `unexpected status ${response.status}`)
      const body = await response.json() as { token?: string }
      assert.equal(body.token, undefined)
    })
  })
}

test('api/ does not bypass its database connection guard for direct staff login identifiers', async t => {
  const originalMongoUri = process.env.MONGODB_URI
  process.env.MONGODB_URI = ''
  t.after(() => {
    if (originalMongoUri === undefined) delete process.env.MONGODB_URI
    else process.env.MONGODB_URI = originalMongoUri
  })

  const { default: apiApp } = await import('../../api/index.js')
  mockMethods(t, apiStaffModel, { findOne: () => query(null) })
  mockMethods(t, apiUserModel, { findOne: () => query(null) })

  const response = await request(apiApp, '/api/auth/login', json('POST', {
    identifier: 'manager',
    password: '1234',
  }))
  assert.equal(response.status, 500)
  const body = await response.json() as Record<string, unknown>
  assert.equal(body.message, 'Database connection failed.')
  assert.equal('error' in body, false)
})

const validGoogleClaims = {
  aud: 'expected-google-client.apps.googleusercontent.com',
  iss: 'https://accounts.google.com',
  exp: '2000000000',
  email_verified: 'true',
  sub: 'google-subject',
  email: 'customer@example.invalid',
}

for (const [name, validate] of [
  ['api/', validateApiGoogleTokenInfo],
  ['backend/src/', validateBackendGoogleTokenInfo],
] as const) {
  test(`${name} Google identity claim validation`, () => {
    const expectedClientId = 'expected-google-client.apps.googleusercontent.com'
    assert.ok(validate(validGoogleClaims, expectedClientId, 1_900_000_000))
    assert.equal(validate({ ...validGoogleClaims, aud: 'attacker-client.apps.googleusercontent.com' }, expectedClientId, 1_900_000_000), null)
    assert.equal(validate({ ...validGoogleClaims, iss: 'https://attacker.invalid' }, expectedClientId, 1_900_000_000), null)
    assert.equal(validate({ ...validGoogleClaims, exp: '1900000000' }, expectedClientId, 1_900_000_000), null)
    assert.equal(validate({ ...validGoogleClaims, email_verified: 'false' }, expectedClientId, 1_900_000_000), null)
    assert.equal(validate(validGoogleClaims, '', 1_900_000_000), null)
  })
}


test('backend database connection failures propagate without logging connection details', async t => {
  const originalMongoUri = process.env.MONGODB_URI
  process.env.MONGODB_URI = 'mongodb://sensitive-user:sensitive-password@db.example.invalid/private'
  t.after(() => {
    if (originalMongoUri === undefined) delete process.env.MONGODB_URI
    else process.env.MONGODB_URI = originalMongoUri
  })
  mockMethods(t, mongoose, {
    connect: async () => { throw new Error('connection rejected for mongodb://sensitive-user:sensitive-password@db.example.invalid/private') },
  })
  let logged = ''
  t.after(replaceMethod(console, 'error', (...args: unknown[]) => { logged += args.join(' ') }))

  await assert.rejects(connectDB(), error => {
    assert.equal((error as Error).message, 'MongoDB connection failed')
    assert.ok(!(error as Error).message.includes('sensitive-password'))
    return true
  })
  assert.equal(logged, '', 'database connection details must not be logged')
})
