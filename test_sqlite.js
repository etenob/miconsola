try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    console.log('SUCCESS: better-sqlite3 loaded and initialized');
    db.close();
} catch (err) {
    console.error('ERROR: failed to load better-sqlite3');
    console.error(err);
}
