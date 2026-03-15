const router = require('express').Router();
const google = require('../services/google');
const db = require('../utils/db');
router.get('/inbox', async (req, res) => { try { const messages = await google.getInbox(req.query.limit || 20); res.json({ success: true, data: messages }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
router.post('/send', async (req, res) => { try { const { to, subject, body } = req.body; if (!to || !subject || !body) return res.status(400).json({ success: false, error: 'to, subject, body required' }); const result = await google.sendEmail(to, subject, body); const { rows } = await db.query('SELECT id FROM contacts WHERE email=$1', [to]); if (rows.length) { await db.query('INSERT INTO activities (contact_id, type, subject, body) VALUES ($1, $2, $3, $4)', [rows[0].id, 'email_sent', subject, body]); } res.json({ success: true, data: result }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
module.exports = router;
