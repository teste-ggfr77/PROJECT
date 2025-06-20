const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    default: 'footer_signup'
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ subscribedAt: -1 });
newsletterSchema.index({ isActive: 1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);