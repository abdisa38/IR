import mongoose, { Schema } from 'mongoose';
const MenuItemSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    amharicName: { type: String, trim: true },
    category: {
        type: String,
        required: true,
        enum: ['food', 'hot-drinks', 'cold-drinks', 'beer-wine', 'spirits'],
        index: true,
    },
    categoryLabel: { type: String },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    image: { type: String, required: true },
    available: { type: Boolean, default: true, index: true },
    houseSpecial: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0 },
    translations: {
        or: { type: String },
        am: { type: String },
        en: { type: String },
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
});
export const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
