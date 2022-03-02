// set up package requirements for server
const express = require('express');
const cookieParser = require('cookie-parser');
//const fs = require('fs');
//const buffer = require('buffer');

//const https = require('https');

// initialize local modules
const config = require('./config/config');
const api = require('./library/api');
const database = require('./library/database');

// create the Express application
const app = express();

// set Express to use the EJS template engine, set "public" as folder to serve clients from, enable cookie parser
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(cookieParser());



//----------------Start server and initialize update routine----------------



// start server
app.listen(8080, () => {
  console.log('server started');
});

// in one fell swoop, update everything
update();

// database update should occur once every week at midnight
async function update() {
    await database.updateDb();
}

// stats update should occur once every hour



//----------------Routes----------------



// home route
app.get('/', (req, res) => {
    res.render('home');
});

// stats route
app.get('/stats', (req, res) => {
  res.render('stats');
});

// about route
app.get('/about', (req, res) => {
  res.render('about');
});



//----------------Endpoints----------------



// search endpoint
app.get('/results', async (req, res) => {
    // fix samesite cookie problem
    //response.setHeader('Set-Cookie', ['type=ninja', 'language=javascript']);
    //res.cookie('SIDCC', 'value', { sameSite: 'none', secure: true });

    let query = req.query.query;

    let sql = `SELECT * FROM videos NATURAL JOIN captions WHERE (captionTrack LIKE ?) `;
    let params = [`%${query}%`];

    console.log(req.query);

    if (req.query.date) {
        sql += "AND videoPublishDate LIKE ?"
        params.push(`${req.query.date}%`);
        //console.log(req.query.date);
    }

    if (req.query.duration) {
        // sql += "AND videoDuration LIKE ? "
        // params.push(req.query.date);
        console.log(req.query.duration);
    }

    if (req.query.orderBy) {
        // sql += "ORDER BY ? "
        // params.push(req.query.orderBy);
        console.log(req.query.orderBy);
    }

    if (req.query.order) {
        // sql += "DESC "
        // params.push(req.query.order);
        console.log(req.query.order);
    }

    sql += "LIMIT 100";

    let results = await database.executeSQL(sql, params);

    function paginate(array, pageSize, pageNumber) {
        return array.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize);   
    }

    // at most, we want 10 videos per page of results
    let pages = 0;
    if (results.length > 10) {
        pages = results.length / 10;
    }
    
    let resultsPages = [];
    for (let i = 0; i <= pages; i++) {
        resultsPages.push(paginate(results, 10, i));
    }

    // remove the last page if it's empty
    if (results.length % 10 == 0) {
        resultsPages.pop();
    }

    res.send(resultsPages);
});



// endpoint testing
app.get('/playlists', async (req, res) => {
    // get playlists
    let sql = "SELECT * FROM playlists";
    let results = await database.executeSQL(sql);

    res.send(results);
})

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
