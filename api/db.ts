import mongoose from 'mongoose'
import dns from 'node:dns'

// Set DNS servers to Google and Cloudflare to prevent Windows/cloud SRV resolution failure
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {
  // Ignore in environments where setting DNS servers is not allowed
}

const MONGODB_URI = process.env.MONGODB_URI

let isConnected = false

export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured")
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
    isConnected = true
    console.log(`✅ MongoDB Connected for Serverless: ${conn.connection.host} / Database: ${conn.connection.name}`)
    return conn.connection
  } catch (error: any) {
    console.error("MongoDB connection failed")
    throw error
  }
}
