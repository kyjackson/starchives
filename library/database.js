/**
 * This module contains all functions related to querying the database.
 * It should export the seven following functions, and no more:
 * 
 * - updateDb
 * - updateDbChannel
 * - updateDbPlaylists
 * - updateDbPlaylistItems
 * - updateDbVideos
 * - updateDbCaptions
 * - tableUpdate
 * 
 */

// get all config variables needed for database functions to work correctly
const {
    readline,
    pool,
    key,
    rsiChannelId,
    uploads,
    timer,
    event
} = require('../config/config');

// get all API functions needed for database functions to work correctly
const {
    getChannel,
    getPlaylists,
    getPlaylistItems,
    getVideo,
    getCaptions
} = require('./api');

// setup event listeners
event.on("interrupt", function listener() {
    process.readline.clearLine();
    process.readline.cursorTo(0);
});



//----------------DB Update Functions----------------



/* todo
 * Gather info from every updateDb function and update the database with it using SQL
 */
async function updateDb() {
    await timer(3000);
    console.log("All update functions will now execute synchronously, but may finish asynchronously!");

    // call all db update functions synchronously
    await timer(3000);
    await updateDbPlaylists(key, rsiChannelId);

    // await timer(3000);
    // await updateDbPlaylistItems(key, uploads);
    
    // await timer(3000);
    // await updateDbVideos(key);

    //await timer(3000);
    //updateDbCaptions(key, uploads);
}

//updateDb();

/**
 * Get info for all playlists, reformat it for the database, and update database if necessary
 * 
 * @param    {string}    key          API key for accessing the Youtube Data API
 * @param    {string}    channelId    ID of the channel to query
 */
