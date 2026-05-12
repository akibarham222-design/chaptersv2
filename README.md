# Chapters
### *Strangers pass. Conversations stay.*

An anonymous real-time chat app where every conversation is saved as a chapter in your personal anthology. No names. No profiles. Just words — and a 30-word limit per message.

---

## Concept

Inspired by *84 Charing Cross Road*, *Before Sunrise*, and the idea that the most honest conversations happen between strangers — **Chapters** treats every anonymous chat as a page in a book you're writing without knowing it.

You talk. They leave. But the conversation becomes **Chapter I, II, III...** in your collection. Forever.

---

## Stack

- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite (via `better-sqlite3`) — zero config, file-based
- **Frontend**: Vanilla JS SPA — no framework needed
- **Realtime**: Socket.io for matchmaking, messaging, typing indicators

---

## Features

- 🎲 **Anonymous matchmaking** — paired with a random stranger instantly
- 📖 **Chapter history** — every conversation saved with Roman numeral chapters
- ✍️ **30-word limit** — forces deliberate, meaningful messages
- ⌨️ **Typing indicators** — live presence
- 👋 **Stranger disconnect detection** — graceful handling
- 📱 **Responsive** — works on mobile and desktop
- 🗄️ **Persistent sessions** — your chapters survive page refreshes

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
open http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

---

## Project Structure

```
chapters/
├── server.js          # Express + Socket.io backend
├── package.json
├── chapters.db        # SQLite database (auto-created on first run)
└── public/
    └── index.html     # Full SPA frontend
```

---

## Deployment (Railway / Render / Fly.io)

The app is ready to deploy on any Node.js host.

**Environment variables:**
```
PORT=3000   # optional, defaults to 3000
```

**On Railway:**
1. Push to GitHub
2. Connect repo to Railway
3. Deploy — it auto-detects Node.js

**On Render:**
- Build command: `npm install`
- Start command: `npm start`

---

## Database Schema

```sql
sessions       — persistent anonymous user identities
conversations  — matched chat sessions with chapter numbers per user
messages       — all messages with timestamps and sender identity
```

---

## Roadmap Ideas

- 🌙 Time-gated mode (only open midnight–4am)
- 🏷️ Topic rooms (music, books, 3am thoughts)
- 📤 Share a chapter (read-only link)
- 🌍 Language filter
- ⭐ Star / bookmark a chapter

---

*"The most important things are the hardest to say."* — Stephen King
