const router = require('express').Router();
const db = require('../utils/db');
router.post('/webhook', async (req, res) => {
  try {
    const { event, payload } = req.body;
    console.log('[CALENDLY] Webhook received:', event);
    if (event === 'invitee.created') {
      const invitee = payload?.invitee || payload;
      const email = invitee.email;
      const name = (invitee.name || '').split(' ');
      const firstName = name[0] || '';
      const lastName = name.slice(1).join(' ') || '';
      const { rows } = await db.query(`INSERT INTO contacts (email, first_name, last_name, source, stage, notes, created_at) VALUES ($1, $2, $3, 'calendly', 'booked', $4, NOW()) ON CONFLICT (email) DO UPDATE SET stage = CASE WHEN contacts.stage IN ('new', 'contacted', 'replied') THEN 'booked' ELSE contacts.stage END, updated_at = NOW() RETURNING id`, [email, firstName, lastName, 'Booked via Calendly: ' + (payload?.event_type?.name || 'Meeting')]);
      await db.query('INSERT INTO activities (contact_id, type, subject, metadata) VALUES ($1, $2, $3, $4)', [rows[0].id, 'meeting', 'Calendly Booking: ' + (payload?.event_type?.name || 'Meeting'), JSON.stringify({ calendly_event: payload?.event?.uri, scheduled_at: payload?.event?.start_time })]);
    }
    if (event === 'invitee.canceled') {
      const email = payload?.invitee?.email || payload?.email;
      if (email) { await db.query("UPDATE contacts SET notes = CONCAT(notes, E'\\n[Calendly cancellation]'), updated_at=NOW() WHERE email=$1", [email]); }
    }
    res.status(200).json({ received: true });
  } catch (err) { res.status(200).json({ received: true, error: err.message }); }
});
module.exports = router;
