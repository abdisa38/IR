import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, index: true },
    password: { type: String },
    role: {
        type: String,
        enum: ['customer', 'staff', 'manager', 'admin'],
        default: 'customer',
        index: true,
    },
    googleId: { type: String, index: true },
    avatar: { type: String },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
    },
    orders: [{ type: String }],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        },
    },
});
export const User = mongoose.model('User', UserSchema);
