const axios = require('axios');
const db = require('../utils/db');

const API_KEY = process.env.INSTANTLY_API_KEY;
const BASE = 'https://api.instantly.ai/api/v1';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
});

module.exports = {
  async getCampaigns() {
    const { data } = await api.get('/campaign/list', { params: { api_key: API_KEY } });
    // Store snapshots
    for (const c of (data || [])) {
      await db.query(`
        INSERT INTO instantly_campaigns (campaign_id, name, status, stats, fetched_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (campaign_id)
        DO UPDATE SET name=$2, status=$3, stats=$4, fetched_at=NOW()
      `, [c.id, c.name, c.status, JSON.stringify(c)]);
    }
    return data;
  },

  async getCampaignStats(campaignId) {
    const { data } = await api.get('/analytics/campaign/summary', {
      params: { api_key: API_KEY, campaign_id: campaignId }
    });
    return data;
  },

  async getLeads(campaignId, limit = 100) {
    const params = { api_key: API_KEY, limit };
    if (campaignId) params.campaign_id = campaignId;
    const { data } = await api.get('/lead/list', { params });
    return data;
  },

  async getAnalytics() {
    const { data } = await api.get('/analytics/campaign/summary', {
      params: { api_key: API_KEY }
    });
    return data;
  }
};