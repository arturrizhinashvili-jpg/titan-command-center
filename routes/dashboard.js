const router = require('express').Router();
const db = require('../utils/db');
router.get('/stats', async (req, res) => {
  try {
    const { rows: pipeline } = await db.query("SELECT COUNT(*) as total_contacts, COUNT(*) FILTER (WHERE stage = 'new') as new_leads, COUNT(*) FILTER (WHERE stage = 'contacted') as contacted, COUNT(*) FILTER (WHERE stage = 'replied') as replied, COUNT(*) FILTER (WHERE stage = 'booked') as booked, COUNT(*) FILTER (WHERE stage = 'pitched') as pitched, COUNT(*) FILTER (WHERE stage = 'negotiation') as negotiation, COUNT(*) FILTER (WHERE stage = 'closed_won') as closed_won, COUNT(*) FILTER (WHERE stage = 'closed_lost') as closed_lost, SUM(deal_value) FILTER (WHERE stage = 'closed_won') as revenue_won, SUM(deal_value) FILTER (WHERE stage NOT IN ('closed_won', 'closed_lost')) as pipeline_value FROM contacts");
    const { rows: weekActivity } = await db.query("SELECT type, COUNT(*) as count FROM activities WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY type ORDER BY count DESC");
    const { rows: campaigns } = await db.query("SELECT name, status, stats FROM instantly_campaigns ORDER BY fetched_at DESC LIMIT 10");
    const { rows: forecast } = await db.query("SELECT * FROM forecasts ORDER BY created_at DESC LIMIT 1");
    const { rows: recentActivities } = await db.query("SELECT * FROM activities ORDER BY created_at DESC LIMIT 20");
    const { rows: sources } = await db.query("SELECT source, COUNT(*) as count FROM contacts GROUP BY source ORDER BY count DESC");
    res.json({ success: true, data: { pipeline: pipeline[0], weekActivity, campaigns, latestForecast: forecast[0] || null, recentActivities, sources } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
module.exports = router;
