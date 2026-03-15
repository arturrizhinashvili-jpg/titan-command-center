const router = require('express').Router();
const instantly = require('../services/instantly');
router.get('/campaigns', async (req, res) => { try { const campaigns = await instantly.getCampaigns(); const enriched = []; for (const c of (campaigns || [])) { try { const stats = await instantly.getCampaignStats(c.id); enriched.push({ ...c, stats }); } catch { enriched.push(c); } } res.json({ success: true, data: enriched }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
router.get('/leads', async (req, res) => { try { const { campaign_id, limit } = req.query; const leads = await instantly.getLeads(campaign_id, limit); res.json({ success: true, data: leads }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
router.get('/analytics', async (req, res) => { try { const data = await instantly.getAnalytics(); res.json({ success: true, data }); } catch (err) { res.status(500).json({ success: false, error: err.message }); } });
module.exports = router;
