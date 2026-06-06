#!/usr/bin/env bash
# archive.sh — snapshot the project into ~/pandora-bingo-milestones
#
# Usage:
#   bash archive.sh v10.5-audd-detection
#
# Creates:
#   ~/pandora-bingo-milestones/v10.5-audd-detection/

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: bash archive.sh <milestone-name>"
  echo "Example: bash archive.sh v10.5-audd-detection"
  exit 1
fi

MILESTONE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/pandora-bingo-milestones/$MILESTONE"

if [ -d "$DEST" ]; then
  echo "Error: $DEST already exists. Choose a different name or remove it first."
  exit 1
fi

mkdir -p "$DEST"

rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='client/node_modules' \
  --exclude='server/node_modules' \
  --exclude='client/dist' \
  --exclude='server/.env' \
  --exclude='server/song-cache.json' \
  --exclude='server/leaderboard.json' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  "$SCRIPT_DIR/" "$DEST/"

echo "Archived → $DEST"
ls ~/pandora-bingo-milestones
