import mongoose, { Schema, Document } from 'mongoose'

export interface IOrderItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  image?: string
}

export interface IOrder extends Document {
  orderNumber: string
  type: 'Dine in' | 'Pickup'
  table?: string
  customerName?: string
  customerPhone?: string
  items: IOrderItem[]
  subtotal: number
  total: number
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  paymentStatus: 'unpaid' | 'paid' | 'pay_after_eating'
  paymentTiming: 'pre_pay' | 'post_pay'
  paymentMethod?: string
  note?: string
  createdAt: Date
  updatedAt: Date
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String },
  },
  { _id: false }
)

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true, enum: ['Dine in', 'Pickup'], default: 'Dine in' },
    table: { type: String, trim: true },
    customerName: { type: String, trim: true, default: 'Guest' },
    customerPhone: { type: String, trim: true },
    items: { type: [OrderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['unpaid', 'paid', 'pay_after_eating'],
      default: 'pay_after_eating',
      index: true,
    },
    paymentTiming: {
      type: String,
      required: true,
      enum: ['pre_pay', 'post_pay'],
      default: 'post_pay',
    },
    paymentMethod: { type: String, default: 'Pay after eating' },
    note: { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

export const Order = mongoose.model<IOrder>('Order', OrderSchema)
