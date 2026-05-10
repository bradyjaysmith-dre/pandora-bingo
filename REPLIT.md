# Deploying Pandora Bingo on Replit

## One-time setup

### 1. Create a new Replit

1. Go to https://replit.com and create a new Repl
2. Choose **Import from GitHub** (or use the **Node.js** template and upload files)
3. Import your repo — the `.replit` and `replit.nix` files in the root handle the rest

### 2. Set Replit Secrets (replaces .env)

In your Repl, open **Secrets** (the padlock icon in the sidebar) and add:

| Key | Value |
|-----|-------|
| `SPOTIFY_CLIENT_ID` | your Spotify client ID |
| `SPOTIFY_CLIENT_SECRET` | your Spotify client secret |
| `SPOTIFY_REDIRECT_URI` | `https://<your-repl-name>.<your-username>.repl.co/auth/spotify/callback` |
| `PORT` | `3002` |

> **Find your Repl URL:** It shows in the browser bar when your Repl is running, e.g.  
> `https://pandora-bingo.yourusername.repl.co`

### 3. Register the redirect URI with Spotify

1. Go to https://developer.spotify.com/dashboard
2. Open your app → **Edit Settings**
3. Under **Redirect URIs**, add:  
   `https://<your-repl-name>.<your-username>.repl.co/auth/spotify/callback`
4. Save

### 4. Build and start

In the Replit Shell tab:

```bash
npm run install:all   # installs both server and client dependencies
npm run build         # builds the React frontend into client/dist
npm start             # starts the server (Express serves the built frontend)
```

After the first build, hitting **Run** in Replit will just do `npm start`.

> The `.replit` config sets `run = "npm start"`, so clicking Run after setup will launch the server directly.

### 5. Share with players

Your public URL is shown at the top of the Replit webview:  
`https://<your-repl-name>.<your-username>.repl.co`

Share that link. **No Tailscale needed** — anyone with the link can join.

---

## Notes

- **No database:** Game state is in-memory. Rooms disappear if the Repl restarts or sleeps (free tier).
- **Free tier sleep:** Replit free Repls sleep after ~5 min of inactivity. For a game night, just keep the browser tab open or use a paid plan / Deployments to keep it always-on.
- **Replit Deployments (always-on):** Use the **Deploy** button in Replit to deploy to Autoscale or Reserved VM for a persistent public URL that never sleeps.
- **Spotify OAuth on Replit:** Uses the same server-side flow. The redirect URI just needs to be the Replit URL instead of `127.0.0.1`.

---

## Local dev (unchanged)

```bash
bash start.sh        # starts Vite dev server (port 5174) + Express (port 3002)
bash start.sh stop   # stops both
```
