const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const db = require('../utils/db');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runPredictions() {
  console.log('[PREDICTIONS] Starting daily analysis...');

  // Gather all active pipeline contacts with activities
  const { rows: contacts } = await db.query(`
    SELECT c.*,
      (SELECT json_agg(a ORDER BY a.created_at DESC) FROM activities a WHERE a.contact_id = c.id) as activities
    FROM contacts c
    WHERE c.stage NOT IN ('closed_won', 'closed_lost')
    ORDER BY c.updated_at DESC
    LIMIT 100
  `);

  // Gather campaign data
  const { rows: campaigns } = await db.query('SELECT * FROM instantly_campaigns ORDER BY fetched_at DESC');

  if (!contacts.length) {
    console.log('[PREDICTIONS] No active contacts to analyze');
    return;
  }

  // Build context for Claude
  const pipelineSummary = contacts.map(c => ({
    id: c.id,
    name: `${c.first_name} ${c.last_name}`.trim(),
    company: c.company,
    stage: c.stage,
    deal_value: c.deal_value,
    source: c.source,
    days_in_pipeline: Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000),
    last_activity: c.activities?.[0]?.created_at || c.updated_at,
    activity_count: c.activities?.length || 0,
    recent_activities: (c.activities || []).slice(0, 5).map(a => ({ type: a.type, subject: a.subject, date: a.created_at }))
  }));

  const campaignSummary = campaigns.map(c => ({
    name: c.name,
    status: c.status,
    stats: c.stats
  }));

  const prompt = `You are an AI sales analyst for Titan Outbound, an MCA (Merchant Cash Advance) lead generation agency.
Deal value per contact: $3,000.

Analyze this pipeline and campaign data, then return a JSON response with:

1. "contact_predictions" — for each contact, provide:
   - "contact_id": number
   - "close_likelihood": 0-100 percentage
   - "best_follow_up": specific recommended next action with timing
   - "reasoning": brief explanation

2. "weekly_forecast" — provide:
   - "total_pipeline": total $ value of all active deals
   - "weighted_forecast": probability-weighted expected revenue
   - "insights": 2-3 key insights about the pipeline

3. "underperforming_campaigns" — list campaigns performing below average with:
   - "name": campaign name
   - "issue": what's wrong
   - "recommendation": fix suggestion

PIPELINE DATA:
${JSON.stringify(pipelineSummary, null, 2)}

CAMPAIGN DATA:
${JSON.stringify(campaignSummary, null, 2)}

Return ONLY valid JSON, no markdown or explanation.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');
    
    const analysis = JSON.parse(jsonMatch[0]);

    // Store contact predictions
    for (const pred of (analysis.contact_predictions || [])) {
      await db.query(`
        INSERT INTO predictions (contact_id, close_likelihood, best_follow_up, reasoning)
        VALUES ($1, $2, $3, $4)
      `, [pred.contact_id, pred.close_likelihood, pred.best_follow_up, pred.reasoning]);
    }

    // Store forecast
    if (analysis.weekly_forecast) {
      const wf = analysis.weekly_forecast;
      await db.query(`
        INSERT INTO forecasts (week_start, total_pipeline, weighted_forecast, insights, underperforming_campaigns)
        VALUES (DATE_TRUNC('week', NOW()), $1, $2, $3, $4)
      `, [
        wf.total_pipeline || 0,
        wf.weighted_forecast || 0,
        wf.insights || '',
        JSON.stringify(analysis.underperforming_campaigns || [])
      ]);
    }

    console.log(`[PREDICTIONS] Stored predictions for ${(analysis.contact_predictions || []).length} contacts`);
    return analysis;
  } catch (err) {
    console.error('[PREDICTIONS] Claude API error:', err.message);
    throw err;
  }
}

module.exports = { runPredictions };