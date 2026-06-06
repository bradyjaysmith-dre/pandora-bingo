// server/audd.js
// Proxies audio fingerprinting requests to the AudD API.
// The API key is kept server-side and never sent to the client.
// If no key is configured, requests are sent without one — AudD allows
// a limited number of free recognitions per day in keyless mode.

const https = require('https');
const http = require('http');

const AUDD_ENDPOINT = 'https://api.audd.io/';

/**
 * Identify a song from a raw audio Buffer (e.g. WebM/Opus from MediaRecorder).
 * Returns { title, artist } on success, or null if no match / error.
 *
 * @param {Buffer} audioBuffer
 * @returns {Promise<{title: string, artist: string} | null>}
 */
async function identify(audioBuffer) {
  const apiKey = process.env.AUDD_API_KEY || '';

  // Build a multipart/form-data body manually — no external deps needed.
  const boundary = '----AuddBoundary' + Date.now().toString(16);
  const parts = [];

  // api_token field (may be empty string when no key configured)
  if (apiKey) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="api_token"\r\n\r\n` +
      `${apiKey}\r\n`
    );
  }

  // return field — ask for basic song info only
  parts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="return"\r\n\r\n` +
    `song\r\n`
  );

  // audio file field
  const fileHeader =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="clip.webm"\r\n` +
    `Content-Type: audio/webm\r\n\r\n`;

  const closing = `\r\n--${boundary}--\r\n`;

  const headerBuf = Buffer.from(parts.join('') + fileHeader, 'utf8');
  const closingBuf = Buffer.from(closing, 'utf8');
  const body = Buffer.concat([headerBuf, audioBuffer, closingBuf]);

  return new Promise((resolve) => {
    const url = new URL(AUDD_ENDPOINT);
    const reqOptions = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (json.status === 'success' && json.result) {
            resolve({
              title: json.result.title,
              artist: json.result.artist,
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error('AudD parse error:', e.message);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('AudD request error:', err.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

module.exports = { identify };
