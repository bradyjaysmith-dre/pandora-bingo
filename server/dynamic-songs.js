/**
 * dynamic-songs.js — fetches popular songs/artists per genre from Last.fm,
 * with a persistent on-disk cache as fallback.
 *
 * If the fetch fails (network down, rate-limited, etc.) the last good result
 * stored in song-cache.json is returned. If there is no cache yet the static
 * pool from songs.js is used.
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');
const { SONGS, ARTISTS } = require('./songs');

const CACHE_FILE = path.join(__dirname, 'song-cache.json');

// Last.fm free tag → genre mapping
const GENRE_TAGS = {
  'Pop':        'pop',
  'Hip-Hop':    'hip-hop',
  'Rock':       'rock',
  'R&B':        'rnb',
  'Country':    'country',
  'Electronic': 'electronic',
};

// Last.fm free API key (public, read-only, rate-limited to ~5 req/s)
const LFM_KEY = '43693facbb24d1ac893a7d33846b15cc';

// ── Cache helpers ─────────────────────────────────────────────────────────────

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {}
  return {};
}

function saveCache(cache) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2)); } catch {}
}

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

// ── Last.fm fetchers ──────────────────────────────────────────────────────────

async function fetchTopTracks(tag) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&api_key=${LFM_KEY}&format=json&limit=50`;
  const data = await httpsGet(url);
  const tracks = data?.tracks?.track;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  return tracks.map(t => ({ title: t.name, artist: t.artist.name }));
}

async function fetchTopArtists(tag) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=${encodeURIComponent(tag)}&api_key=${LFM_KEY}&format=json&limit=50`;
  const data = await httpsGet(url);
  const artists = data?.topartists?.artist;
  if (!Array.isArray(artists) || artists.length === 0) return null;
  return artists.map(a => ({ name: a.name }));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns { songs, artists } for the given genre.
 * Tries to fetch fresh data from Last.fm; falls back to cache then static pool.
 * Updates the cache when fresh data is obtained.
 */
async function getDynamicPool(genre) {
  const tag = GENRE_TAGS[genre];
  const cache = loadCache();
  const cacheKey = genre;

  let freshSongs   = null;
  let freshArtists = null;

  if (tag) {
    try {
      [freshSongs, freshArtists] = await Promise.all([
        fetchTopTracks(tag),
        fetchTopArtists(tag),
      ]);
    } catch (e) {
      console.warn(`[dynamic-songs] fetch failed for "${genre}":`, e.message);
    }
  }

  // Determine what to use: fresh → cached → static
  const songs = (freshSongs && freshSongs.length >= 10)
    ? freshSongs
    : (cache[cacheKey]?.songs?.length >= 10
        ? cache[cacheKey].songs
        : (SONGS[genre] || []));

  const staticArtists = (ARTISTS[genre] || []).map(n => ({ name: n }));
  const artists = (freshArtists && freshArtists.length >= 10)
    ? freshArtists
    : (cache[cacheKey]?.artists?.length >= 10
        ? cache[cacheKey].artists
        : staticArtists);

  // Persist fresh data to cache
  if (freshSongs && freshSongs.length >= 10) {
    cache[cacheKey] = cache[cacheKey] || {};
    cache[cacheKey].songs     = freshSongs;
    cache[cacheKey].updatedAt = Date.now();
  }
  if (freshArtists && freshArtists.length >= 10) {
    cache[cacheKey] = cache[cacheKey] || {};
    cache[cacheKey].artists = freshArtists;
  }
  if (freshSongs || freshArtists) saveCache(cache);

  return { songs, artists };
}

module.exports = { getDynamicPool };
