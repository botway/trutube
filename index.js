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
    res.render("landing");
});

app.get("/home", async (req, res) => {
    const lang = getRandomLang();
    const params = {
        publishedBefore: "2018-01-01T00:00:00Z",
        relevanceLanguage: lang,
        duration: "any"
    };
    let phrase = genPhrase(1, 3);
    phrase = await transPhrase(phrase, lang);
    const result = await getVideos(phrase, 1, params);
    res.render("main", { data: result });
});

app.get("/randomvid", async (req, res) => {
    let lang =
        req.query.relevanceLanguage == "rnd"
            ? getRandomLang()
            : req.query.relevanceLanguage;
    req.query.relevanceLanguage = lang;
    let phrase = `${req.query.keyword} ${genPhrase(1, 4)}`;
    if (lang) {
        phrase = await transPhrase(phrase, lang);
    }
    const result = await getVideos(phrase, 1, req.query);
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

app.get("/gallery", async (req, res) => {
    let promises = [];
    const data = await db.getAsync(
        "SELECT * from Vid_IDs ORDER BY rowid DESC LIMIT 5"
    );
    data.forEach(elem => {
        promises.push(youtube.getVideoByID(elem.vid_id));
    });
    try{
        const vids = await Promise.all(promises);
        res.render("main", { data: vids });
    } catch(e){
        return e.console;
    }
});

app.get("/music", async (req,res)=>{
    const params = {
        publishedBefore: "2018-01-01T00:00:00Z",
        relevanceLanguage: "en",
        duration: "any"
    };
    let phrase = "music song " + genPhrase(1, 3);
    const result = await getVideos(phrase, 1, params);
    res.render("main", { data: result });
})

app.get("/trailers", async (req,res)=>{
    const params = {
        publishedBefore: "2018-01-01T00:00:00Z",
        relevanceLanguage: "en",
        duration: "any"
    };
    let phrase = "movie trailer " + genPhrase(1, 3);
    const result = await getVideos(phrase, 1, params);
    res.render("main", { data: result });
})

const getVideos = async (query, amount, params) => {
    console.log(query, params);
    let options = {
        type: "video",
        duration: params.duration,
        safeSearch: "none",
        publishedBefore: params.publishedBefore,
        relevanceLanguage: params.relevanceLanguage
    };
    try {
        const videos = await youtube.searchVideos(query, amount, options);
        return videos;
    } catch(e){
        return e.error;
    }
};

const transPhrase = async (phrase, lang) => {
    const translated = await translate(phrase, lang);
    return translated;
};

const genPhrase = (min, max) => {
    let phrase = randomWords({ exactly: getRandomInt(min, max), join: " " });
    return phrase;
};
function getRandomLang() {
    return langArr[Math.floor(Math.random() * langArr.length)];
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.listen(process.env.PORT || 8080, () => console.log("listening on 8080"));
