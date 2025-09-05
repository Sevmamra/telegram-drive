# Telegram Drive — Demo

A minimal demo: frontend uploads files to a local backend which forwards them to a private Telegram channel via a bot.

## Quick setup (local dev)

1. Create a Telegram Bot with @BotFather and get BOT_TOKEN.
2. Create a private channel, add the bot as admin, get CHANNEL_ID.
3. Copy `.env.example` ➜ `.env` and fill BOT_TOKEN, CHANNEL_ID, ADMIN_TOKEN.
4. Backend (local):cd backend
npm install
npm start
5. Open `index.html` in browser (or serve via a static server). Update `API_BASE` in `app.js` to point to your backend (http://localhost:3000/api).

## Deploy
- Frontend: GitHub Pages (host static files).
- Backend: We will adapt for Vercel or other hosting later (note: Vercel has request size limits — we'll discuss).
