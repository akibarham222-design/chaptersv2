# Aagontuk Express — One Service Flat Render Build

This package has no frontend/backend split. It is meant to run as one Render Web Service.

## Structure

```
server.js
package.json
public/          # built React frontend
config/
models/
middleware/
routes/
socket/
uploads/
```

## Render settings

Root Directory: empty

Build Command:
```bash
rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps --registry=https://registry.npmjs.org
```

Start Command:
```bash
node server.js
```

## Required environment variables

```env
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
NODE_ENV=production
FRONTEND_URL=https://aagontuk.onrender.com
GOOGLE_CALLBACK_URL=https://aagontuk.onrender.com/api/auth/google/callback
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```
