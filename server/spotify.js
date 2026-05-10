require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

// Scopes needed for now-playing and playback control
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
];

function getAuthUrl() {
  return spotifyApi.createAuthorizeURL(SCOPES, 'pandora-bingo-state');
}

async function handleCallback(code) {
  const data = await spotifyApi.authorizationCodeGrant(code);
  spotifyApi.setAccessToken(data.body.access_token);
  spotifyApi.setRefreshToken(data.body.refresh_token);
  return {
    accessToken: data.body.access_token,
    refreshToken: data.body.refresh_token,
    expiresIn: data.body.expires_in,
  };
}

async function refreshToken(refreshToken) {
  spotifyApi.setRefreshToken(refreshToken);
  const data = await spotifyApi.refreshAccessToken();
  spotifyApi.setAccessToken(data.body.access_token);
  return {
    accessToken: data.body.access_token,
    expiresIn: data.body.expires_in,
  };
}

async function getCurrentTrack(accessToken) {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getMyCurrentPlayingTrack();
  if (!data.body || !data.body.item) return null;
  const track = data.body.item;
  return {
    id: track.id,
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    artistIds: track.artists.map(a => a.id),
    albumArt: track.album.images[0] ? track.album.images[0].url : null,
    isPlaying: data.body.is_playing,
    progressMs: data.body.progress_ms,
    durationMs: track.duration_ms,
  };
}

async function searchTracks(accessToken, query) {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.searchTracks(query, { limit: 10 });
  return (data.body.tracks.items || []).map(t => ({
    id: t.id,
    title: t.name,
    artist: t.artists.map(a => a.name).join(', '),
    albumArt: t.album.images[2] ? t.album.images[2].url : (t.album.images[0] ? t.album.images[0].url : null),
  }));
}

async function searchArtists(accessToken, query) {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.searchArtists(query, { limit: 10 });
  return (data.body.artists.items || []).map(a => ({
    id: a.id,
    name: a.name,
    image: a.images[2] ? a.images[2].url : (a.images[0] ? a.images[0].url : null),
  }));
}

async function getUserPlaylists(accessToken) {
  spotifyApi.setAccessToken(accessToken);
  const data = await spotifyApi.getUserPlaylists({ limit: 50 });
  return data.body.items.map(p => ({
    id: p.id,
    name: p.name,
    trackCount: p.tracks.total,
    image: p.images[0] ? p.images[0].url : null,
  }));
}

// Future: Last.fm integration hook
// async function getLastFmNowPlaying(username, apiKey) {
//   const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
//   const res = await fetch(url);
//   const data = await res.json();
//   const track = data.recenttracks.track[0];
//   if (!track || !track['@attr'] || !track['@attr'].nowplaying) return null;
//   return { title: track.name, artist: track.artist['#text'] };
// }

module.exports = { getAuthUrl, handleCallback, refreshToken, getCurrentTrack, getUserPlaylists, searchTracks, searchArtists };
