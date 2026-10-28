import dns from 'node:dns'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

// Configure Node to use Google Public DNS / Cloudflare DNS for SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {
  console.warn('Could not set custom DNS servers:', e)
}

const uri = process.env.MONGODB_URI || ''

console.log('Connecting to MongoDB Atlas with custom DNS...')
console.log('URI:', uri.replace(/:([^:@]+)@/, ':****@'))

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  console.log('✅ Successfully connected to MongoDB Atlas!')
  const collections = await mongoose.connection.db?.listCollections().toArray()
  console.log('Existing collections:', collections?.map(c => c.name))
  await mongoose.disconnect()
  console.log('Disconnected cleanly.')
  process.exit(0)
} catch (error) {
  console.error('❌ Connection error:', error)
  process.exit(1)
}
