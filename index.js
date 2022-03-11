// set up package requirements for server
const compression = require('compression');
const express = require('express');
const cookieParser = require('cookie-parser');


// initialize local modules
const config = require('./config/config');
const database = require('./library/database');

// create the Express application
const app = express();

// set Express to use the EJS template engine, set "public" as folder to serve clients from, enable cookie parser
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(express.static("public"));
// app.use(compression({
//     filter: function () { return true;}
// }));



//----------------Start server and initialize update routine----------------



// start server
app.listen(config.port || 8080, () => {
    // confirm environment variables on server start
    console.log(`Server started on port ${config.port}.`);
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



const autocannon = require('autocannon');

async function loadTest() {
    let instance = autocannon({
        url: 'http://localhost:8080/results?query=caterpillar',
        connections: 100, 
        amount: 100,
        //pipelining: 1, 
        //duration: 60,
        timeout: 15
    }, console.log);

    autocannon.track(instance, { renderProgressBar: true });
    
}

// loadTest();

//----------------Routes----------------



// home route
app.get('/', (req, res) => {
    res.render('home');
});

// about route
app.get('/about', (req, res) => {
  res.render('about');
});



//----------------Endpoints----------------



// search endpoint
app.get('/results', async (req, res) => {
    // fix samesite cookie problem
    //res.cookie('SIDCC', 'value', { sameSite: 'none', secure: true });

    // get sql and params from buildQuery
    let sql = buildQuery(req).bsql;
    let params = buildQuery(req).bparams;

    sql += "LIMIT 10 ";
    
    if (req.query.page) {
        let page = req.query.page * 10;
        sql += `OFFSET ${page}`;
    }

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



// get length of results separately from actual results to improve response times
app.get('/resultsLength', async (req, res) => {

    // get sql and params from buildQuery
    let sql = buildQuery(req).bsql;
    let params = buildQuery(req).bparams;

    sql = sql.replace("*", "COUNT(*) AS count");

    //sql += "LIMIT 100;";
    let results = await database.executeSQLFromServer(sql, params);
    let resultsLength = {
        length: results[1][0].count
    };

    res.send(resultsLength);
});



// endpoint testing
app.get('/playlists', async (req, res) => {
    // get playlists
    let sql = "SELECT * FROM playlists";
    let results = await database.executeSQL(sql);

    res.send(results);
})



//----------------Endpoint helper functions----------------



function buildQuery(req) {
    let query = req.query.query;
    let sql = `SELECT *,
    CASE
        WHEN videoDuration LIKE 'PT%H%M%S' THEN STR_TO_DATE(videoDuration, 'PT%hH%iM%sS')
        WHEN videoDuration LIKE 'PT%H%M' THEN STR_TO_DATE(videoDuration, 'PT%hH%iM')
        WHEN videoDuration LIKE 'PT%H%S' THEN STR_TO_DATE(videoDuration, 'PT%hH%sS')
        WHEN videoDuration LIKE 'PT%H' THEN STR_TO_DATE(videoDuration, 'PT%hH')
        WHEN videoDuration LIKE 'PT%M%S' THEN STR_TO_DATE(videoDuration, 'PT%iM%sS')
        WHEN videoDuration LIKE 'PT%M' THEN STR_TO_DATE(videoDuration, 'PT%iM')
        WHEN videoDuration LIKE 'PT%S' THEN STR_TO_DATE(videoDuration, 'PT%sS')
    END AS duration
    FROM videos NATURAL JOIN captions WHERE `;
    let params = [];

    if (query) {
        sql += `captionTrack LIKE ? `;
        params.push(`%${query}%`);
    } else {
        sql += `1 `;
    }
    

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
            case "4": // STR_TO_DATE(videoDuration, 'PT%hH%iM%sS') AS duration
                // reference: https://stackoverflow.com/questions/33172258/get-iso-8601scorm-2004-duration-format-in-seconds-using-mysql
                sql += `ORDER BY duration `;
                    // `
                    // ${sql.slice(0, 8)}, videoDuration, 
                    // CASE
                    //     WHEN videoDuration LIKE 'PT%H%M%S' THEN STR_TO_DATE(videoDuration, 'PT%hH%iM%sS')
                    //     WHEN videoDuration LIKE 'PT%H%M' THEN STR_TO_DATE(videoDuration, 'PT%hH%iM')
                    //     WHEN videoDuration LIKE 'PT%H%S' THEN STR_TO_DATE(videoDuration, 'PT%hH%sS')
                    //     WHEN videoDuration LIKE 'PT%H' THEN STR_TO_DATE(videoDuration, 'PT%hH')
                    //     WHEN videoDuration LIKE 'PT%M%S' THEN STR_TO_DATE(videoDuration, 'PT%iM%sS')
                    //     WHEN videoDuration LIKE 'PT%M' THEN STR_TO_DATE(videoDuration, 'PT%iM')
                    //     WHEN videoDuration LIKE 'PT%S' THEN STR_TO_DATE(videoDuration, 'PT%sS')
                    // END AS duration
                    // ${sql.slice(9)}ORDER BY duration `;
                break;
            default:
        }

        if (req.query.order == "ASC") {
            sql += 'ASC ';
        } else {
            sql += 'DESC ';
        }
    }

    let builtQuery = {
        bsql: sql,
        bparams: params
    }

    return builtQuery;
}
