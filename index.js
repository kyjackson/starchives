// set up package requirements for server and create the Express application
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const app = express();
//const cookieParser = require('cookie-parser'); ---- disabled until determined necessary

// initialize local modules
const config = require('./config/config');
const database = require('./library/database');

// set up helmet
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                // the following sites must be whitelisted for Starchives to work properly
                "script-src": ["'self'", "https: 'unsafe-inline'", "starchives.org", "www.youtube.com", "code.jquery.com", "cdn.jsdelivr.net"],
                "default-src": ["starchives.org", "www.youtube.com", "localhost:8080"],
            },
        },

        crossOriginEmbedderPolicy: false,

        crossOriginResourcePolicy: {
            policy: "cross-origin"
        }
    })
);

// enable compression;
// set Express to use the EJS template engine;
// set "public" as folder to serve clients from;
// enable parsing of POST requests;
app.use(compression());
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }))
// app.use(cookieParser()); ---- disabled until determined necessary



//----------------Start server and initialize update routine----------------



// start server
app.listen(config.port || 8080, () => {
    // confirm environment variables on server start
    console.log(`Server started on port ${config.port}.`);
});

// in one fell swoop, update everything
// updateDb(); ---- disabled until automatic updates are more thoroughly tested

// update automatically at regular interval
async function automatedUpdate() {

}

// database update should occur once every week at midnight
async function updateDb() {
    await database.updateDb();
}



//----------------Routes----------------



// home route
app.get('/', (req, res) => {
    res.set({
        "Cache-Control": "public, max-age=604800"
    });

    res.render('home');
});

// about route
app.get('/about', (req, res) => {
    res.set({
        "Cache-Control": "public, max-age=604800"
    });

    res.render('about');
});



//----------------Endpoints----------------



// search endpoint
app.get('/results', async (req, res) => {
    // fix samesite cookie problem
    // res.cookie('SIDCC', 'value', { sameSite: 'none', secure: true }); ---- more research required
    res.set({
        "Cache-Control": "public, max-age=86400, no-cache"
        // "Clear-Site-Data": "cache" // use this if cache becomes corrupted
    });

    // get sql and params from buildQuery
    let sql = buildQuery(req).bsql;
    let params = buildQuery(req).bparams;

    sql += "LIMIT 10 ";
    
    if (req.query.page) {
        let page = req.query.page * 10;
        sql += `OFFSET ${page}`;
    }

    let results = await database.executeSQLMainDB(sql, params);

    /*
     * note: When using the function executeSQLTestDB (which includes an additional SQL statement in the query),
     *       results will return an additonal outer array, therefore we use results[1] to access the correct info.
     *       
     *       The following commented code provides a function that paginates the results of a database query,
     *       and allows defining of the page size so that any amount of videos can be retrieved with one API call
     *       while still having pagination.
     * 
     *       This custom pagination is no longer needed for the live environment, but is necessary for the test environment
     *       and any other database where ALLOW_INVALID_DATES cannot be enabled globally.
     */

    // function paginate(array, pageSize, pageNumber) {
    //     return array.slice(pageNumber * pageSize, pageNumber * pageSize + pageSize);   
    // }

    // // at most, we want 10 videos per page of results
    // let pages = 0;
    // let pageSize = 10;

    // if (results[1].length > pageSize) {
    //     pages = results[1].length / pageSize;
    // }
    
    // let resultsPages = [];
    // for (let i = 0; i <= pages; i++) {
    //     resultsPages.push(paginate(results[1], pageSize, i));
    // }

    // // remove the last page if it's empty
    // if (resultsPages[resultsPages.length-1].length == 0) {
    //     resultsPages.pop();
    // }
    
    // res.send(resultsPages);

    res.send(results);
});



// get length of results separately from actual results to improve response times
app.get('/resultsLength', async (req, res) => {
    res.set({
        "Cache-Control": "public, max-age=86400, no-cache"
        // "Clear-Site-Data": "cache" // use this if cache becomes corrupted
    });

    // get sql and params from buildQuery
    let sql = buildQuery(req).bsql;
    let params = buildQuery(req).bparams;

    sql = sql.replace("*", "COUNT(*) AS count");

    //sql += "LIMIT 100;";
    let results = await database.executeSQLMainDB(sql, params);
    let resultsLength = {
        length: results[0].count
    };

    // let resultsLength = {
    //     length: results[1][0].count
    // };

    res.send(resultsLength);
});



// receive contact forms and send to admin email
app.post('/contact', async (req, res) => {
    let form = req.body;

    let mail = {
        from: `"${form.sender}" admin@starchives.org`,
        to: "admin@starchives.org",
        subject: `[Starchives Feedback] - ${form.topic}`,
        text: form.message
    };

    let transaction = await config.sendEmail(mail, async function (err, info) {
        if (err) throw err;
        return info;
    });

    if (transaction.accepted) {
        res.send(transaction);
    }
});



// endpoint testing
app.get('/playlists', async (req, res) => {
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
        // searching with LIKE seems to perform better under load than using the FULLTEXT index in most cases,
        // so this will remain as it is for now
        sql += `captionTrack LIKE ? `;
        params.push(`%${query}%`);
        // sql += `MATCH(captionTrack) AGAINST( ? IN BOOLEAN MODE) `;
        // params.push(`"${query}"`);
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
