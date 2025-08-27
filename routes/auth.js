const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import User model
const router = express.Router();

// Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login`,
    session: false 
  }),
  (req, res) => {
    try {
      // Successful authentication
      const token = jwt.sign(
        { id: req.user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );
      
      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
  }
);

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(401).json({ msg: 'Token is not valid' });
  }
});

// Logout (optional)
router.post('/logout', (req, res) => {
  // Since we're using JWT, logout is handled client-side by removing the token
  res.json({ msg: 'Logged out successfully' });
});

module.exports = router;