const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const passport = require('passport');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const blogRoutes = require('./routes/blogs');
const donationRoutes = require('./routes/donations');

// Import passport configuration
require('./config/passport');

const app = express();

// CORS configuration - allow specific origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://green-planet-mern.netlify.app'
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

// Session configuration - MUST come before passport middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production, false in development
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  },
  store: mongoose.connection.readyState === 1 
    ? new (require('connect-mongo')(session))({ 
        mongooseConnection: mongoose.connection,
        collection: 'sessions'
      })
    : null
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Other middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('Authenticated:', req.isAuthenticated());
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/donations', donationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    session: req.session ? 'Active' : 'No session',
    authenticated: req.isAuthenticated()
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Green Planet API is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    session: req.sessionID ? 'Session exists' : 'No session',
    user: req.user || 'Not authenticated'
  });
});


// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build directory
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Render uses port 10000 by default
const PORT = process.env.PORT || 10000;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Check if MongoDB URI is set
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✅ Allowed origins: ${allowedOrigins.join(', ')}`);
      console.log(`🔐 Session secret: ${process.env.SESSION_SECRET ? 'Set' : 'Not set - using fallback'}`);
      console.log(`📱 Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();