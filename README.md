# Aagontuk Express — Terminal Noir Flat Build

One Render Web Service build. No frontend/backend split.

Render settings:
- Root Directory: empty
- Build Command: `rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps --registry=https://registry.npmjs.org`
- Start Command: `node server.js`

Required env:
- MONGO_URI
- JWT_SECRET
- NODE_ENV=production
- FRONTEND_URL=https://aagontuk.onrender.com
- GOOGLE_CALLBACK_URL=https://aagontuk.onrender.com/api/auth/google/callback
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
