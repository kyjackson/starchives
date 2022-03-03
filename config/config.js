/**
 * All sensitive info regarding API, DB, and other necessary functions of the project should be located
 * in this file. Once the website is live, this file should not be committed.
 */

// set up package requirements for exports
const readline = require('readline');
const mysql = require('mysql');
const {google} = require('googleapis');
const {getSubtitles}  = require('youtube-captions-scraper');
const EventEmitter = require('events');

// create RemoteMySQL database pool connection
const pool = mysql.createPool({
    connectionLimit: 5,
    host: "remotemysql.com",
    user: "mrNBNedB7e",
    password: "LlEFgvnh9P",
    database: "mrNBNedB7e",
    multipleStatements: true
});

// simplify youtube api access
const youtube = google.youtube('v3');
const key = 'AIzaSyD-QWKchiTP5CSzScpbR1kfddR_GGnm0ak';
const rsiChannelId = 'UCTeLqJq1mXUX5WWoNXLmOIA';
const uploads = 'UUTeLqJq1mXUX5WWoNXLmOIA'; // playlistId for the playlist that contains every video on the channel
const testVideo = 'RgmBWBldFZM'; // saved video ID for testing purposes

// helpers
const timer = ms => new Promise(res => setTimeout(res, ms));
const event = new EventEmitter();

module.exports = {
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
