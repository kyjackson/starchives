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

// start server
app.listen(3000, () => {
  console.log('server started');
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
    const timer = ms => new Promise(res => setTimeout(res, ms));

    // call all db update functions at the same time

    //updateDbPlaylists(key, rsiChannelId);
    //await timer(3000);

    // await updateDbPlaylistItems(key, uploads);
    // await timer(10000);

    updateDbVideos(key);
    await timer(10000);

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

    // determine what queries need to be executed and the values they should carry
    let sql = {
        select: {
            query: "SELECT * FROM playlists WHERE playlistId = ?",
            params: [
                "playlistId"
            ]
        },

        insert: {
            query: "INSERT INTO playlists (playlistId, title, publishDate, videoCount) VALUES (?, ?, ?, ?)",
            params: [
                "playlistId",
                "title",
                "publishDate",
                "videoCount"
            ]
        },

        update: {
            query: "UPDATE playlists SET title = ?, publishDate = ?, videoCount = ? WHERE playlistId = ?",
            params: [
                "title",
                "publishDate",
                "videoCount",
                "playlistId"
            ]
        }
    }

    // update the table with the correctly formatted objects using SQL
    return new Promise(async function (resolve) {
        await tableUpdate("playlists", playlistObjects, sql);
        resolve(console.log("Update complete"));
    });
    
}

//updateDbPlaylists(key, rsiChannelId);

/* todo get all playlistitems on channel instead of just in uploads playlist
 * this function gathers all desired info about every playlistItem and sends it to the database 
 * "playlistItems" table
 */
async function updateDbPlaylistItems(key, playlistId) {

    // create array to store playlistItems from every playlist; store all uploads in it instead if specified
    var playlistItemArray = await getPlaylistItems(key, uploads, "", []); // get every playlistItem in uploads playlist first

    // if (playlistId == uploads) {
    //     console.log("Fetching all playlistItems (uploads only)...");
    //     playlistItemArray = await getPlaylistItems(key, uploads, "", []); // get every playlistItem in uploads playlist
    //     console.log(`${playlistItemArray.length} playlistItems fetched (uploads only).`);
    // } else {
        // get all playlists first
    var playlists = await getPlaylists(key, rsiChannelId, "", []);

    console.log("Fetching all playlistItems...");
    for await (let playlist of playlists) {
        var playlistItems = await getPlaylistItems(key, playlist.id, "", []); // get every playlistItem in each playlist

        for await (let playlistItem of playlistItems) {
            playlistItemArray.push(await playlistItem); // add all the playlistItems to one big array
        }
    }

    console.log(`${playlistItemArray.length} playlistItems fetched.`);
    // }

    // create new array of playlistItem objects for tidy sendoff
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
    for (var element of playlistItemArray) {
        let datetime = element.snippet.publishedAt.replace("T", " ");
        datetime = datetime.replace("Z", "");

        // make sure the playlistItem is a video, otherwise we don't want it
        if (element.snippet.resourceId.kind == "youtube#video") {
            playlistItemObjects.push({
                playlistItemId: element.id,
                playlistItemTitle: element.snippet.title,
                playlistItemPublishDate: datetime,
                //playlistItemDescription: element.snippet.description,
                playlistId: element.snippet.playlistId,
                videoId: element.snippet.resourceId.videoId
                //videoPublishDate: element.contentDetails.videoPublishedAt
            });
        }
    }

    // determine what queries need to be executed and the values they should carry
    let sql = {
        select: {
            query: "SELECT * FROM playlistItems WHERE playlistItemId = ?",
            params: [
                "playlistItemId"
            ]
        },

        insert: {
            query: "INSERT INTO playlistItems (playlistItemId, playlistItemTitle, playlistItemPublishDate, playlistId, videoId) VALUES (?, ?, ?, ?, ?)",
            params: [
                "playlistItemId",
                "playlistItemTitle",
                "playlistItemPublishDate",
                "playlistId",
                "videoId"
            ]
        },

        update: {
            query: "UPDATE playlistItems SET playlistItemTitle = ?, playlistItemPublishDate = ?, playlistId = ?, videoId = ? WHERE playlistItemId = ?",
            params: [
                "playlistItemTitle",
                "playlistItemPublishDate",
                "playlistId",
                "videoId",
                "playlistItemId"
            ]
        }
    }

    // update the table with the correctly formatted objects using SQL
    return new Promise(async function (resolve) {
        resolve(await tableUpdate("playlistItems", playlistItemObjects, sql));
    });
    
    
}

//updateDbPlaylistItems(key, uploads);

/* todo update with sql
 * this function gathers all desired info about every video and sends it to the database "videos" table
 */
async function updateDbVideos(key) {

    // get all playlistItems from "uploads" playlist
    var playlistItems = await getPlaylistItems(key, uploads, "", []);
    
    // create an array to hold detailed info for each video
    var videos = [];

    for await(let playlistItem of playlistItems) {
        // make sure the playlistItem is a video before we add it to the videos array
        if (playlistItem.snippet.resourceId.kind == "youtube#video") {
            let video = await getVideoInfo(key, playlistItem.snippet.resourceId.videoId);
            
            videos.push(await video);
            //console.log(video);
        }
    }
    
    // create array of video objects for tidy sendoff
    var videoObjects = [];

    // for each video, make a new object representing that video with the specific data we want
    // and add it to the array of video objects
    for (var element of videos) {
        //console.log(element.videoId);
        videoObjects.push({
            videoId: element.id,
            videoTitle: element.snippet.title,
            videoPublishDate: element.snippet.publishedAt,
            videoDescription: element.snippet.description,
            videoThumbnails: element.snippet.thumbnails,
            videoDuration: element.contentDetails.duration,
            videoViewCount: element.statistics.viewCount,
            videoLikeCount: element.statistics.likeCount,
            videoCommentCount: element.statistics.commentCount
        });
          
    }   

    //todo: retrieve all videos from "uploads" playlist
            // 1. use getPlaylistItems to get all videos from "uploads" playlist

    // return array of videos correctly formatted for the database
    console.log(videoObjects);
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

// template function for querying the database 
async function executeSQL(sql, params) {

  return new Promise(function(resolve, reject) {
    let conn = dbConnection();

    conn.query(sql, params, function(err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });

}



// template function for accessing the database using a connection pool
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



/*
 * this function updates any database table using the table name, an array of objects correctly formatted for the table,
 * and an array of SQL objects consisting of queries and parameters
 */
async function tableUpdate(tableName, dbReadyArray, sql) {

    let metadata = {
        updates: 0,                     // number of rows updated
        inserts: 0,                     // number of rows inserted
        indexSelect: 0,                 // index of SQL select operations
        indexModify: 0,                 // index of SQL insert/update operations
        total: dbReadyArray.length      // total number of objects fetched by Youtube Data API
    };

    // connect to the database connection pool before performing SQL operations
    await pool.getConnection(async function(err, conn) {
        if (err) throw (err);
        console.log(`\nConnected to database connection pool. Updating ${tableName}...`); // confirm connection

        // for each object, check if it exists in the database; if not, insert it
        let promiseArray = dbReadyArray.map(async function (element) {   // promisify each SQL execution so we can easily keep track of the quantity

            // first check if the object is already in the database
            let query = sql.select.query;
            let params = [];
            for (let key of sql.select.params) {
                params.push(element[key]);
            }

            let selectQuery = new Promise(function (resolve) {
                pool.query(query, params, async function(err, rows, fields) {
                    if (err) throw (err); 

                    // compactly log objects as they're iterated through
                    metadata.indexSelect++;
                    process.stdout.cursorTo(0);
                    process.stdout.write(`Checking item ${metadata.indexSelect} of ${metadata.total}...`);
                    if (metadata.indexSelect == metadata.total) {
                        process.stdout.clearLine();
                    }

                    //if the object doesn't exist, add it
                    if(!rows[0]) {
                        let query = sql.insert.query;
                        let params = [];
                        for (let key of sql.insert.params) {
                            params.push(element[key]);
                        }

                        let insertQuery = new Promise(async function(resolve) {
                            pool.query(query, params, function(err, rows, fields) {
                                if (err) throw (err);

                                // increment tally of inserts
                                resolve(metadata.inserts++);
                            });
                        });

                        // wait for the insert query to complete before proceeding to the next element
                        await insertQuery;
                    } else { // if it does exist, update it
                        let query = sql.update.query;
                        let params = [];
                        for (let key of sql.update.params) {
                            params.push(element[key]);
                        }

                        let updateQuery = new Promise(async function(resolve) {   
                            pool.query(query, params, function(err, rows, fields) {
                                if (err) throw (err);
                                
                                // increment tally of updates
                                resolve(metadata.updates++);
                            }); 
                        });

                        // wait for the update query to complete before proceeding to the next element
                        await updateQuery;   
                    }

                    // resolve the select query before proceeding to the next element
                    resolve(metadata.indexModify++);

                    // compactly log playlists as they're iterated through
                    process.stdout.cursorTo(0);
                    process.stdout.write(`Processing item ${metadata.indexModify} of ${metadata.total}...`);
                });
            });

            // wait for the select query to complete before proceeding to the next element
            await selectQuery;
            return selectQuery; // the playlistPromiseArray gets filled with the return values of each selectQuery

            // console.log("update"); *for debugging*

            // resolve the outermost promise before adding it to the array
            resolve(metadata);
        }); 

        // wait for all SQL operations to complete, then log the amount of each type that occurred
        let promises = Promise.all(promiseArray);
        await promises;
        
        promises.then(function() {

        });
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        console.log();
        console.log(`Update complete!`);
        console.log(`${tableName} inserted: ${metadata.inserts}`);
        console.log(`${tableName} updated: ${metadata.updates}`);
        console.log(`Total ${tableName} modified: ${metadata.total}\n`);

        // release pool connection when finished updating 
        conn.release();
    });
}



