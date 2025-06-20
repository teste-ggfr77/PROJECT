const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [{
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        color: String,
        size: String,
        quantity: Number,
        price: Number
    }],
    total: Number,
    shippingAddress: { type: String },
    phone: { type: String },
    status: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);