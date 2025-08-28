const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Generate JWT token function
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      name: user.name 
    },
    process.env.JWT_SECRET || 'fallback_jwt_secret',
    { expiresIn: '7d' }
  );
};

// Initiate Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: process.env.FRONTEND_URL + '/login?error=auth_failed',
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user);
      
      // Redirect to frontend with token as query parameter
      res.redirect(`${process.env.FRONTEND_URL}/auth-callback?token=${token}&success=true`);
    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(process.env.FRONTEND_URL + '/login?error=token_error');
    }
  }
);

// Get current user
router.get('/user', async (req, res) => {
  try {
    // Check for token in headers
    const token = req.headers['x-auth-token'];
    
    if (!token) {
      return res.json({ isAuthenticated: false });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret');
    
    // You would typically fetch user from database here
    res.json({
      isAuthenticated: true,
      user: decoded
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.json({ isAuthenticated: false });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  // With JWT, logout is handled on the client side by removing the token
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;