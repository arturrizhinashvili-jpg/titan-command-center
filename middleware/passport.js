const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../utils/db');

module.exports = function(passport) {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile','email','https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/calendar.readonly'],
    accessType: 'offline', prompt: 'consent'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      await db.query(`INSERT INTO oauth_tokens (provider, email, access_token, refresh_token, expiry_date, updated_at) VALUES ('google', $1, $2, $3, $4, NOW()) ON CONFLICT (provider, email) DO UPDATE SET access_token=$2, refresh_token=COALESCE($3, oauth_tokens.refresh_token), expiry_date=$4, updated_at=NOW()`, [email, accessToken, refreshToken, Date.now() + 3600000]);
      done(null, { email, accessToken, refreshToken, profile: profile._json });
    } catch (err) { done(err); }
  }));
};
