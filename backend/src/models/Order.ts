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
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  paymentStatus: 'unpaid' | 'paid' | 'pay_after_eating'
  paymentTiming: 'pre_pay' | 'post_pay' | 'pay_before' | 'pay_after'
  paymentMethod?: string
  transactionId?: string
  note?: string
  source?: 'table_qr' | 'web_direct' | 'manual_table'
  parentOrderId?: string
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
      enum: ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    source: {
      type: String,
      enum: ['table_qr', 'web_direct', 'manual_table'],
      default: 'web_direct',
      index: true,
    },
    parentOrderId: { type: String, trim: true },
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
      enum: ['pre_pay', 'post_pay', 'pay_before', 'pay_after'],
      default: 'post_pay',
    },
    paymentMethod: { type: String, default: 'Pay after eating' },
    transactionId: { type: String, trim: true },
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
