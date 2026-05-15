const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const ADMIN_EMAIL = 'n.i.farhan44@gmail.com';

module.exports = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          let user = await User.findOne({ email });

          if (user) {
            // Update Google ID if missing
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            // Force admin role for admin email
            if (email === ADMIN_EMAIL) {
              user.role = 'admin';
            }
            await user.save();
            return done(null, user);
          }

          // Create new user
          const role = email === ADMIN_EMAIL ? 'admin' : 'user';
          user = await User.create({
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatar: profile.photos[0]?.value || '',
            role,
            authProvider: 'google',
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
};
