// set up package requirements for server
const express = require('express');
//const fs = require('fs');
//const buffer = require('buffer');
//const readline = require('readline');
//const https = require('https');

// initialize local modules
const config = require('./config/config');
const api = require('./library/api');
const database = require('./library/database');

// create the Express application
const app = express();

// set Express to use the EJS template engine, set "public" as folder to serve clients from
app.set("view engine", "ejs");
app.use(express.static("public"));



//----------------Start server and initialize update routine----------------



// start server
app.listen(3000, () => {
  console.log('server started');
});

// in one fell swoop, update everything
update();

// database update should occur once every day at midnight
async function update() {
    await database.updateDb();
}

// stats update should occur once every hour



//----------------Routes examples----------------



// home route
app.get('/', (req, res) => {
    res.render('home');
});

// library route
app.get('/library', (req, res) => {
  res.render('library')
});

// about route
app.get('/about', (req, res) => {
  res.render('about')
});

// endpoint testing
app.get('/playlists', async (req, res) => {
    // get playlists
    let sql = "SELECT * FROM playlists";
    let results = await database.executeSQL(sql);

    res.send(results);
})



//----------------Search-specific examples----------------



// search endpoint
app.get('/results', async (req, res) => {

    let query = req.query.query;

    let sql = `SELECT * FROM videos NATURAL JOIN captions WHERE captionTrack LIKE ? `;
    let params = [`%${query}%`];

    let results = await database.executeSQL(sql, params);

    res.send(results);
});



// advanced search endpoint todo
app.get('/library/results', async (req, res) => {

    let query = req.query.query;

    let sql = `SELECT * FROM videos NATURAL JOIN captions WHERE captionTrack LIKE ? `;
    let params = [`%${query}%`];

    let results = await database.executeSQL(sql, params);

    res.send(results);
});

//search results route
// app.get("/results", async function(req, res) {

//   let term = req.query.keyword;

//   let sql = `SELECT videoId FROM captions WHERE captionTrack LIKE ?`;
//   let params = [`%${term}%`]

//   if (req.query.authorId) { //if author was selected (if authorId has any value)
//     sql += "AND authorId = ? ";
//     params.push(req.query.authorId);
//   }

//   if (req.query.category) {
//     sql += "AND category = ? ";
//     params.push(req.query.category);
//   }

//   let rows = await database.executeSQL(sql, params);
//   res.render('results', { "rows": rows });
// });
