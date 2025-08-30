// routes/auth.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.FRONTEND_URL,
  process.env.NODE_ENV === 'production' 
    ? 'https://green-planet-moc.onrender.com/api/auth/google/callback'
    : 'http://localhost:10000/api/auth/google/callback'
);

// Generate JWT tokens
const generateTokens = (user) => {
  // Access token (short-lived)
  const accessToken = jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      name: user.name 
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes
  );

  // Refresh token (long-lived)
  const refreshToken = jwt.sign(
    { 
      id: user._id 
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, // Use separate secret if available
    { expiresIn: '7d' } // 7 days
  );

  return { accessToken, refreshToken };
};

router.get('/google', (req, res) => {
  try {
    const redirectUri= 'https://green-planet-moc.onrender.com/api/auth/google/callback'
      ? 'https://green-planet-moc.onrender.com/api/auth/google/callback'
      : 'http://localhost:10000/api/auth/google/callback';

    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'], // Use simpler scope names
      prompt: 'consent',
      redirect_uri: redirectUri // Explicitly set redirect URI here
    });
    
    res.redirect(authorizeUrl);
  } catch (error) {
    console.error('Google auth initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate Google authentication' });
  }
});
// Handle Google callback
// Handle Google callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      console.log('No authorization code received');
      return res.redirect(`${frontendUrl}/auth/callback?error=No authorization code`);
    }

    console.log('Received authorization code:', code);

    const redirectUri = 'https://green-planet-moc.onrender.com/api/auth/google/callback'
      ? 'https://green-planet-moc.onrender.com/api/auth/google/callback'
      : 'http://localhost:10000/api/auth/google/callback';

    console.log('Using redirect URI for token exchange:', redirectUri);

    // Exchange code for tokens with explicit redirect URI
    const { tokens } = await client.getToken({
      code: code,
      redirect_uri: redirectUri
    });
    
    console.log('Successfully exchanged code for tokens');

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    console.log('Google payload received:', payload);

    const { sub: googleId, email, name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ 
      $or: [{ googleId }, { email }] 
    });

    if (!user) {
      user = new User({
        googleId,
        email,
        name,
        avatar: picture,
        authMethod: 'google'
      });
      await user.save();
      console.log('Created new user:', user._id);
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.avatar = picture;
      await user.save();
      console.log('Updated existing user with Google ID:', user._id);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log('Redirecting to frontend with tokens');
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshToken}&userId=${user._id}`);
    
  } catch (error) {
    console.error('Google callback error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?error=Authentication failed: ${error.message}`);
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user, token });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;