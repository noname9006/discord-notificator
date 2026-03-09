const fs = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const TMP_FILE   = path.join(DATA_DIR, 'state.tmp');
const MAX_ENTRIES = 50;

const DEFAULT_STATE = {
    entries: [],
    globalState: {
        currentIndex: 0,
        lastSentTimestamp: null,
        firstNotificationSent: false,
        userMessageCount: 0
    },
    independentState: {}
};

function loadState() {
    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (_) {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
}

function saveState(state) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(TMP_FILE, JSON.stringify(state, null, 2), 'utf8');
        fs.renameSync(TMP_FILE, STATE_FILE);
    } catch (err) {
        console.error('[STATE][ERROR] Failed to persist state:', err.message);
    }
}

function addEntry(state, entry) {
    state.entries.push(entry);
    if (state.entries.length > MAX_ENTRIES) {
        state.entries = state.entries.slice(state.entries.length - MAX_ENTRIES);
    }
    return state;
}

module.exports = { loadState, saveState, addEntry };
