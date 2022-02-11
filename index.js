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

async function update() {
    await database.updateDb();
}



//----------------Routes examples----------------



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



//----------------Search-specific examples----------------



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
