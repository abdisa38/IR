import mongoose from 'mongoose'
import dns from 'node:dns'

// Set DNS servers to Google and Cloudflare to prevent Windows/cloud SRV resolution failure
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {
  // Ignore in environments where setting DNS servers is not allowed
}

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://abdisaawel313_db_user:Z3sThBMkaoNAIprs@cluster0.ssexi1b.mongodb.net/ilillii_db?retryWrites=true&w=majority&appName=Cluster0'

let isConnected = false

export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
    isConnected = true
    console.log(`✅ MongoDB Connected for Serverless: ${conn.connection.host} / Database: ${conn.connection.name}`)
    return conn.connection
  } catch (error: any) {
    console.error('❌ MongoDB Connection Error in Serverless Function:', error.message)
    throw error
  }
}
