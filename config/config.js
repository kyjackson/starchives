/**
 * All sensitive info regarding API, DB, and other necessary functions of the project should be located
 * in this file. Once the website is live, this file should not be committed.
 */

// set up package requirements for exports
const dotenv = require('dotenv');
dotenv.config();

const readline = require('readline');
const mysql = require('mysql');
const {google} = require('googleapis');
const {getSubtitles}  = require('youtube-captions-scraper');
const EventEmitter = require('events');

// simplify youtube api access
const youtube = google.youtube('v3');
const key = process.env.API;
const rsiChannelId = 'UCTeLqJq1mXUX5WWoNXLmOIA';
const uploads = 'UUTeLqJq1mXUX5WWoNXLmOIA'; // playlistId for the playlist that contains every video on the channel

// create RemoteMySQL database pool connection
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB,

    connectionLimit: 10,
    multipleStatements: true
});

// const pool = mysql.createPool({
//     host: process.env.OLD_HOST,
//     port: process.env.OLD_PORT,
//     user: process.env.OLD_USER,
//     password: process.env.OLD_PASS,
//     database: process.env.OLD_DB,

//     connectionLimit: 5,
//     multipleStatements: true
// });

// helpers
const timer = ms => new Promise(res => setTimeout(res, ms));
const event = new EventEmitter();

module.exports = {
    port: process.env.PORT,

    readline,
    pool,
    youtube,
    key,
    rsiChannelId,
    uploads,
    getSubtitles,
    timer,
    event
};
