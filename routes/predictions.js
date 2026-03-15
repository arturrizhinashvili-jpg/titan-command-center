const router = require('express').Router();
const db = require('../utils/db');
const { runPredictions } = require('../services/predictions');
router.get('/', async (req, res) => {
  try {
    const { rows: contactPredictions } = await db.query("SELECT DISTINCT ON (p.contact_id) p.*, c.first_name, c.last_name, c.company, c.email, c.stage, c.deal_value FROM predictions p JOIN contacts c ON c.id = p.contact_id WHERE c.stage NOT IN ('closed_won', 'closed_lost') ORDER BY p.contact_id, p.created_at DESC");
    const { rows: forecast } = await db.query('SELECT * FROM forecasts ORDER BY created_at DESC LIMIT 1');
    const underperforming = forecast[0]?.underperforming_campaigns || [];
    res.json({ success: true, data: { contactPredictions: contactPredictions.sort((a, b) => b.close_likelihood - a.close_likelihood), forecast: forecast[0] || null, underperformingCampaigns: underperforming, lastUpdated: forecast[0]?.created_at || null } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/run', async (req, res) => { try { const result = await runPredictions(); res.json({ success: true, data: result }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
module.exports = router;
