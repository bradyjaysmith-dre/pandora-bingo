#!/bin/bash
APP="Pandora Bingo"
PID_FILE="/tmp/pandora.pid"
# Resolve script location so this works on both local and Replit
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
CLIENT_DIR="$SCRIPT_DIR/client"

# Stop function
stop() {
  if [ -f "$PID_FILE" ]; then
    echo "Stopping $APP..."
    for PID in $(cat $PID_FILE); do
      kill $PID 2>/dev/null
    done
    rm -f $PID_FILE
    echo "$APP stopped."
  else
    echo "$APP is not running."
  fi
  exit 0
}

# Handle stop argument
if [ "$1" = "stop" ]; then stop; fi

# Check if already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat $PID_FILE)
  if kill -0 $OLD_PID 2>/dev/null; then
    echo "$APP is already running (PID $OLD_PID)"
    exit 1
  else
    rm -f $PID_FILE
  fi
fi

echo "Starting $APP..."

cd $SERVER_DIR
node index.js &
SERVER_PID=$!
echo "  Backend running (PID $SERVER_PID) -> http://localhost:3002"

# Only run Vite dev server if not on Replit (Replit serves from Express static)
if [ -z "$REPL_ID" ] && [ -z "$REPLIT_CLUSTER" ]; then
  sleep 1
  cd $CLIENT_DIR
  npm run dev &
  CLIENT_PID=$!
  echo "  Frontend running (PID $CLIENT_PID) -> http://localhost:5174"
  echo "$SERVER_PID $CLIENT_PID" > $PID_FILE
else
  echo "  Replit detected: frontend served from Express static (client/dist)"
  echo "$SERVER_PID" > $PID_FILE
fi

echo ""
echo "  $APP started. PIDs saved to $PID_FILE"
echo "  Run 'bash start.sh stop' to stop $APP"
echo "  Press Ctrl+C to stop"

# Trap Ctrl+C
trap stop INT

wait
