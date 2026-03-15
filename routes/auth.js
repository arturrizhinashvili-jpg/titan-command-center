const router = require('express').Router();
const passport = require('passport');
router.get('/google', passport.authenticate('google', { scope: ['profile','email','https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.send','https://www.googleapis.com/auth/calendar.readonly'], accessType: 'offline', prompt: 'consent' }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/?auth=failed' }), (req, res) => { console.log('[AUTH] Google OAuth success for:', req.user.email); res.redirect('/?auth=success'); });
router.get('/status', (req, res) => { res.json({ authenticated: req.isAuthenticated(), user: req.user ? { email: req.user.email } : null }); });
router.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });
module.exports = router;
