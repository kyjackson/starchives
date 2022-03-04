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
const stats = require('./library/stats');

// create the Express application
const app = express();

// set Express to use the EJS template engine, set "public" as folder to serve clients from, enable cookie parser
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(cookieParser());

// initialize variable for sending stats to the stats page
let statsObject;



//----------------Start server and initialize update routine----------------



// start server
app.listen(8080, () => {
  console.log('server started');
});

// in one fell swoop, update everything
//updateDb();

// update automatically at regular interval
async function automatedUpdate() {

}

// database update should occur once every week at midnight
async function updateDb() {
    await database.updateDb();
}

// stats update should occur 1 hour after the database update
async function updateStats() {
    
}



//----------------Routes----------------



// home route
app.get('/', (req, res) => {
    res.render('home');
});

// stats route
app.get('/stats', (req, res) => {
    res.render('stats', {
        "stats": statsObject
    });
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

    let sql = `SELECT * FROM videos NATURAL JOIN captions WHERE captionTrack LIKE ? `;
    let params = [`%${query}%`];

    if (req.query.date) {
        sql += 'AND videoPublishDate LIKE ? ';
        params.push(`${req.query.date}%`);
    }

    if (req.query.duration) {
        switch (req.query.duration) {
            case "1":
                sql += 'AND videoDuration LIKE ? ';
                break;
            case "2":
                sql += `AND videoDuration NOT LIKE ? AND (videoDuration BETWEEN CONCAT('PT', 30, 'M%') AND CONCAT('PT', 60, 'M%')) `;
                break;
            case "3":
                sql += `AND videoDuration NOT LIKE ? AND (videoDuration BETWEEN CONCAT('PT', 15, 'M%') AND CONCAT('PT', 30, 'M%')) `;
                break;
            case "4":
                sql += `AND videoDuration NOT LIKE ? AND (STR_TO_DATE(videoDuration, 'PT%iM%sS') < '00:15:00') `;
                break;
            default:
        }
        params.push(`PT%H%`);
    }

    if (req.query.orderBy) {
        switch (req.query.orderBy) {
            case "1":
                sql += 'ORDER BY videoPublishDate ';
                break;
            case "2":
                sql += `ORDER BY videoViewCount `;
                break;
            case "3":
                sql += `ORDER BY videoLikeCount `;
                break;
            default:
        }

        if (req.query.order == "ASC") {
            sql += 'ASC ';
        } else {
            sql += 'DESC ';
        }
    }

    sql += "LIMIT 100;";
    console.log(sql);
    let results = await database.executeSQLFromServer(sql, params);

    function paginate(array, pageSize, pageNumber) {
        return array.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize);   
    }

    // at most, we want 10 videos per page of results
    let pages = 0;
    let pageSize = 10;

    // note: when using the function executeSQLFromServer (which includes an additional SQL statement in the query),
    //       results will return an additonal outer array, therefore we use results[1] to access the correct info.
    if (results[1].length > pageSize) {
        pages = results[1].length / pageSize;
    }
    
    let resultsPages = [];
    for (let i = 0; i <= pages; i++) {
        resultsPages.push(paginate(results[1], pageSize, i));
    }

    // remove the last page if it's empty
    if (resultsPages[resultsPages.length-1].length == 0) {
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
