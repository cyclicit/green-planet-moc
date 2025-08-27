const express = require('express');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Import models at the top
const User = require('./models/User');

// Import database connection
const connectDB = require('./config/db');

// Connect to database
connectDB();

const app = express();

// CORS configuration - allow specific origins
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'https://green-planet-mern.netlify.app', // Your Netlify domain
  'https://green-planet-moc.onrender.com' // Your Render backend
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Other middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('User-Agent:', req.headers['user-agent']);
  next();
});

// Passport middleware
app.use(passport.initialize());

// Check if Google OAuth credentials are configured
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ Google OAuth credentials are missing!');
  console.error('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables');
} else {
  console.log('✅ Google OAuth credentials are configured');
}

// Passport config
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://green-planet-moc.onrender.com/api/auth/google/callback'
    : 'http://localhost:5000/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google OAuth profile received:', profile.id);

    // Find or create user
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      console.log('User found by googleId:', user._id);
      return done(null, user);
    }
    
    // Check if user already exists with this email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      console.log('User found by email, updating googleId:', user._id);
      // If user exists but doesn't have googleId, update it
      user.googleId = profile.id;
      user.avatar = profile.photos[0].value;
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    console.log('Creating new user for Google OAuth');
    user = await User.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value
    });
    
    console.log('New user created:', user._id);
    done(null, user);
  } catch (err) {
    console.error('Google OAuth error:', err);
    done(err, null);
  }
}));

// Add passport serialization/deserialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/donations', require('./routes/donations'));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Green Planet API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin
    }
  });
});

// Test endpoint for CORS
app.get('/api/test-cors', (req, res) => {
  res.json({
    message: 'CORS test successful!',
    origin: req.headers.origin,
    allowed: allowedOrigins.includes(req.headers.origin),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'CORS Error',
      message: `Origin ${req.headers.origin} is not allowed`,
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 CORS test: http://localhost:${PORT}/api/test-cors`);
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Google OAuth credentials are missing!');
  }
  
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set!');
  }
});