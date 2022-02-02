// set up package requirements
const express = require('express');
const mysql = require('mysql');

const fs = require('fs');
const buffer = require('buffer');
const readline = require('readline');
const {google} = require('googleapis');
const {getSubtitles}  = require('youtube-captions-scraper');
const https = require('https');
//const axios = require('axios').default;

// create the Express application
const app = express();

// set Express to use the EJS template engine, set "public" as root folder to serve from
app.set("view engine", "ejs");
app.use(express.static("public"));

// simplify youtube api access
const youtube = google.youtube('v3');
const key = 'AIzaSyD-QWKchiTP5CSzScpbR1kfddR_GGnm0ak';
const rsiChannelId = 'UCTeLqJq1mXUX5WWoNXLmOIA';
const uploads = 'UUTeLqJq1mXUX5WWoNXLmOIA'; // playlistId for the playlist that contains every video on the channel
const video0 = 'RgmBWBldFZM'; // for testing: can captions be retrieved from this videoId?

// create RemoteMySQL database pool connection
const pool = mysql.createPool({
    connectionLimit: 5,
    host: "remotemysql.com",
    user: "mrNBNedB7e",
    password: "LlEFgvnh9P",
    database: "mrNBNedB7e"
});

/*
 * Access tree from channel to caption:
 * 
 * channel > playlists > playlistItems > videos > caption
 * 
 * apply youtube timestamp: &t=[minutes]m[seconds]s || &t=[seconds]
 */

//---------------------------------------------API data acquisition functions---------------------------------------------------

/* todo
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

//getChannelInfo(key, rsiChannelId);

/*
 * this function returns an array of all playlists created by the channel and some info about them
 */
async function getPlaylists(key, channelId, pageToken, pageResults) {
    const res = await youtube.playlists.list({
        auth: key,
        channelId: channelId,
        part: 'snippet, contentDetails',
        maxResults: 50,
        pageToken: pageToken
    });

    //1. get page results
    //2. append results to array
    //3. iterate to next page
    // repeat

    // loop through all pages available
    if (res.data['nextPageToken']) {    // if there's another token, first add all of the current page's items to pageResults, then go to the next page

        for (var item of res.data.items) {
            pageResults.push(item);
        }

        return getPlaylists(key, channelId, res.data.nextPageToken, pageResults);
    } else {    // when we get to the last page, add all of the page's items to pageResults, copy to playlists, and return playlists
        for (var item of res.data.items) {
            pageResults.push(item);
        }
            
        var playlists = pageResults;
        
        //console.log(playlists);
        // return array of all playlists created by the channel
        return playlists;
    }
    //var playlistsJson = JSON.stringify(playlists, null, 4); // example of converting json to string while keeping formatting
}

//getPlaylists(key, rsiChannelId, "", []);

/*
 * this function returns an array (JSON promise) of all videos in a specified playlist
 */
async function getPlaylistItems(key, playlistId, pageToken, pageResults) {
    const res = await youtube.playlistItems.list({
        auth: key,
        playlistId: playlistId,
        part: 'snippet, contentDetails',
        maxResults: 50,
        pageToken: pageToken
    });

    //1. get page results
    //2. append results to array
    //3. iterate to next page
    // repeat

    // loop through all pages available
    if (res.data['nextPageToken']) {    // if there's another token, first add all of the current page's items to pageResults, then go to the next page

        for (var item of res.data.items) {
            pageResults.push(item);
        }

        return getPlaylistItems(key, playlistId, res.data.nextPageToken, pageResults);
    } else {    // when we get to the last page, add all of the page's items to pageResults, copy to playlistItems, and return playlistItems
        for (var item of res.data.items) {
            pageResults.push(item);
        }
            
        var playlistItems = pageResults;
        
        //console.log(playlistItems);
        return playlistItems;
    }
    
}

//getPlaylistItems(key, uploads, "", []);

/* 
 * this function returns all info about a specified video
 */
async function getVideoInfo(key, videoId) {
    const res = await youtube.videos.list({
        auth: key,
        id: videoId,
        part: 'snippet, contentDetails, status, statistics',
        maxResults: 50 // this is the max allowed, unfortunately
    });

    var videoInfo = res.data.items[0];       // get first video

    //console.log(videoInfo);

    // return all info about the specified video
    return videoInfo;
}

//getVideoInfo(key, video0);

