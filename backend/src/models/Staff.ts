import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IStaff extends Document {
  name: string
  email?: string
  phone: string
  role: 'Manager' | 'Waiter' | 'Kitchen' | 'Cashier' | 'Host'
  status: 'Active' | 'On Break' | 'Off Duty' | 'Inactive'
  shift?: string
  assignedTables?: string[]
  username?: string
  password?: string
  createdAt: Date
  updatedAt: Date
}

const StaffSchema = new Schema<IStaff>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    username: { type: String, trim: true, lowercase: true },
    password: { type: String, select: false },
    role: {
      type: String,
      required: true,
      enum: ['Manager', 'Waiter', 'Kitchen', 'Cashier', 'Host'],
      default: 'Waiter',
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Active', 'On Break', 'Off Duty', 'Inactive'],
      default: 'Active',
      index: true,
    },
    shift: { type: String, default: 'Day Shift' },
    assignedTables: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        delete ret.password
        return ret
      },
    },
  }
)

StaffSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password)) return
  this.password = await bcrypt.hash(this.password, 10)
})

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema)
