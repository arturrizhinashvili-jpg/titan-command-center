const axios = require('axios');
const db = require('../utils/db');

const api = axios.create({
  baseURL: 'https://api.fathom.video/v1',
  timeout: 15000
});

function headers() {
  return { Authorization: `Bearer ${process.env.FATHOM_API_KEY}` };
}

module.exports = {
  async getCalls(limit = 20) {
    const { data } = await api.get('/calls', {
      headers: headers(),
      params: { limit }
    });
    return data;
  },

  async getCallDetail(callId) {
    const { data } = await api.get(`/calls/${callId}`, { headers: headers() });
    return data;
  },

  async syncCalls() {
    const calls = await this.getCalls(50);
    for (const call of (calls.data || calls || [])) {
      const detail = await this.getCallDetail(call.id).catch(() => null);
      await db.query(`
        INSERT INTO fathom_calls (fathom_id, title, summary, transcript, recording_url, call_date, duration_sec, fetched_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (fathom_id) DO UPDATE SET
          summary=$3, transcript=$4, recording_url=$5, fetched_at=NOW()
      `, [
        call.id,
        call.title || 'Untitled Call',
        detail?.summary || call.summary || '',
        detail?.transcript || '',
        call.recording_url || detail?.recording_url || '',
        call.created_at || call.date,
        call.duration || detail?.duration || 0
      ]);
    }
    return calls;
  }
};