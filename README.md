# Aagontuk Express

A quiet anonymous chat web app themed around a Bangladesh night-train platform.
Built with Node.js, Express, Socket.IO.

---

## Project Structure

```
aagontuk-express/
├── server.js              ← Backend (Express + Socket.IO)
├── package.json
├── .env.example           ← Copy to .env and configure
├── .gitignore
├── data/                  ← Auto-created on first run (JSON storage)
│   ├── users.json
│   ├── confessions.json
│   ├── reports.json
│   ├── logs.json
│   └── settings.json
└── public/                ← All frontend files (served statically)
    ├── index.html         ← Main app
    ├── auth.html          ← Login / Register
    └── music/             ← Place your 4 MP3 tracks here
        ├── aces.mp3
        ├── escape.mp3
        ├── heartheal.mp3
        └── love.mp3
```

---

## Requirements

- Node.js **v16 or higher** — download from https://nodejs.org
- npm (comes with Node.js)

---

## Setup & Run (Step by Step)

### 1. Download / clone the project

Place all files in a folder, e.g. `aagontuk-express/`.

### 2. Add your music files

Create the folder `public/music/` and add your 4 MP3 tracks:
```
public/music/aces.mp3
public/music/escape.mp3
public/music/heartheal.mp3
public/music/love.mp3
```

### 3. Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This installs: express, express-session, bcryptjs, socket.io.

### 4. Configure environment (optional)

```bash
cp .env.example .env
```

Edit `.env` and set a `SESSION_SECRET` (any long random string).

### 5. Start the server

```bash
node server.js
```

Or for auto-restart during development:
```bash
npm run dev
```

### 6. Open the app

Visit in your browser:
```
http://localhost:3000
```

You'll be taken to the login/register page first.
**The first account you create automatically becomes Admin.**

---

## Admin Access

- The **first registered user** is the admin.
- Once logged in as admin, you'll see a **Control Room** button in the header.
- From there you can: manage reports, toggle ads, edit creator profile & about text.

---

## Time System

The app uses **Bangladesh Time (UTC+6)**:

| Time | Status |
|------|--------|
| 05:00 – 17:00 | Platform Resting |
| 17:00 – 19:00 | Preparing to Board |
| 19:00 – 05:00 | **Boarding Now** (stranger chat open) |

---

## Real-time Stranger Matching

The stranger chat uses **Socket.IO** for real-time matching.
- Two users clicking "Board Stranger" at the same time get matched into a private room.
- All messages stay in that session only — nothing is stored.
- When either user clicks "End Journey", the session closes.

---

## Google Login (Optional)

To enable "Continue with Google":

1. Go to https://console.cloud.google.com
2. Create a project → Enable Google OAuth API
3. Create OAuth credentials, set callback URL to `http://localhost:3000/auth/google/callback`
4. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
5. Install passport:
   ```bash
   npm install passport passport-google-oauth20
   ```
6. Uncomment and configure the Google OAuth section in `server.js`.

---

## Deploy to Production

**Render (free tier):**
1. Push to GitHub
2. New Web Service on render.com → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables in Render dashboard

**Railway:**
1. `railway init` → `railway up`

**VPS (DigitalOcean / Hetzner):**
```bash
npm install -g pm2
pm2 start server.js --name aagontuk
pm2 save
```

---

## Notes

- Data is stored as JSON files in `data/`. For production, consider replacing with MongoDB or PostgreSQL.
- No music files are included — add your own MP3s to `public/music/`.
- The app works fully offline (without backend) in demo mode — the frontend falls back to localStorage for confessions and logs.
