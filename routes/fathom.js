const router = require('express').Router();
const fathom = require('../services/fathom');
const db = require('../utils/db');
router.get('/calls', async (req, res) => { try { let calls; try { calls = await fathom.getCalls(req.query.limit || 20); } catch { const { rows } = await db.query('SELECT * FROM fathom_calls ORDER BY call_date DESC LIMIT $1', [req.query.limit || 20]); return res.json({ success: true, data: rows, source: 'cache' }); } res.json({ success: true, data: calls }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
router.post('/sync', async (req, res) => { try { await fathom.syncCalls(); res.json({ success: true, synced: true }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
module.exports = router;
