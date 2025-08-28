const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google Auth Routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' // Force account selection
  })
);

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    failureMessage: true 
  }),
  (req, res) => {
    try {
      // Successful authentication
      console.log('Google auth successful for user:', req.user._id);
      res.redirect(process.env.NODE_ENV === 'production' 
        ? 'https://green-planet-moc.onrender.com/dashboard' 
        : 'http://localhost:3000/dashboard'
      );
    } catch (error) {
      console.error('Error in Google callback:', error);
      res.redirect('/login?error=auth_failed');
    }
  }
);

// Logout route
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ msg: 'Error logging out' });
    }
    res.redirect('/');
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: req.user
    });
  } else {
    res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

module.exports = router;