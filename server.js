const express = require('express');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const connectDB = require('./config/db');
require('dotenv').config();

// Import models at the top
const User = require('./models/User');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static('uploads'));

// Passport middleware
app.use(passport.initialize());

// Passport config - Moved after User model import
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      return done(null, user);
    }
    
    // Check if user already exists with this email
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // If user exists but doesn't have googleId, update it
      user.googleId = profile.id;
      user.avatar = profile.photos[0].value;
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    user = await User.create({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value
    });
    
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

// Update the CORS configuration
app.use(cors({
  origin: 'https://green-planet-mern.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));


app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.file) {
    console.log('File uploaded:', req.file);
  }
  next();
});

// Handle preflight requests
app.options('*', cors());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/donations', require('./routes/donations'));

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Green Planet API is running!' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});