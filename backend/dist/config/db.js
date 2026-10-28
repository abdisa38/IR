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
    const uri = process.env.MONGODB_URI || 'mongodb+srv://abdisaawel313_db_user:Z3sThBMkaoNAIprs@cluster0.ssexi1b.mongodb.net/ilillii_db?retryWrites=true&w=majority&appName=Cluster0';
    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host} / Database: ${conn.connection.name}`);
    }
    catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        // Don't kill process immediately; allow retry or health check inspection
    }
}
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('error', (err) => {
    console.error('⚠️ MongoDB connection runtime error:', err);
});
