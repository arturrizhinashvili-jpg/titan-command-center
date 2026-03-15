require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./db');

const migration = `
CREATE TABLE IF NOT EXISTS contacts (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE, first_name VARCHAR(100), last_name VARCHAR(100), company VARCHAR(255), title VARCHAR(255), phone VARCHAR(50), linkedin_url TEXT, source VARCHAR(50) DEFAULT 'manual', stage VARCHAR(50) DEFAULT 'new', deal_value NUMERIC(10,2) DEFAULT 3000.00, notes TEXT, tags TEXT[], created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS activities (id SERIAL PRIMARY KEY, contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE, type VARCHAR(50) NOT NULL, subject TEXT, body TEXT, metadata JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS instantly_campaigns (id SERIAL PRIMARY KEY, campaign_id VARCHAR(255) UNIQUE, name VARCHAR(255), status VARCHAR(50), stats JSONB DEFAULT '{}', fetched_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS fathom_calls (id SERIAL PRIMARY KEY, contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL, fathom_id VARCHAR(255) UNIQUE, title TEXT, summary TEXT, transcript TEXT, recording_url TEXT, call_date TIMESTAMPTZ, duration_sec INTEGER, fetched_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS predictions (id SERIAL PRIMARY KEY, contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE, close_likelihood NUMERIC(5,2), best_follow_up TEXT, reasoning TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS forecasts (id SERIAL PRIMARY KEY, week_start DATE, total_pipeline NUMERIC(12,2), weighted_forecast NUMERIC(12,2), insights TEXT, underperforming_campaigns JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS oauth_tokens (id SERIAL PRIMARY KEY, provider VARCHAR(50) DEFAULT 'google', email VARCHAR(255), access_token TEXT, refresh_token TEXT, expiry_date BIGINT, updated_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE (provider, email));
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(stage);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_predictions_contact ON predictions(contact_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_week ON forecasts(week_start);
`;

async function migrate() {
  console.log('[MIGRATE] Running migrations...');
  try { await db.query(migration); console.log('[MIGRATE] All tables created'); process.exit(0); }
  catch (err) { console.error('[MIGRATE] Failed:', err.message); process.exit(1); }
}
migrate();
