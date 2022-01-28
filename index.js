// set up package requirements
const express = require('express');
const mysql = require('mysql');

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const getSubtitles = require('youtube-captions-scraper').getSubtitles;

// create the Express application
const app = express();

// set Express to use the EJS template engine, set "public" as root folder to serve from
app.set("view engine", "ejs");
app.use(express.static("public"));

// simplify youtube api access
const youtube = google.youtube('v3');
const key = 'AIzaSyD-QWKchiTP5CSzScpbR1kfddR_GGnm0ak';
const rsiChannelId = 'UCTeLqJq1mXUX5WWoNXLmOIA';
const uploads = 'UUTeLqJq1mXUX5WWoNXLmOIA'; // for testing: what info can be accessed with this playlist ID?
const video0 = 'RgmBWBldFZM'; // for testing: can captions be retrieved from this videoId?

/*
 * Access tree from channel to caption:
 * 
 * channel > playlists > playlistItems > videos > caption
 * 
 * apply youtube timestamp: &t=[minutes]m[seconds]s || &t=[seconds]
 */

//---------------------------------------------DB Update Functions---------------------------------------------------

/*
 * this function gathers all desired playlist info and sends it to the database "playlists" table
 */
async function updateDbPlaylists(key, channelId) {

    // get all playlists
    var playlists = await getPlaylists(key, rsiChannelId);
    
    // create array of playlist objects for tidy sendoff
    var playlistObjects = [];

    // for each playlist, make a new object representing that playlist with the specific data we want
    // and add it to the array of playlist objects
    for (var element of playlists) {
        playlistObjects.push({
            playlistId: element.id,
            title: element.snippet.title,
            publishDate: element.snippet.publishedAt,
            videoCount: element.contentDetails.itemCount,
            videos: []
        });
    }
    //console.log(playlistObjects);

    //todo: retrieve IDs of all videos in each playlist and update the appropriate playlistObjects with them

    // var videos[] = getVideos(playlistId);

    var videoId = video0;
    
    //todo: get captions of each video
    
    var captions = await getSubtitles({videoID: video0});
    //console.log(captions);
}

updateDbPlaylists(key);

/*
 * this function returns an object consisting of some of the channel's info
 */
async function getChannelInfo(key, channelId) {
    const res = await youtube.channels.list({
        auth: key,
        id: channelId,
        part: 'snippet, contentDetails, statistics'
    });

    var channelItems = res.data.items[0].contentDetails.relatedPlaylists; // retrieves "uploads" playlist

    // create object to send to the database
    var channelInfo = {
        // channeId, etc.
    }

    console.log(channelItems);
    return channelInfo;
}

/*
 * this function returns an array of all playlists created by the channel and some info about them
 */
async function getPlaylists(key, channelId) {
    const res = await youtube.playlists.list({
        auth: key,
        channelId: channelId,
        part: 'snippet, contentDetails',
        maxResults: 100
    });

    var playlists = res.data.items;       // returns all playlists
    var playlist1 = res.data.items[0];    // returns first playlist

    // create object to send to the database
    var playlistObject = {
        playlistId: playlist1.id,
        title: playlist1.snippet.title,
        publishDate: playlist1.snippet.publishedAt,
        videoCount: playlist1.contentDetails.itemCount
    };

    //console.log(playlistObject);
    return playlists;
}



//getChannelInfo(key, rsiChannelId);

//getPlaylists(key, rsiChannelId);

//---------------------------------------------Routes---------------------------------------------------

// home route
app.get('/', (req, res) => {
  res.render('home')
});

// library route
app.get('/library', (req, res) => {
  res.render('library')
});

// about route
app.get('/about', (req, res) => {
  res.render('about')
});

//---------------------------------------------Search Results---------------------------------------------------

//search route
app.get('/search', async (req, res) => {

  let sql = `SELECT * FROM q_author`;
  let sql2 = `SELECT DISTINCT category FROM q_quotes`;

  let authors = await executeSQL(sql);
  let categories = await executeSQL(sql2)


  res.render('search', {
    "authors": authors,
    "categories": categories,
  })
});

//search results route
app.get("/results", async function(req, res) {

  let word = req.query.keyword;

  let sql = `SELECT video FROM videos WHERE caption LIKE ?`;
  let params = [`%${word}%`]

  if (req.query.authorId) { //if author was selected (if authorId has any value)
    sql += "AND authorId = ? ";
    params.push(req.query.authorId);
  }

  if (req.query.category) {
    sql += "AND category = ? ";
    params.push(req.query.category);
  }

  let rows = await executeSQL(sql, params);
  res.render('results', { "rows": rows });
});

//---------------------------------------------Database and Query Setup---------------------------------------------------

//function for querying the database 
async function executeSQL(sql, params) {

  return new Promise(function(resolve, reject) {
    let conn = dbConnection();

    conn.query(sql, params, function(err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });

}

// access the database using a connection pool
function dbConnection() {

  // create RemoteMySQL database pool connection
  const pool = mysql.createPool({
    connectionLimit: 1000,
    host: "remotemysql.com",
    user: "mrNBNedB7e",
    password: "LlEFgvnh9P",
    database: "mrNBNedB7e"
  });

  // confirm connection has been established
  pool.getConnection(function(err) {
    if (err) {
      console.log(err)
    }
    console.log("Connected to pool database.");
  });

  return pool;
}



app.listen(3000, () => {
  console.log('server started');
});