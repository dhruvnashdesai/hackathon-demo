const fs = require('fs');
const path = require('path');

const sessions = new Map();
const SESSIONS_DIR = path.join(__dirname, '..', 'data', 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Load existing sessions from disk on startup
const loadSessionsFromDisk = () => {
  try {
    const files = fs.readdirSync(SESSIONS_DIR);
    let loadedCount = 0;

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const sessionId = file.replace('.json', '');
          const filePath = path.join(SESSIONS_DIR, file);
          const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          // Convert date strings back to Date objects
          sessionData.createdAt = new Date(sessionData.createdAt);

          sessions.set(sessionId, sessionData);
          loadedCount++;
        } catch (error) {
          console.error(`Error loading session ${file}:`, error.message);
        }
      }
    }

    if (loadedCount > 0) {
      console.log(`📁 Loaded ${loadedCount} sessions from disk`);
    }
  } catch (error) {
    console.error('Error loading sessions from disk:', error.message);
  }
};

// Save session to disk
const saveSessionToDisk = (sessionId, sessionData) => {
  try {
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
  } catch (error) {
    console.error(`Error saving session ${sessionId} to disk:`, error.message);
  }
};

// Delete session file from disk
const deleteSessionFromDisk = (sessionId) => {
  try {
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting session ${sessionId} from disk:`, error.message);
  }
};

// Load sessions on startup
loadSessionsFromDisk();

const createSession = () => {
  const sessionId = require('uuid').v4();
  const sessionData = {
    clips: [],
    sequence: null,
    scores: {},
    soundtrack: null,
    createdAt: new Date()
  };
  sessions.set(sessionId, sessionData);
  saveSessionToDisk(sessionId, sessionData);
  return sessionId;
};

const getSession = (sessionId) => {
  return sessions.get(sessionId);
};

const updateSession = (sessionId, data) => {
  const session = sessions.get(sessionId);
  if (session) {
    const updatedSession = { ...session, ...data };
    sessions.set(sessionId, updatedSession);
    saveSessionToDisk(sessionId, updatedSession);
    return true;
  }
  return false;
};

const cleanupOldSessions = () => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  for (const [sessionId, session] of sessions.entries()) {
    if (session.createdAt < twentyFourHoursAgo) {
      sessions.delete(sessionId);
      deleteSessionFromDisk(sessionId);
      console.log(`🗑️ Cleaned up old session: ${sessionId}`);
    }
  }
};

setInterval(cleanupOldSessions, 60 * 60 * 1000);

module.exports = {
  createSession,
  getSession,
  updateSession,
  cleanupOldSessions
};