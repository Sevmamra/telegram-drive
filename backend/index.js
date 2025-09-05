// index.js — Simple Express backend that uploads files to Telegram channel and keeps metadata in db.json
const express = require('express');
const multer  = require('multer');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const { nanoid } = require('nanoid');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN || '<PUT_YOUR_BOT_TOKEN_HERE>';
const CHANNEL_ID = process.env.CHANNEL_ID || '<PUT_YOUR_CHANNEL_ID_HERE>'; // e.g. -1001234567890
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'my-secret-token'; // simple auth for demo

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error('ERROR: Set BOT_TOKEN and CHANNEL_ID environment variables.');
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const app = express();
app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: 'uploads/' });

// Simple JSON DB
const DB_FILE = path.join(__dirname, 'db.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ files: [] }, null, 2));
function readDB(){ return JSON.parse(fs.readFileSync(DB_FILE)); }
function writeDB(data){ fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

// Middleware: simple token auth for POST (demo only)
function requireAuth(req, res, next){
  const token = req.headers['x-admin-token'];
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Upload endpoint — sends file to Telegram channel
app.post('/api/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const originalName = req.body.filename || req.file.originalname || req.file.filename;
    const caption = req.body.caption || '';

    // Send file to Telegram using multipart/form-data (sendDocument)
    // We stream the local file
    const formData = new require('form-data')();
    formData.append('chat_id', CHANNEL_ID);
    formData.append('caption', caption);
    formData.append('document', fs.createReadStream(req.file.path), { filename: originalName });

    const sendResp = await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    // cleanup uploaded temp file
    fs.unlinkSync(req.file.path);

    if (!sendResp.data || !sendResp.data.ok) {
      return res.status(500).json({ error: 'Telegram upload failed', detail: sendResp.data });
    }

    const message = sendResp.data.result;
    const fileId = message.document.file_id;
    const msgId = message.message_id;
    const date = message.date;

    // Save metadata to DB
    const db = readDB();
    const entry = {
      id: nanoid(),
      file_name: originalName,
      caption,
      telegram_file_id: fileId,
      telegram_message_id: msgId,
      date,
      uploaded_at: new Date().toISOString()
    };
    db.files.unshift(entry);
    writeDB(db);

    res.json({ ok: true, file: entry });
  } catch (err) {
    console.error(err.response ? err.response.data : err);
    res.status(500).json({ error: 'Upload error', detail: err.message || err });
  }
});

// List files
app.get('/api/files', (req, res) => {
  const db = readDB();
  res.json({ files: db.files });
});

// Get direct download link for a telegram file_id
// This endpoint will resolve file_id -> file_path -> actual download URL and send to client
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const db = readDB();
    const entry = db.files.find(f => f.id === fileId || f.telegram_file_id === fileId);
    if (!entry) return res.status(404).json({ error: 'Not found' });

    // getFile to obtain file_path
    const gf = await axios.get(`${TELEGRAM_API}/getFile`, { params: { file_id: entry.telegram_file_id }});
    if (!gf.data.ok) return res.status(500).json({ error: 'getFile failed', detail: gf.data });

    const file_path = gf.data.result.file_path; // e.g. document/file_1234.dat
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`;
    // For convenience, redirect to fileUrl
    return res.redirect(fileUrl);
  } catch (err) {
    console.error(err.response ? err.response.data : err);
    res.status(500).json({ error: 'download error', detail: err.message || err });
  }
});

// Simple health
app.get('/', (req, res) => res.send('Telegram Drive Demo backend is running.'));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
