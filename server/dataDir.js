// Resolves where persistent JSON files should live. On Railway, a volume is
// mounted at RAILWAY_VOLUME_MOUNT_PATH (currently /data) — anything written
// outside it is on the container's ephemeral filesystem and is wiped on
// every redeploy. Falls back to this directory for local dev, where no
// volume exists.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;

function dataPath(filename) {
  return path.join(DATA_DIR, filename);
}

// One-time migration: if a file exists at the old ephemeral location
// (server/<filename>) but not yet at the persistent one, move it so
// existing data isn't silently dropped the first time this runs on a
// volume-backed deploy.
function migrateIfNeeded(filename) {
  if (DATA_DIR === __dirname) return; // no volume — nothing to migrate
  const oldPath = path.join(__dirname, filename);
  const newPath = dataPath(filename);
  try {
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      fs.copyFileSync(oldPath, newPath);
      console.log(`Migrated ${filename} to persistent volume at ${newPath}`);
    }
  } catch (e) {
    console.error(`Migration of ${filename} failed:`, e.message);
  }
}

module.exports = { DATA_DIR, dataPath, migrateIfNeeded };
