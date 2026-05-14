Aagontuk Express clean rebuild v2

Replace:
public/index.html
public/auth.html
public/assets/hero-night.svg
public/assets/hero-day.svg
public/assets/hero-dusk.svg

Do NOT replace:
server.js
public/music/*

Expected local MP3 files:
public/music/aces.mp3
public/music/escape.mp3
public/music/heartheal.mp3
public/music/love.mp3

Important:
1. Background audio cannot autoplay before a user click because browsers block autoplay. User must press Play Background Music or a track Play button once.
2. Real Instagram-style live Spotify catalog search requires Spotify API credentials and a backend token endpoint. This build includes a searchable picker structure and Spotify redirect behavior.
3. Confessions are restored as From / To / Message / Song selector.
