import mongoose, { Schema, Document } from 'mongoose'

export interface ISettings extends Document {
  restaurantName: string
  managerPhone: string
  location: string
  announcement: string
  currency: string
  openingHours: string
  updatedAt: Date
}

const SettingsSchema = new Schema<ISettings>(
  {
    restaurantName: { type: String, default: 'Ilillii Bar & Restaurant' },
    managerPhone: { type: String, default: '0938890645' },
    location: { type: String, default: 'Bale Robe around Awraris (7.121960, 40.002844)' },
    announcement: { type: String, default: 'Welcome to Ilillii Bar & Restaurant · Open Daily 7:00 AM – 11:30 PM' },
    currency: { type: String, default: 'ETB' },
    openingHours: { type: String, default: 'Daily 7:00 AM – 11:30 PM' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema)
