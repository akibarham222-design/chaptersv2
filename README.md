# Aagontuk Express — flat one-service upgraded build

Single Render Web Service build. No frontend/backend split.

## Structure
- `server.js`
- `public/` built React frontend
- `routes/`, `models/`, `middleware/`, `socket/`, `config/`

## Render settings
Root Directory: empty
Build Command:
rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps --registry=https://registry.npmjs.org

Start Command:
node server.js

## Environment
MONGO_URI=...
JWT_SECRET=...
NODE_ENV=production
FRONTEND_URL=https://aagontuk.onrender.com
GOOGLE_CALLBACK_URL=https://aagontuk.onrender.com/api/auth/google/callback
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

## Changes
- Cleaner lighter layout cards.
- About page has Creator Carriage.
- Creator section editable from Control Room.
- Admin song/image uploads show live percentage progress.
- Chat games now have a close button that clears game overlay without ending conversation.
