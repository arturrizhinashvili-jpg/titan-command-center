const axios = require('axios');
const db = require('../utils/db');

async function getTokens() {
  const { rows } = await db.query(
    `SELECT * FROM oauth_tokens WHERE provider='google' ORDER BY updated_at DESC LIMIT 1`
  );
  if (!rows.length) throw new Error('No Google OAuth tokens found. Visit /auth/google to connect.');
  return rows[0];
}

async function refreshIfNeeded(tokens) {
  if (Date.now() < tokens.expiry_date - 60000) return tokens.access_token;
  
  const { data } = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token'
  });
  
  await db.query(
    `UPDATE oauth_tokens SET access_token=$1, expiry_date=$2, updated_at=NOW() WHERE id=$3`,
    [data.access_token, Date.now() + data.expires_in * 1000, tokens.id]
  );
  return data.access_token;
}

async function getAccessToken() {
  const tokens = await getTokens();
  return refreshIfNeeded(tokens);
}

module.exports = {
  // Gmail
  async getInbox(maxResults = 20) {
    const token = await getAccessToken();
    const { data } = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${token}` },
      params: { maxResults, q: 'in:inbox' }
    });
    
    const messages = [];
    for (const msg of (data.messages || []).slice(0, maxResults)) {
      const { data: detail } = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        { headers: { Authorization: `Bearer ${token}` }, params: { format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] } }
      );
      const headers = {};
      (detail.payload?.headers || []).forEach(h => { headers[h.name] = h.value; });
      messages.push({
        id: msg.id,
        threadId: msg.threadId,
        from: headers.From,
        subject: headers.Subject,
        date: headers.Date,
        snippet: detail.snippet
      });
    }
    return messages;
  },

  async sendEmail(to, subject, body) {
    const token = await getAccessToken();
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const { data } = await axios.post(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      { raw },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return data;
  },

  // Calendar
  async getUpcomingEvents(days = 7) {
    const token = await getAccessToken();
    const now = new Date().toISOString();
    const future = new Date(Date.now() + days * 86400000).toISOString();
    
    const { data } = await axios.get(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { timeMin: now, timeMax: future, singleEvents: true, orderBy: 'startTime', maxResults: 50 }
      }
    );
    return (data.items || []).map(e => ({
      id: e.id,
      summary: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      attendees: (e.attendees || []).map(a => ({ email: a.email, name: a.displayName, status: a.responseStatus })),
      meetLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri,
      location: e.location
    }));
  }
};