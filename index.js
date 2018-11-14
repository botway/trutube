const express = require("express");
const app = express();
var bodyParser = require("body-parser");
const path = require("path");
const { rword } = require("rword");
const randomWords = require("random-words");
const translate = require("translate");
const searchYoutube = require("youtube-api-v3-search");
const YouTube = require("simple-youtube-api");
const langArr = require("./lang");
const db = require("./db").db;
const util = require("util");

exports.app = app;

let secrets;
if (process.env.NODE_ENV == "production") {
    secrets = process.env; // in prod the secrets are environment variables
} else {
    secrets = require("./secrets.json"); // secrets.json is in .gitignore
}

const youtube = new YouTube(secrets.youtube_key);
translate.engine = "yandex";
translate.key = secrets.yandex_key;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
    const phrase = genPhrase(2, 4);
    const translate = await transPhrase(phrase, null);
    const result = await getVideos(translate, 1);
    res.render("main", { data: result });
    // db.each("SELECT * from Vid_IDs", function(err, row) {
    //     if (row) {
    //         console.log("record:", row);
    //     }
    // });
});

app.get("/randomvid", async (req, res) => {
    let phrase = `${req.query.keyword} ${genPhrase(2, 4)}`;
    if (req.query.translate)
        phrase = await transPhrase(phrase, req.query.translate);
    const result = await getVideos(phrase, 1);
    console.log(phrase);
    res.json(result);
});

app.post("/savevid", async (req, res) => {
    console.log("savevid", req.body);
    //prettier-ignore
    db.serialize(() => {
        db.run(`INSERT INTO Vid_IDs (vid_id) VALUES(?)`, [req.body.id], function(err){
            if (err) {
                return console.log(err.message);
            }
            res.json({ data: this.lastID });
        });
    });
});

const getVideos = async (query, amount) => {
    let options = {
        type: "video",
        duration: "short",
        safeSearch: "none"
    };
    // publishedBefore: "2009-01-01T00:00:00Z"
    const videos = await youtube.searchVideos(query, amount, options);
    return videos;
};

const transPhrase = async (phrase, lang) => {
    if (!lang) lang = langArr[Math.floor(Math.random() * langArr.length)];
    const translated = await translate(phrase, lang);
    return translated;
};

const genPhrase = (min, max) => {
    let phrase = randomWords({ exactly: getRandomInt(min, max), join: " " });
    return phrase;
};

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.listen(8080, () => console.log("listening on 8080"));
