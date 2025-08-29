const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  plantName: {
    type: String,
    required: [true, 'Plant name is required'],
    trim: true,
    maxlength: [100, 'Plant name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Donation description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    maxlength: [200, 'Location cannot exceed 200 characters']
  },
  donorName: {
    type: String,
    required: [true, 'Donor name is required'],
    maxlength: [100, 'Donor name cannot exceed 100 characters']
  },
  images: [{
    type: String,
    default: []
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'completed'],
    default: 'available'
  },
  claimedBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    claimedAt: {
      type: Date
    },
    message: {
      type: String,
      maxlength: [500, 'Claim message cannot exceed 500 characters']
    }
  },
  condition: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'needs-care'],
    default: 'good'
  },
  size: {
    type: String,
    enum: ['small', 'medium', 'large', 'extra-large'],
    default: 'medium'
  },
  pickupInstructions: {
    type: String,
    maxlength: [500, 'Pickup instructions cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Add index for better performance
donationSchema.index({ plantName: 'text', description: 'text' });
donationSchema.index({ location: 1 });
donationSchema.index({ user: 1 });
donationSchema.index({ status: 1 });

module.exports = mongoose.model('Donation', donationSchema);