/* 
 * this function returns caption data for the specified video
 * 
 * IF THIS FUNCTION IS RETURNING STATUS CODE 429 (too many requests), ENTER 'KILL 1' IN THE REPLIT SHELL
 */
async function getCaptions(videoId) {

    // get captions from the video, with error checking for the server response
    var captions = await getSubtitles({ videoID: videoId, lang: 'en' })
        .catch(function (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
            }
        });

    // use this to convert promise response to a string (to be stored as a string in the database, or written to file)
    var captionsJson = JSON.stringify(captions, null, 4);

    // the following code can be used to write jsons to a file
    // fs.writeFile("test.txt", jsonData, function(err) {
    //     if (err) {
    //         console.log(err);
    //     }
    // });

    //console.log(captionsJson);

    // return captions of the specified video as a stringified JSON
    return captionsJson;
}

//getCaptions(video0);

//---------------------------------------------DB Update Functions---------------------------------------------------

/* todo
 * this function gathers info from every updateDb function and updates the database with it using SQL
 */
async function updateDb() {

    // call all db update functions at the same time
    updateDbPlaylists(key, rsiChannelId);
    
    // updateDbPlaylistItems...
}

updateDb();

/*  
 * this function gathers all desired playlist info and sends it to the database "playlists" table
 */
async function updateDbPlaylists(key, channelId) {

    // get all playlists
    var playlists = await getPlaylists(key, rsiChannelId, "", []);
    
    // create array of playlist objects for tidy sendoff
    var playlistObjects = [];

    /*
     * for each playlist, make a new object representing that playlist with the following data:
     * 
     * playlistId   - unique ID of the playlist
     * title        - title of the playlist
     * publishDate  - data playlist was published
     * videoCount   - number of videos in the playlist
     */
    // and add each object to the array of playlist objects
    for (var element of playlists) {
        var datetime = element.snippet.publishedAt.replace("T", " ");
        datetime = datetime.replace("Z", "");

        playlistObjects.push({
            playlistId: element.id,
            title: element.snippet.title,
            publishDate: datetime,
            videoCount: element.contentDetails.itemCount,
        });   
    }

    // connect to the database connection pool before performing SQL operations
    pool.getConnection(function(err, conn) {
        if (err) throw (err);
        console.log("Connected to database connection pool. Updating playlists..."); // confirm connection

        // for each playlistObject, check if it exists in the database; if not, insert it
        for (let element of playlistObjects) {

            // first check if the playlist is already in the database
            let sql = "SELECT * FROM playlists WHERE playlistId = ?";
            let params = [
                element.playlistId
            ];

            let query = conn.query(sql, params, function(err, rows, fields) {
                if (err) throw (err); 

                //if the playlist doesn't exist, add it
                if(!rows[0]) {
                    let sql = "INSERT INTO playlists (playlistId, title, publishDate, videoCount) VALUES (?, ?, ?, ?)";
                    let params = [
                        element.playlistId,
                        element.title,
                        element.publishDate,
                        element.videoCount
                    ];

                    conn.query(sql, params, function(err, rows, fields) {
                        if (err) throw (err);

                        // confirm playlist was inserted
                        console.log("playlist added");
                    });
                } else { // if it does exist, update it
                    let sql = "UPDATE playlists SET title = ?, publishDate = ?, videoCount = ? WHERE playlistId = ?";
                    let params = [
                        element.title,
                        element.publishDate,
                        element.videoCount,
                        element.playlistId
                    ];

                    conn.query(sql, params, function(err, rows, fields) {
                        if (err) throw (err);

                        // confirm playlist was updated
                        console.log("playlist updated");
                    });
                }     
            });
        }

        // release pool connection when finished updating 
        conn.release();
    });
}

//updateDbPlaylists(key, rsiChannelId);

/* todo update with sql
 * this function gathers all desired info about every playlistItem and sends it to the database 
 * "playlistItems" table
 */
