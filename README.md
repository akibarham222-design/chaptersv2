# Aagontuk Express — Final Flat Render Build

Single Render Web Service build. No separate frontend/backend service.

## Render
Root Directory: empty
Build Command:
rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps --registry=https://registry.npmjs.org

Start Command:
node server.js

## Fixes in this version
- Creator bio preserves line breaks.
- Song upload limit raised to 250MB and returns exact backend error.
- Layout made cleaner, lighter, and less text-heavy.
- About remains the main explanation page.
- Same URL serves frontend, API, uploads, and socket.


## Moonline UI build
- Replaced Night Service copy with Moonline language.
- Reduced explanatory text outside About.
- Added premium terminal-style visual polish via bundled CSS.
- Kept flat one-service Render deployment.
