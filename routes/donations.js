const express = require('express');
const Donation = require('../models/Donation');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all donations
router.get('/', async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate('donor', 'name avatar')
      .populate('claims.user', 'name avatar')
      .sort({ createdAt: -1 });
    
    res.json(donations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create donation
router.post('/', auth, async (req, res) => {
  try {
    const { plantName, description, location } = req.body;
    
    const donation = new Donation({
      plantName,
      description,
      location,
      donor: req.user.id
    });
    
    await donation.save();
    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Claim donation
router.post('/:id/claim', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ msg: 'Donation not found' });
    }
    
    // Check if user already claimed
    const alreadyClaimed = donation.claims.find(
      claim => claim.user.toString() === req.user.id
    );
    
    if (alreadyClaimed) {
      return res.status(400).json({ msg: 'Already claimed this donation' });
    }
    
    donation.claims.push({
      user: req.user.id,
      message
    });
    
    await donation.save();
    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update claim status (donor only)
router.put('/:id/claims/:claimId', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const donation = await Donation.findById(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ msg: 'Donation not found' });
    }
    
    // Check if user is the donor
    if (donation.donor.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    const claim = donation.claims.id(req.params.claimId);
    if (!claim) {
      return res.status(404).json({ msg: 'Claim not found' });
    }
    
    claim.status = status;
    
    // If approved, mark donation as claimed
    if (status === 'approved') {
      donation.status = 'claimed';
    }
    
    await donation.save();
    res.json(donation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;