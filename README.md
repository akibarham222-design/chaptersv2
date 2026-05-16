# Aagontuk Express — Flat One-Service Build

Single Render Web Service build.

## Game update
- Chat now has 4 games: Tic-Tac-Toe, Connect Four, Four Line, Rock Paper Scissors.
- Word Guess removed from chat invites.
- Games auto-close after completion and conversation stays alive.
- Chat margins/padding tightened for a cleaner compartment feel.

## Render
Root Directory: empty
Build Command: rm -f package-lock.json && npm install --omit=dev --no-audit --no-fund --legacy-peer-deps --registry=https://registry.npmjs.org
Start Command: node server.js
