var fs = require("fs");
var dbFile = "./data/sqlite.db";
var exists = fs.existsSync(dbFile);
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(dbFile);

db.serialize(function() {
    if (!exists) {
        db.run("CREATE TABLE Vid_IDs (vid_id TEXT NOT NULL UNIQUE)");
        console.log("New table was created!");
    } else {
        console.log('Database "Dreams" ready to go!');
    }
});

module.exports.db = db;
