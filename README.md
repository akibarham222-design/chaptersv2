# Aagontuk Express — Final Fixed Build

This package contains the repaired full-stack build.

## What was fixed

- Corrected frontend Vite structure: `index.html`, `src/pages`, `src/components`, `src/context`, `src/utils`.
- Added missing pages: `Admin`, `Moderator`, `JourneyLogs`, `About`, `NotFound`.
- Corrected backend structure: `config`, `models`, `middleware`, `routes`, `socket`.
- Preserved the working original theme, chat, confession, music, login, and game code.
- Fixed admin frontend access route by adding a real Control Room page.
- Added direct device upload controls for songs and images in Admin.
- Fixed uploaded music playback for separate frontend/backend Render deployments.
- Added moderator panel for reports and confession approval.
- Improved stranger report payload with partner socket ID.
- Verified frontend production build successfully.
- Verified backend JavaScript syntax successfully.

## Frontend commands

```bash
cd frontend
npm install
npm run dev
npm run build
```

## Backend commands

```bash
cd backend
npm install
npm start
```

## Required backend `.env`

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=make_this_long_and_private
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## Required frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

For Render, replace localhost URLs with deployed frontend/backend URLs.

## Admin account

The admin email is hardcoded as:

```txt
n.i.farhan44@gmail.com
```

Logging in with this email through Google or password login will force admin role on the backend.
