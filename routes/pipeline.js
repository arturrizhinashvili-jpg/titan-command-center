const router = require('express').Router();
const db = require('../utils/db');
router.get('/', async (req, res) => {
  try {
    const { stage, source, search, limit = 200 } = req.query;
    let query = 'SELECT c.*, (SELECT json_agg(a ORDER BY a.created_at DESC) FROM activities a WHERE a.contact_id = c.id) as activities, (SELECT json_agg(p ORDER BY p.created_at DESC) FROM predictions p WHERE p.contact_id = c.id LIMIT 1) as predictions FROM contacts c WHERE 1=1';
    const params = [];
    if (stage) { params.push(stage); query += ' AND c.stage = $' + params.length; }
    if (source) { params.push(source); query += ' AND c.source = $' + params.length; }
    if (search) { params.push('%'+search+'%'); query += ' AND (c.email ILIKE $' + params.length + ' OR c.first_name ILIKE $' + params.length + ' OR c.last_name ILIKE $' + params.length + ' OR c.company ILIKE $' + params.length + ')'; }
    params.push(limit); query += ' ORDER BY c.updated_at DESC LIMIT $' + params.length;
    const { rows } = await db.query(query, params);
    const { rows: counts } = await db.query('SELECT stage, COUNT(*) as count, SUM(deal_value) as total_value FROM contacts GROUP BY stage ORDER BY stage');
    res.json({ success: true, data: rows, stages: counts, total: rows.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.post('/contact', async (req, res) => {
  try {
    const { email, first_name, last_name, company, title, phone, linkedin_url, source, stage, deal_value, notes, tags } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });
    const { rows } = await db.query(`INSERT INTO contacts (email, first_name, last_name, company, title, phone, linkedin_url, source, stage, deal_value, notes, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (email) DO UPDATE SET first_name = COALESCE(NULLIF($2, ''), contacts.first_name), last_name = COALESCE(NULLIF($3, ''), contacts.last_name), company = COALESCE(NULLIF($4, ''), contacts.company), title = COALESCE(NULLIF($5, ''), contacts.title), phone = COALESCE(NULLIF($6, ''), contacts.phone), linkedin_url = COALESCE(NULLIF($7, ''), contacts.linkedin_url), stage = COALESCE($9, contacts.stage), deal_value = COALESCE($10, contacts.deal_value), notes = COALESCE($11, contacts.notes), tags = COALESCE($12, contacts.tags), updated_at = NOW() RETURNING *`, [email, first_name, last_name, company, title, phone, linkedin_url, source || 'manual', stage || 'new', deal_value || 3000, notes, tags]);
    if (stage) { await db.query('INSERT INTO activities (contact_id, type, subject) VALUES ($1, $2, $3)', [rows[0].id, 'stage_change', 'Stage -> ' + stage]); }
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.patch('/contact/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;
    const { rows } = await db.query('UPDATE contacts SET stage=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [stage, req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Contact not found' });
    await db.query('INSERT INTO activities (contact_id, type, subject) VALUES ($1, $2, $3)', [req.params.id, 'stage_change', 'Stage -> ' + stage]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
module.exports = router;
