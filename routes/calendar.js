const router = require('express').Router();
const google = require('../services/google');
router.get('/upcoming', async (req, res) => { try { const events = await google.getUpcomingEvents(req.query.days || 7); res.json({ success: true, data: events }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
module.exports = router;
