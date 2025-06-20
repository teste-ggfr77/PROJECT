const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PromoCodeSchema = new Schema({
    code: { type: String, required: true, unique: true },
    discountType: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
    discountValue: { type: Number, required: true },
    expiryDate: { type: Date, default: null },
    usageLimit: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 }
}, {
    timestamps: true
});

module.exports = mongoose.model('PromoCode', PromoCodeSchema);