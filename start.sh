#!/bin/bash
APP="Pandora Bingo"
PID_FILE="/tmp/pandora.pid"
SERVER_DIR="/home/bradysmith/pandora-bingo/server"
CLIENT_DIR="/home/bradysmith/pandora-bingo/client"

# Stop function
stop() {
  if [ -f "$PID_FILE" ]; then
    echo "Stopping $APP..."
    kill $(cat $PID_FILE) 2>/dev/null
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

sleep 1

cd $CLIENT_DIR
npm run dev &
CLIENT_PID=$!
echo "  Frontend running (PID $CLIENT_PID) -> http://localhost:5174"

# Save both PIDs
echo "$SERVER_PID $CLIENT_PID" > $PID_FILE

echo ""
echo "  $APP started. PIDs saved to $PID_FILE"
echo "  Run 'bash start.sh stop' to stop $APP"
echo "  Press Ctrl+C to stop both servers"

# Trap Ctrl+C
trap stop INT

wait
