/**
 * dynamic-songs.js — generates an artist suggestion pool from a playlist name.
 *
 * Priority chain:
 *   1. Claude AI (Anthropic API) — playlist name → 50 likely artists
 *   2. iTunes search — keyword search from playlist name words → up to 50 artists
 *   3. Static fallback pool — 50 generic popular artists
 *
 * Genre-based Last.fm fetching is retired. Pool is now playlist-name-driven
 * and stored on room.artistPool at creation time, like the old genre pool was.
 *
 * Song mode retired — only artist pools are generated.
 */

const https = require('https');

// ── Static fallback pool ──────────────────────────────────────────────────────
// Used when both AI and iTunes fail. Broad cross-genre mix.
const FALLBACK_ARTISTS = [
  'Taylor Swift', 'Drake', 'Beyoncé', 'Kendrick Lamar', 'Billie Eilish',
  'The Weeknd', 'Ariana Grande', 'Post Malone', 'Dua Lipa', 'Bad Bunny',
  'Ed Sheeran', 'Olivia Rodrigo', 'Harry Styles', 'SZA', 'Travis Scott',
  'Doja Cat', 'Justin Bieber', 'Rihanna', 'Bruno Mars', 'Lady Gaga',
  'Adele', 'Lizzo', 'Lil Nas X', 'Cardi B', 'Khalid',
  'Halsey', 'The Kid LAROI', 'Juice WRLD', 'Polo G', 'Rod Wave',
  'Morgan Wallen', 'Luke Combs', 'Zach Bryan', 'Chris Stapleton', 'Carrie Underwood',
  'Foo Fighters', 'Imagine Dragons', 'Twenty One Pilots', 'Coldplay', 'Radiohead',
  'Frank Ocean', 'Tyler the Creator', 'J. Cole', 'Nicki Minaj', 'Future',
  'Lil Baby', 'Gunna', 'Young Thug', 'NBA YoungBoy', 'Jack Harlow',
].map(name => ({ name }));

// ── HTTP helper ───────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'PandoraBingo/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('JSON parse error')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── iTunes artist search ──────────────────────────────────────────────────────
// Extracts meaningful words from the playlist name, searches iTunes for artists,
// deduplicates, and returns up to 50 { name } objects.

async function fetchArtistsFromiTunes(playlistName) {
  // Pull meaningful words (4+ chars, skip common filler words)
  const stopWords = new Set(['with', 'that', 'this', 'from', 'have', 'will', 'your', 'they', 'been', 'were', 'their', 'what', 'when', 'which', 'also', 'into', 'more', 'most', 'some', 'such', 'than', 'then', 'them', 'these', 'those', 'very', 'just', 'only', 'best', 'good', 'like', 'know', 'time', 'year', 'here', 'make', 'made', 'about', 'over', 'back', 'after', 'playlist', 'music', 'songs', 'mix', 'hits', 'vibes', 'bingo']);
  const words = playlistName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w));

  if (!words.length) return null;

  // Use the full playlist name as the primary query, then individual words as fallbacks
  const queries = [playlistName, ...words].slice(0, 4);
  const seen = new Set();
  const artists = [];

  for (const q of queries) {
    if (artists.length >= 50) break;
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicArtist&limit=25&media=music`;
      const data = await httpsGet(url);
      for (const a of (data.results || [])) {
        if (!a.artistName) continue;
        const key = a.artistName.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          artists.push({ name: a.artistName, id: String(a.artistId) });
        }
        if (artists.length >= 50) break;
      }
    } catch (e) {
      console.warn('[dynamic-songs] iTunes query failed for:', q, e.message);
    }
  }

  return artists.length >= 5 ? artists : null;
}

// ── Claude AI artist generation ───────────────────────────────────────────────
// Calls the Anthropic API with the playlist name and asks for 50 likely artists.
// Returns array of { name } or null on failure.

async function fetchArtistsFromAI(playlistName) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are helping generate artist suggestions for a music bingo game. The host's playlist is called: "${playlistName}".

List exactly 50 artists who are likely to appear in this playlist. Consider the name carefully — it may hint at a genre, era, mood, or theme.

Respond with ONLY a JSON array of artist name strings, no explanation, no markdown, no extra text. Example format:
["Artist One", "Artist Two", "Artist Three"]`;

  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.content?.[0]?.text || '';
          // Strip any markdown fences just in case
          const clean = text.replace(/```[a-z]*\n?/g, '').trim();
          const names = JSON.parse(clean);
          if (Array.isArray(names) && names.length >= 5) {
            resolve(names.slice(0, 50).map(n => ({ name: String(n) })));
          } else {
            resolve(null);
          }
        } catch (e) {
          console.warn('[dynamic-songs] AI parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.warn('[dynamic-songs] AI request error:', e.message);
      resolve(null);
    });
    req.setTimeout(12000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns { artists } for the given playlist name.
 * Priority: AI → iTunes → static fallback.
 * songs array is always empty (song mode retired).
 */
async function getDynamicPool(playlistName) {
  if (!playlistName || !playlistName.trim()) {
    return { songs: [], artists: FALLBACK_ARTISTS };
  }

  // 1. Try AI first
  try {
    const aiArtists = await fetchArtistsFromAI(playlistName);
    if (aiArtists && aiArtists.length >= 5) {
      console.log(`[dynamic-songs] AI pool generated for "${playlistName}": ${aiArtists.length} artists`);
      return { songs: [], artists: aiArtists };
    }
  } catch (e) {
    console.warn('[dynamic-songs] AI pool failed:', e.message);
  }

  // 2. iTunes fallback
  try {
    const itunesArtists = await fetchArtistsFromiTunes(playlistName);
    if (itunesArtists && itunesArtists.length >= 5) {
      console.log(`[dynamic-songs] iTunes pool generated for "${playlistName}": ${itunesArtists.length} artists`);
      return { songs: [], artists: itunesArtists };
    }
  } catch (e) {
    console.warn('[dynamic-songs] iTunes pool failed:', e.message);
  }

  // 3. Static fallback
  console.log(`[dynamic-songs] Using static fallback pool for "${playlistName}"`);
  return { songs: [], artists: FALLBACK_ARTISTS };
}

module.exports = { getDynamicPool };
