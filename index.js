// set up package requirements
const express = require('express');
const mysql = require('mysql');

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// create the Express application
const app = express();

// set Express to use the EJS template engine, set "public" as root folder to serve from
app.set("view engine", "ejs");
app.use(express.static("public"));

// simplify youtube api access
const youtube = google.youtube('v3');
const key = 'AIzaSyD-QWKchiTP5CSzScpbR1kfddR_GGnm0ak';
const rsiChannelId = 'UCTeLqJq1mXUX5WWoNXLmOIA';
const playlist0 = 'PLVct2QDhDrB2HMkwQar8kZDPZP7ZdyIAC';

async function getChannelInfo(key) {
  const res = await youtube.channelSections.list({
    auth: key,
    channelId: rsiChannelId,
    part: 'snippet, contentDetails'
  });

  var channelItems = res.data.items;

  console.log(channelItems[0].contentDetails.playlists[0]);

  
  //console.log(res.status);
}

async function getPlaylists(key) {
  const res = await youtube.playlists.list({
    auth: key,
    channelId: rsiChannelId,
    part: 'snippet, contentDetails'
  });

  var playlistItems = res.data.items;

  console.log(playlistItems);
  //console.log(res.status);
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function getChannel(auth) {
  var service = google.youtube('v3');
  service.channels.list({
    auth: auth,
    part: 'snippet,contentDetails,statistics',
    forUsername: 'RobertsSpaceInd'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var channels = response.data.items;
    if (channels.length == 0) {
      console.log('No channel found.');
    } else {
      console.log(channels);
      console.log('This channel\'s ID is %s. Its title is \'%s\', and ' +
                  'it has %s views.',
                  channels[0].id,
                  channels[0].snippet.title,
                  channels[0].statistics.viewCount);
    }
  });
}

//getChannel(key);

//getChannelInfo(key);

getPlaylists(key);

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

//---------------------------------------------Database and query setup---------------------------------------------------

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