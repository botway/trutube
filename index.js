const express = require("express");
const app = express();
const path = require("path");
const { rword } = require("rword");
const randomWords = require("random-words");
const translate = require("translate");
const searchYoutube = require("youtube-api-v3-search");
const YouTube = require("simple-youtube-api");
const langArr = require("./lang");

let secrets;
if (process.env.NODE_ENV == "production") {
    secrets = process.env; // in prod the secrets are environment variables
} else {
    secrets = require("./secrets.json"); // secrets.json is in .gitignore
}

const youtube = new YouTube(secrets.youtube_key);
translate.engine = "yandex";
translate.key = secrets.yandex_key;

app.use(express.static("public"));
app.set("view engine", "ejs");

// app.get("/", async (req, res) => {
//     const phrase = genPhrase(2, 4);
//     const translate = await transPhrase(phrase, null);
//     const data = await getVideos(translate, 1);
//     res.render("index", { data: data });
// });
app.get("/", async (req, res) => {
    const phrase = genPhrase(2, 4);
    const translate = await transPhrase(phrase, null);
    const result = await getVideos(translate, 1);
    res.render("main", { data: result });
});

app.get("/randomvid", async (req, res) => {
    let phrase = `${req.query.keyword} ${genPhrase(2, 4)}`;
    if (req.query.translate)
        phrase = await transPhrase(phrase, req.query.translate);
    const result = await getVideos(phrase, 1);
    console.log(phrase);
    res.json(result);
});

// app.get("/trailers", async (req, res) => {
//     const phrase = `movie trailer ${genPhrase(2, 4)}`;
//     const data = await getVideos(phrase, 1);
//     res.render("index", { data: data });
// });
//
// app.get("/music", async (req, res) => {
//     const phrase = `music song ${genPhrase(1, 2)}`;
//     const translate = await transPhrase(phrase, null);
//     const data = await getVideos(translate, 1);
//     res.render("index", { data: data });
// });
//
// app.get("/tutorials", async (req, res) => {
//     const phrase = `tutorial ${genPhrase(2, 4)}`;
//     const data = await getVideos(phrase, 1);
//     res.render("player", { data: data });
// });

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
