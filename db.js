var fs = require("fs");
var dbFile = "./.data/sqlite.db";
var exists = fs.existsSync(dbFile);
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(dbFile);

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function() {
    if (!exists) {
        db.run("CREATE TABLE Dreams (dream TEXT)");
        console.log("New table Dreams created!");

        // insert default dreams
        db.serialize(function() {
            db.run(
                'INSERT INTO Dreams (dream) VALUES ("Find and count some sheep"), ("Climb a really tall mountain"), ("Wash the dishes")'
            );
        });
    } else {
        console.log('Database "Dreams" ready to go!');
        db.each("SELECT * from Dreams", function(err, row) {
            if (row) {
                console.log("record:", row);
            }
        });
    }
});
