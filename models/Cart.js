const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    promoCode: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PromoCode'
    }
}, {
    timestamps: true
});

// Calculate cart total
cartSchema.methods.getTotal = function() {
    return this.items.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
    }, 0);
};

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;