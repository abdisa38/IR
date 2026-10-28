import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  id: string
  name: string
  email?: string
  phone?: string
  password?: string
  role: 'customer' | 'staff' | 'manager' | 'admin'
  googleId?: string
  avatar?: string
  authProvider: 'local' | 'google'
  orders: string[]
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret._id
        delete ret.__v
        delete ret.password
        return ret
      },
    },
  }
)

export const User = mongoose.model<IUser>('User', UserSchema)
