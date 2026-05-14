Aagontuk Express — Burnt Ticket Night full rebuild

Replace these files in your repo:
- server.js
- public/index.html
- public/auth.html
- public/assets/platform-bg.svg

Do not replace or delete:
- public/music/*

Expected onboard radio files:
- public/music/aces.mp3
- public/music/escape.mp3
- public/music/heartheal.mp3
- public/music/love.mp3

What changed:
- Burnt Ticket Night visual system
- Ticket Counter login page
- same login for all users
- admin automatically detected by n.i.farhan44@gmail.com / ADMIN_EMAIL env
- admin can add moderators by email
- Station Confessions public searchable wall
- confession song picker uses iTunes Search API live
- selected song stores title/artist/artwork/preview/Apple link/Spotify search link
- Onboard Radio uses existing 4 local music files
- Table Game visible only inside chat
- Boarding Pass waiting screen instead of spinner
- Control Room inside app

Push commands:
cd C:\Users\Pedp4WPBX4125BLF0924\chaptersv2
git add server.js public/index.html public/auth.html public/assets/platform-bg.svg
git commit -m "rebuild Aagontuk Express burnt ticket night"
git pull --rebase origin main
git push origin main
