require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const cron = require('node-cron');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(cors({ origin: [process.env.FRONTEND_URL, 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET || 'titan-dev-secret', resave: false, saveUninitialized: false, cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 } }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

require('./middleware/passport')(passport);

app.use('/auth', require('./routes/auth'));
app.use('/api/instantly', require('./routes/instantly'));
app.use('/api/gmail', require('./routes/gmail'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/fathom', require('./routes/fathom'));
app.use('/api/calendly', require('./routes/calendly'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/predictions', require('./routes/predictions'));

app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

const { runPredictions } = require('./services/predictions');
cron.schedule('0 6 * * *', async () => {
  console.log('[CRON] Running daily AI predictions...');
  try { await runPredictions(); console.log('[CRON] Predictions complete'); }
  catch (err) { console.error('[CRON] Predictions failed:', err.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('Titan Command Center running on port ' + PORT); });
