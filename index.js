const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const path = require("path");
const { rword } = require("rword");
const randomWords = require("random-words");
const translate = require("translate");
const searchYoutube = require("youtube-api-v3-search");
const YouTube = require("simple-youtube-api");
const langArr = require("./lang");
const youtubeLangArr = require("./youtubelang");
const db = require("./db").db;
const util = require("util");
const fs = require("fs");

exports.app = app;

let secrets;

if (process.env.ENVIRONMENT == "production") {
    secrets = {
      "youtube_key": process.env.YOUTUBE,
      "yandex_key": process.env.YANDEX
    }
} else {
    secrets = require("./secrets.json");
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
    // const langs=[];
    // youtubeLangArr.forEach((el)=>{
    //     langs.push(el.id)
    // })
    // console.log(langs);
    // writeFile(JSON.stringify(langs))
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
    if(result == []) {
        console.log("repeat get home");
        app.get("/home");
    }
    res.render("main", { data: result });
});

app.get("/randomvid", async (req, res) => {
    let lang =
        req.query.relevanceLanguage == "rnd"
            ? getRandomLang()
            : req.query.relevanceLanguage;
    req.query.relevanceLanguage = lang;
    let phrase = `${req.query.keyword} ${genPhrase(1, 3)}`;
    if (lang && lang != "en") {
        phrase = await transPhrase(phrase, lang);
    }
    const result = await getVideos(phrase, 1, req.query);
    console.log(phrase);
    res.json(result);
});

app.post("/savevid", async (req, res) => {
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
    const limit = 10;
    let last;
    const data = await db.getAsync(
        `SELECT *,rowid from Vid_IDs ORDER BY rowid DESC LIMIT ${limit}`
    );
    last = data[0].rowid - limit + 1;
    data.forEach(elem => {
        promises.push(youtube.getVideoByID(elem.vid_id));
    });
    try{
        const vids = await Promise.all(promises);
        // console.log(vids);
        res.render("main", { data: vids, last:last });
    } catch(e){
        return e.error();;
    }
});

app.post("/vidbyid", async(req,res) =>{
    try{
        const vid = await youtube.getVideoByID(req.body.vidId)
        res.json({vid: vid});
    }catch(e){
        console.log("err in getById", e.error);
        res.json({vid: false});
    }
})

app.get("/gallery/more", async (req, res) => {
    let promises = [];
    let last = req.query.last
    const limit = 5;
    const data = await db.getAsync(
        `SELECT *, rowid from Vid_IDs
            WHERE rowid < ${last} ORDER BY rowid DESC LIMIT ${limit}`
    );
    last = data[0].rowid - limit + 1;
    data.forEach(elem => {
        promises.push(youtube.getVideoByID(elem.vid_id));
    });
    try{
        const vids = await Promise.all(promises);
        // console.log("more",vids);
        res.json({ vids: vids, last: last });
    } catch(e){
        return e.error;
    }
});

app.get("/music", async (req,res)=>{
    const params = {
        publishedBefore: "2018-01-01T00:00:00Z",
        relevanceLanguage: "en",
        duration: "any"
    };
    let phrase = "music " + genPhrase(1, 3);
    let result = await getVideos(phrase, 1, params);
    result[0].keyword = "music ";
    res.render("main", { data: result });
})

app.get("/movies", async (req,res)=>{
    const params = {
        publishedBefore: "2018-01-01T00:00:00Z",
        relevanceLanguage: "en",
        duration: "any"
    };
    let phrase = "movie " + genPhrase(1, 3);
    let result = await getVideos(phrase, 1, params);
    result[0].keyword = "movie ";
    res.render("main", { data: result});
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
        let videos = await youtube.searchVideos(query, amount, options);
        if(videos.length == 0 ) {
            console.log("res is empty, retrying");
            options.publishedBefore = "2018-01-01T00:00:00Z";
            videos = await youtube.searchVideos(`${params.keyword} ${genPhrase(1, 3)}`, amount, options);
        }
        return videos;
    } catch(e){
        console.log("err in vid", e)
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

function writeFile(data){
    fs.writeFile('temp.txt', data, function(err, data){
    if (err) console.log(err);
    console.log("Successfully Written to File.");
    });
}

app.listen(process.env.PORT || 8080, () => console.log("listening on 8080"));
