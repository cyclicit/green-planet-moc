const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  plantName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  location: {
    type: String,
    required: true
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'donated'],
    default: 'available'
  },
  claims: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: {
      type: String
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Donation', donationSchema);