const router = require('express').Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const db = require('../utils/db');
const upload = multer({ dest: '/tmp/uploads/', limits: { fileSize: 10 * 1024 * 1024 } });
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const results = []; const errors = []; let imported = 0;
  try {
    await new Promise((resolve, reject) => { fs.createReadStream(req.file.path).pipe(csv()).on('data', (row) => results.push(row)).on('end', resolve).on('error', reject); });
    for (const row of results) {
      try {
        const email = row.email || row.Email || row['Email Address'] || '';
        const firstName = row.first_name || row['First Name'] || row.firstName || '';
        const lastName = row.last_name || row['Last Name'] || row.lastName || '';
        const company = row.company || row.Company || row['Company Name'] || '';
        const title = row.title || row.Title || row['Job Title'] || '';
        const phone = row.phone || row.Phone || row['Phone Number'] || '';
        const linkedin = row.linkedin_url || row['LinkedIn URL'] || row['Person Linkedin Url'] || '';
        if (!email && !firstName) continue;
        await db.query(`INSERT INTO contacts (email, first_name, last_name, company, title, phone, linkedin_url, source, stage) VALUES ($1, $2, $3, $4, $5, $6, $7, 'linkedin_csv', 'new') ON CONFLICT (email) DO UPDATE SET company = COALESCE(NULLIF($4, ''), contacts.company), title = COALESCE(NULLIF($5, ''), contacts.title), phone = COALESCE(NULLIF($6, ''), contacts.phone), linkedin_url = COALESCE(NULLIF($7, ''), contacts.linkedin_url), updated_at = NOW()`, [email || firstName+'.'+lastName+'@unknown.com', firstName, lastName, company, title, phone, linkedin]);
        imported++;
      } catch (err) { errors.push({ row: row.email || row['First Name'], error: err.message }); }
    }
    fs.unlink(req.file.path, () => {});
    res.json({ success: true, imported, total: results.length, errors: errors.length, errorDetails: errors.slice(0, 10) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
module.exports = router;