async function updateDbPlaylistItems(key, playlistId) {

    // get all videos from the specified playlist
    var playlistItems = await getPlaylistItems(key, playlistId, "", []);

    // create array of playlistItem objects for tidy sendoff
    var playlistItemObjects = [];

    /*
     * for each playlistItem, make a new object representing that playlistItem with the following data:
     * 
     * playlistItemId               (string)    - unique ID of the playlistItem
     * playlistItemTitle            (string)    - title of the playlistItem
     * playlistItemPublishDate      (datetime)  - date the video was added to the playlist
     * playlistItemDescription      (string)    - description of the playlistItem
     * playlistId                   (string)    - unique ID of the playlist associated with the playlistItem
     * videoId                      (string)    - unique ID of the video associated with the playlistItem
     * videoPublishDate             (datetime)  - publish date of the video associated with the playlistItem
     */
    // and add each object to the array of playlist objects
    for (var element of playlistItems) {
        // make sure the playlistItem is a video, otherwise we don't want it
        //var datetime = element.snippet.publishedAt
        if (element.snippet.resourceId.kind == "youtube#video") {
            playlistItemObjects.push({
                playlistItemId: element.id,
                playlistItemTitle: element.snippet.title,
                playlistItemPublishDate: element.snippet.publishedAt,
                playlistItemDescription: element.snippet.description,
                playlistId: element.snippet.playlistId,
                videoId: element.snippet.resourceId.videoId,
                videoPublishDate: element.contentDetails.videoPublishedAt
            });
        }
    }
    
    // return array of playlistItems correctly formatted for the database
    return playlistItemObjects;
}

//updateDbPlaylistItems(key, uploads);

/* todo update with sql
 * this function gathers all desired info about every video and sends it to the database "videos" table
 */
async function updateDbVideos(key) {

    // get all playlistItems from "uploads" playlist
    var playlistItems = await getPlaylistItems(key, uploads);
    
    // create array of playlistItem objects to easily get videoId of each video
    // var playlistItemObjects = [];
    // for (var playlistItem of playlistItems) {
    //     if (playlistItem.snippet.resourceId.kind == "youtube#video") {
    //         playlistItemObjects.push({
    //             videoId: playlistItem.snippet.resourceId.videoId,
    //         });
    //     }
    // }
    
    // create array of video objects for tidy sendoff
    var videoObjects = [];

    // for each video, make a new object representing that video with the specific data we want
    // and add it to the array of video objects
    for (var element of playlistItems) {
        console.log("video");
        if (element.snippet.resourceId.kind == "youtube#video") {
            //console.log(element.videoId);
            //var videoInfo = await getVideoInfo(key, element.videoId);
            // videoObjects.push({
            //     videoId: videoInfo.id,
            //     // title: element.snippet.title,
            //     // publishDate: element.snippet.publishedAt,
            //     // videoCount: element.contentDetails.itemCount,
            //     // videos: []
            // });
        }   
    }
    

    //todo: retrieve all videos from "uploads" playlist
            // 1. use getPlaylistItems to get all videos from "uploads" playlist

    // return array of videos correctly formatted for the database
    return videoObjects;
}

//updateDbVideos(key);

/* todo update with sql
 * this function gathers caption info for all videos and sends it to the database "captions" table
 */
async function updateDbCaptions(key, playlistId) {

    // get all videos from "uploads" playlist
    var videos = await getPlaylistItems(key, playlistId);
    
    // create array of caption objects for tidy sendoff
    var captionObjects = [];

    // for each caption track, make a new object associating the track with the correct videoId
    // and add it to the array of video objects
    for (var element of videos) {
        videoObjects.push({
            // playlistId: element.id,
            // title: element.snippet.title,
            // publishDate: element.snippet.publishedAt,
            // videoCount: element.contentDetails.itemCount,
            // videos: []
        });
    }
    //console.log(videoObjects);

    //todo: retrieve captions for all videos on the channel
            // 1. get list of all videos using getPlaylistItems and "uploads" playlistId
            // 2. fetch caption track for each video
            // 3. link caption track with correct videoId

    // var videos[] = getVideos(playlistId);

    var videoId = video0;
    
    //todo: get captions of each video
    var captions = await getSubtitles({videoID: video0});
    //console.log(captions);

    // return array of videos correctly formatted for the database
    return videoObjects;
}

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
        connectionLimit: 5,
        host: "remotemysql.com",
        user: "mrNBNedB7e",
        password: "LlEFgvnh9P",
        database: "mrNBNedB7e"
    });

    // confirm connection has been established
    pool.getConnection(function(err) {
        if (err) throw (err);
        console.log("Connected to database pool.");
    });

    return pool;
}



app.listen(3000, () => {
  console.log('server started');
});