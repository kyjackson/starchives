/**
 * All setup functions and variables required for the server and database to operate and update correctly
 * should be located in this file. Sensitive info is not committed.
 */

// set up package requirements for exports
const dotenv = require('dotenv');
dotenv.config();

const readline = require('readline');
const mysql = require('mysql');
const nodemailer = require("nodemailer");
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const { getSubtitles } = require('youtube-captions-scraper');
const EventEmitter = require('events');

// simplify youtube api access
const youtube = google.youtube('v3');
const key = process.env.API;
const rsiChannelId = 'UCTeLqJq1mXUX5WWoNXLmOIA';
const uploads = 'UUTeLqJq1mXUX5WWoNXLmOIA'; // playlistId for the playlist that contains every video on the channel

// define and initialize database connection pool
const liveDb = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB,

    connectionLimit: 10,
    multipleStatements: true
};

const testDb = {
    host: process.env.OLD_HOST,
    port: process.env.OLD_PORT,
    user: process.env.OLD_USER,
    password: process.env.OLD_PASS,
    database: process.env.OLD_DB,

    connectionLimit: 5,
    multipleStatements: true
};

const pool = mysql.createPool(liveDb);



// set up OAuth2 and mail transporter in one function
const createTransporter = async () => {
    
    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.REFRESH_TOKEN
    });

    const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err) reject(err);

            resolve(token);
        });
    });

    // set up mail client
    let mailTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: "admin@starchives.org",
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: accessToken
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    return mailTransporter;
};

// easily send mail
const sendEmail = async (mail) => {
    let transporter = await createTransporter();
    let receipt = await transporter.sendMail(mail);
    return receipt;
};



// helpers
const timer = ms => new Promise(res => setTimeout(res, ms));
const event = new EventEmitter();

module.exports = {
    port: process.env.PORT,

    readline,
    pool,
    sendEmail,
    youtube,
    key,
    rsiChannelId,
    uploads,
    getSubtitles,
    timer,
    event
};
