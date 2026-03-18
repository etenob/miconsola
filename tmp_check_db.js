
const { sqlite } = require('./src/main/db/sqlite');

async function testDB() {
    try {
        console.log("Checking tables...");
        const tables = await sqlite.query("SELECT name FROM sqlite_master WHERE type='table'");
        console.log("Tables found:", tables.rows.map(r => r.name));
        
        const convs = await sqlite.query("SELECT * FROM conversations");
        console.log("Conversations:", convs.rows);
        
        const msgs = await sqlite.query("SELECT * FROM messages");
        console.log("Total messages:", msgs.rows.length);
    } catch (e) {
        console.error("DB Test Error:", e);
    }
}

testDB();
