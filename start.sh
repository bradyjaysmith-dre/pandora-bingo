#!/bin/bash
APP="Pandora Bingo"
PID_FILE="/tmp/pandora.pid"
LOG_FILE="/tmp/pandora.log"
BACKEND_PORT=3009
FRONTEND_PORT=5174
# Resolve script location so this works on both local and Replit
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLIENT_DIR="$SCRIPT_DIR/client"

# Stop function
stop() {
  if [ -f "$PID_FILE" ]; then
    echo "Stopping $APP..."
    for PID in $(cat "$PID_FILE"); do
      kill "$PID" 2>/dev/null
    done
    rm -f "$PID_FILE"
  else
    echo "$APP: no PID file, clearing by port to be safe..."
  fi
  # Belt-and-suspenders: vite/esbuild can leave grandchild processes behind
  # even when the recorded PID is killed cleanly, so also clear by port.
  # fuser is port-scoped and safe here — never pkill -f "node index.js",
  # which would hit every Coherence app's identically-named process.
  sleep 0.3
  fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null
  fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null
  echo "$APP stopped."
  exit 0
}

logs() {
  tail -f "$LOG_FILE"
  exit 0
}

# Handle stop/logs arguments
if [ "$1" = "stop" ]; then stop; fi
if [ "$1" = "logs" ]; then logs; fi

# Check if already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(head -1 "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "$APP is already running (PID $OLD_PID)"
    exit 1
  else
    rm -f "$PID_FILE"
  fi
fi

echo "Starting $APP..."

# Explicit subshell + exec so $! is the real process PID, not a wrapper's —
# a plain `cd X && cmd &` (or `npm run dev &`, which wraps vite inside npm's
# own process) can leave $! pointing at something other than what's actually
# holding the port, which then survives `stop`. See ~/.claude/CLAUDE.md.
(cd "$SERVER_DIR" && exec node index.js) >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "  Backend running (PID $SERVER_PID) -> http://localhost:${BACKEND_PORT}"

# Only run Vite dev server if not on Replit (Replit serves from Express static)
if [ -z "$REPL_ID" ] && [ -z "$REPLIT_CLUSTER" ]; then
  sleep 1
  # Call vite's binary directly (not `npm run dev`) so there's no npm
  # process sitting between $! and the actual vite process.
  (cd "$CLIENT_DIR" && exec ./node_modules/.bin/vite) >> "$LOG_FILE" 2>&1 &
  CLIENT_PID=$!
  echo "  Frontend running (PID $CLIENT_PID) -> http://localhost:${FRONTEND_PORT}"
  printf '%s\n%s\n' "$SERVER_PID" "$CLIENT_PID" > "$PID_FILE"
else
  echo "  Replit detected: frontend served from Express static (client/dist)"
  echo "$SERVER_PID" > "$PID_FILE"
fi

echo ""
echo "  $APP started. PIDs saved to $PID_FILE"
echo "  Logs: bash start.sh logs  (or tail -f $LOG_FILE)"
echo "  Stop: bash start.sh stop"
echo "  Press Ctrl+C to stop"

# Trap Ctrl+C
trap stop INT

wait
