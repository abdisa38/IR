// Run locally by an operator with database access; this is not an HTTP endpoint.
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const id = process.argv[2]
if (!mongoose.isValidObjectId(id) || !process.env.MONGODB_URI || process.stdin.isTTY) {
  console.error('Usage: pipe a new password to node scripts/set-staff-password.mjs <staff MongoDB id>; MONGODB_URI is required.')
  process.exit(1)
}
let input = ''
for await (const chunk of process.stdin) {
  input += chunk
  if (Buffer.byteLength(input) > 1024) {
    console.error('Password input is too long.')
    process.exit(1)
  }
}
const password = input.replace(/\r?\n$/, '')
if (password.length < 12 || Buffer.byteLength(password) > 72 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  console.error('Password must contain 12 or more characters, at most 72 UTF-8 bytes, and uppercase, lowercase, digit and symbol characters.')
  process.exit(1)
}
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  const result = await mongoose.connection.collection('staffs').updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: { password: await bcrypt.hash(password, 12), updatedAt: new Date() } },
  )
  if (result.matchedCount !== 1) {
    console.error('Staff member not found; no password changed.')
    process.exitCode = 1
  } else {
    console.log('Staff password updated. Confirm the account is active before signing in.')
  }
} catch {
  console.error('Password update failed. Check the database connection and permissions.')
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}
