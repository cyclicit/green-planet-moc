const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://green-planet-moc.onrender.com/api/auth/google/callback' 
    : 'http://localhost:5000/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile received:', profile);
    
    // Check if user already exists
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      console.log('User found:', user.email);
      return done(null, user);
    }
    
    // Check if user exists with same email but different auth method
    user = await User.findOne({ email: profile.emails[0].value });
    
    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.avatar = profile.photos[0].value;
      await user.save();
      console.log('Linked Google account to existing user');
      return done(null, user);
    }
    
    // Create new user
    user = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value,
      authMethod: 'google'
    });
    
    await user.save();
    console.log('New user created with Google auth');
    return done(null, user);
    
  } catch (error) {
    console.error('Error in Google strategy:', error);
    return done(error, null);
  }
}));