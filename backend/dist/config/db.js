import dns from 'node:dns';
import mongoose from 'mongoose';
// Ensure Node uses Google & Cloudflare DNS for SRV records on Windows/cloud
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}
catch (err) {
    console.warn('DNS server override warning:', err);
}
export async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri)
        throw new Error("MONGODB_URI must be configured");
    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log('MongoDB connected');
    }
    catch {
        throw new Error('MongoDB connection failed');
    }
}
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('error', () => {
    console.error("MongoDB connection error");
});