async function updateDbPlaylists(key, channelId) {
    event.emit("interrupt");
    console.log("Now retrieving all playlists...");

    // get all playlists
    let playlists = await getPlaylists(key, rsiChannelId, "", []);

    event.emit("interrupt");
    console.log(`${playlists.length} playlists retrieved.`);
    
    // create array of playlist objects for tidy sendoff
    let playlistObjects = [];

    /*
     * for each playlist, make a new object representing that playlist with the following data:
     * 
     * playlistId         (string)          - unique ID of the playlist
     * title              (string)          - title of the playlist
     * publishDate        (datetime)        - data playlist was published
     * videoCount         (int)             - number of videos in the playlist
     */
    // and add each object to the array of playlist objects
    for (let element of playlists) {
        let datetime = element.snippet.publishedAt.replace("T", " ");
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
    await tableUpdate("playlists", playlistObjects, sql);
}



/**
 * Get info for all playlistItems in all playlists, reformat it for the database, and update database if necessary
 * 
 * @param    {string}    key           API key for accessing the Youtube Data API
 * @param    {string}    playlistId    ID of the playlist to query
 */
async function updateDbPlaylistItems(key, playlistId) {

    // create array to store playlistItems from every playlist; store all uploads in it instead if specified
    let playlistItemArray = await getPlaylistItems(key, uploads, "", []); // get every playlistItem in uploads playlist first

    // get all playlists first
    let playlists = await getPlaylists(key, rsiChannelId, "", []);

    event.emit("interrupt");
    console.log("Now retrieving all playlistItems. This will take a few minutes...");

    for await (let playlist of playlists) {
        let playlistItems = await getPlaylistItems(key, playlist.id, "", []); // get every playlistItem in each playlist

        for await (let playlistItem of playlistItems) {
            playlistItemArray.push(await playlistItem); // add all the playlistItems to one big array
        }
    }

    event.emit("interrupt");
    console.log(`${playlistItemArray.length} playlistItems retrieved.`);

    // create new array of playlistItem objects for tidy sendoff
    let playlistItemObjects = [];

    /*
     * for each playlistItem, make a new object representing that playlistItem with the following data:
     * 
     * playlistItemId                 (string)          - unique ID of the playlistItem
     * playlistItemTitle              (string)          - title of the playlistItem
     * playlistItemPublishDate        (datetime)        - date the video was added to the playlist
     * playlistItemDescription        (string)          - description of the playlistItem
     * playlistId                     (string)          - unique ID of the playlist associated with the playlistItem
     * videoId                        (string)          - unique ID of the video associated with the playlistItem
     * videoPublishDate               (datetime)        - publish date of the video associated with the playlistItem
     */
    // and add each object to the array of playlist objects
    for (let element of playlistItemArray) {
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
    await tableUpdate("playlistItems", playlistItemObjects, sql);
}



/**
 * Get info for all videos in "uploads" playlist (because we want all videos on the channel), reformat it for the database,
 * and update database if necessary
 * 
 * @param    {string}    key    API key for accessing the Youtube Data API
 */
async function updateDbVideos(key) {

    // get all playlistItems from "uploads" playlist
    let playlistItems = await getPlaylistItems(key, uploads, "", []);
    
    event.emit("interrupt");
    console.log("Now retrieving all videos. This will take a few minutes...");

    // create an array to hold detailed info for each video
    let videos = [];
    for await(let playlistItem of playlistItems) {
        // make sure the playlistItem is a video before we add it to the videos array
        if (playlistItem.snippet.resourceId.kind == "youtube#video") {
            let video = await getVideo(key, playlistItem.snippet.resourceId.videoId);
            videos.push(await video);
        }
    }

    // test db entry on one video because querying all uploads is costly (currently 1/6 of daily limit)
    // let video = await getVideo(key, playlistItems[0].snippet.resourceId.videoId);        
    // videos.push(await video);

    event.emit("interrupt");
    console.log(`${videos.length} videos retrieved.`);
    
    // create array of video objects for tidy sendoff
    let videoObjects = [];

    /*
     * for each video, make a new object representing that video with the following data:
     * 
     * videoId                  (string)          - unique ID of the video
     * videoTitle               (string)          - title of the video
     * videoPublishDate         (datetime)        - date the video was first published
     * videoDescription         (string)          - description of the video
     * videoThumbnails          (string)          - stringified JSON of the video's thumbnail info
     * videoDuration            (string)          - time length of the video
     * videoViewCount           (int)             - number of views for the video
     * videoLikeCount           (int)             - number of likes for the video
     * videoCommentCount        (int)             - number of comments for the video
     */

    // for each video, make a new object representing that video with the specific data we want
    // and add it to the array of video objects
    for (let element of videos) {
        let datetime = element.snippet.publishedAt.replace("T", " ");
        datetime = datetime.replace("Z", "");

        videoObjects.push({
            videoId: element.id,
            videoTitle: element.snippet.title,
            videoPublishDate: datetime,
            videoDescription: element.snippet.description,
            videoThumbnails: JSON.stringify(element.snippet.thumbnails.maxres, null, 4), // todo test if all thumbnail sizes can be stringified
            videoDuration: element.contentDetails.duration,
            videoViewCount: element.statistics.viewCount,
            videoLikeCount: element.statistics.likeCount,
            videoCommentCount: element.statistics.commentCount
        });
    }   

    // determine what queries need to be executed and the values they should carry
    let sql = {
        select: {
            query: "SELECT * FROM videos WHERE videoId = ?",
            params: [
                "videoId"
            ]
        },

        insert: {
            query: "INSERT INTO videos (videoId, videoTitle, videoPublishDate, videoDescription, videoThumbnails, videoDuration, videoViewCount, videoLikeCount, videoCommentCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params: [
                "videoId",
                "videoTitle",
                "videoPublishDate",
                "videoDescription",
                "videoThumbnails",
                "videoDuration",
                "videoViewCount",
                "videoLikeCount",
                "videoCommentCount"
            ]
        },

        update: {
            query: "UPDATE videos SET videoTitle = ?, videoPublishDate = ?, videoDescription = ?, videoThumbnails = ?, videoDuration = ?, videoViewCount = ?, videoLikeCount = ?, videoCommentCount = ? WHERE videoId = ?",
            params: [
                "videoTitle",
                "videoPublishDate",
                "videoDescription",
                "videoThumbnails",
                "videoDuration",
                "videoViewCount",
                "videoLikeCount",
                "videoCommentCount",
                "videoId"
            ]
        }
    }

    // the following example can be used to parse the thumbnail info of the first video result back into JSON format
    /*
        let videoThumbnails = await executeSQL(sql);
        let videoThumbnailsJson = JSON.parse(videoThumbnails[0].videoThumbnails);
    */

    // update the table with the correctly formatted objects using SQL
    await tableUpdate("videos", videoObjects, sql);
}



/**
 * Get captions for all video uploads, reformat them for the database, and update database if necessary
 * 
 * @param    {string}    key           API key for accessing the Youtube Data API
 * @param    {string}    playlistId    ID of the playlist to query
 */
async function updateDbCaptions(key, playlistId) {

    event.emit("interrupt");
    console.log("Now retrieving all caption tracks. This will take a while...");

    // get all videos from "uploads" playlist
    let playlistItems = await getPlaylistItems(key, playlistId, "", []);
    
    // create array of caption objects for tidy sendoff
    let captionObjects = [];

    // for each caption track, make a new object associating the track with the correct videoId
    // and add it to the array of video objects
    for (var i = 0; i < playlistItems.length; i++/*let playlistItem of playlistItems*/) {
        
        if (playlistItems[i].snippet.resourceId.kind == "youtube#video") {
            let dbCaptionTrack = await executeSQL(`SELECT * FROM captions WHERE videoId = '${playlistItems[i].snippet.resourceId.videoId}'`);

            if (!dbCaptionTrack[0]) {
                await timer(2000); // youtube gets overwhelmed by these requests quickly, so we'll set a delay
                let captions = await getCaptions(playlistItems[i].snippet.resourceId.videoId);
                captionObjects.push({
                    videoId: playlistItems[i].snippet.resourceId.videoId,
                    captionTrack: captions
                });
            } else {
                console.log(`Caption track for this video is already in the database. Skipping...`);
            }
        }
        //console.log(i);
    }

    event.emit("interrupt");
    console.log(`${captionObjects.length} caption tracks retrieved.`);

    // determine what queries need to be executed and the values they should carry
    let sql = {
        select: {
            query: "SELECT * FROM captions WHERE videoId = ?",
            params: [
                "videoId"
            ]
        },

        insert: {
            query: "INSERT INTO captions (videoId, captionTrack) VALUES (?, ?)",
            params: [
                "videoId",
                "captionTrack"
            ]
        },

        update: {
            query: "UPDATE captions SET captionTrack = ? WHERE videoId = ?",
            params: [
                "captionTrack",
                "videoId"
            ]
        }
    }
    
    //console.log(captionObjects.length);

    // update the table with the correctly formatted objects using SQL
    await tableUpdate("captions", captionObjects, sql);
}



/*
 * Update any database table using the table name, an array of objects correctly formatted for the table,
 * and an object consisting of SQL queries and parameters
 * 
 * @param    {string}    tableName       name of the database table to update
 * @param    {array}     dbReadyArray    array of correctly formatted objects that are ready to be sent to the database
 * @param    {object}    sql             object containing all relevant SQL queries and parameters
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
        console.log(`\nConnected to database pool. Updating ${tableName}...`); // confirm connection
        console.time(`Total ${tableName} update time`);

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
                    await process.stdout.cursorTo(0);
                    await process.stdout.write(`Checking item ${metadata.indexSelect} of ${metadata.total}...`);
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
                    await process.stdout.cursorTo(0);
                    await process.stdout.write(`Processing item ${metadata.indexModify} of ${metadata.total}...`);
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
        await Promise.all(promiseArray);

        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        console.log();
        console.log(`Update complete!`);
        console.log(`${tableName} inserted: ${metadata.inserts}`);
        console.log(`${tableName} updated: ${metadata.updates}`);
        console.log(`Total ${tableName} modified: ${metadata.total}`);
        console.timeEnd(`Total ${tableName} update time`);
        console.log();

        // release pool connection when finished updating 
        conn.release();
    });
}



//----------------Misc Functions----------------



// template function for simple database queries
async function executeSQL(sql, params) {

  return new Promise(async function(resolve, reject) {
    //let conn = dbConnection();
    await pool.getConnection(async function(err, conn) {
        conn.query(sql, params, function(err, rows, fields) {
            if (err) throw err;
            resolve(rows);
        });

        conn.release();
    });  
  });
}



// example function for accessing a database pool in an alternative way
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



module.exports = {
    updateDb,
    //todo updateDbChannel,
    updateDbPlaylists,
    updateDbPlaylistItems,
    updateDbVideos,
    updateDbCaptions,
    tableUpdate,
    executeSQL
};