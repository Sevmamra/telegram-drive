// backend/index.js
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// file upload setup
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// db.json path
const DB_PATH = path.join(__dirname, 'db.json');
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ files: [] }, null, 2));

// helper: read/write db
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH));
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---------- ROUTES ----------

// test route
app.get('/', (req, res) => {
  res.json({ ok: true, msg: 'Backend is running!' });
});

// list files
app.get('/api/files', (req, res) => {
  const db = readDB();
  res.json({ files: db.files });
});

// download file (redirect to Telegram)
app.get('/api/download/:id', async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const file = db.files.find(f => f.id === id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  // direct link from Telegram
  try {
    const info = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file.file_id}`);
    const filePath = info.data.result.file_path;
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
    res.redirect(url);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch file from Telegram' });
  }
});

// upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { filename, caption } = req.body;
    const filePath = req.file.path;

    // send to telegram
    const formData = new (require('form-data'))();
    formData.append('chat_id', CHANNEL_ID);
    formData.append('document', fs.createReadStream(filePath), { filename });
    if (caption) formData.append('caption', caption);

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
      formData,
      { headers: formData.getHeaders() }
    );

    // cleanup local file
    fs.unlinkSync(filePath);

    const fileData = response.data.result.document;
    const id = nanoid();

    const db = readDB();
    db.files.push({
      id,
      file_id: fileData.file_id,
      file_unique_id: fileData.file_unique_id,
      file_name: filename,
      caption,
      uploaded_at: Date.now(),
    });
    writeDB(db);

    res.json({ success: true, id });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
