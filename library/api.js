/**
 * This module contains all functions related to querying the Youtube Data API.
 * It should export the five following functions, and no more:
 * 
 * - getChannel
 * - getPlaylists
 * - getPlaylistItems
 * - getVideo
 * - getCaptions
 * 
 */

// get all config variables needed for API to function correctly
const {
    youtube,
    key,
    rsiChannelId,
    uploads
} = require('../config/config');



/*
 * Helpful notes for future reference
 * ______________________________________
 * 
 * Access order from channel to caption:
 * 
 * channel > playlists > playlistItems > videos > caption
 * 
 * apply youtube timestamp: &t=[minutes]m[seconds]s || &t=[seconds]
 */



//----------------API data acquisition functions----------------



/**
 * Get all available info about a channel via Youtube Data API
 * 
 * @param     {string}     key          API key that will be used to access the Youtube Data API
 * @param     {string}     channelId    ID of the channel that will be queried
 * 
 * @return    {promise}    channel      Returns a promise in JSON format containing info about the channel specified
 */
async function getChannel(key, channelId) {
    const res = await youtube.channels.list({
        auth: key,
        id: channelId,
        part: 'snippet, contentDetails, statistics'
    });

    // the first item in the response contains the info we need
    let channel = res.data.items[0];

    // return unfiltered channel info
    return channel;
}



/**
 * Get all available info about all playlists owned by a channel via Youtube Data API
 * 
 * @param     {string}     key            API key that will be used to access the Youtube Data API
 * @param     {string}     channelId      ID of the channel that will be queried
 * @param     {string}     pageToken      token that represents 1 page of results; used to access all pages recursively
 * @param     {array}      pageResults    array that contains all results on a page; next page's results are added to the
 *                                        array recursively
 * 
 * @return    {promise}    playlists      Returns a promise in JSON format containing info about all playlists owned by the
 *                                        channel
 */
async function getPlaylists(key, channelId, pageToken, pageResults) {
    const res = await youtube.playlists.list({
        auth: key,
        channelId: channelId,
        part: 'snippet, contentDetails',
        maxResults: 50,
        pageToken: pageToken
    });

    //1. get page results
    //2. append results to array
    //3. iterate to next page
    // repeat

    // loop through all pages available
    if (res.data['nextPageToken']) {    // if there's another token, first add all of the current page's items to pageResults, then go to the next page

        for (var item of res.data.items) {
            pageResults.push(item);
        }

        return getPlaylists(key, channelId, res.data.nextPageToken, pageResults);
    } else {    // when we get to the last page, add all of the page's items to pageResults, copy to playlists, and return playlists
        for (var item of res.data.items) {
            pageResults.push(item);
        }
            
        var playlists = pageResults;

        // return unfiltered info for all playlists owned by the channel
        return playlists;
    }
    //var playlistsJson = JSON.stringify(playlists, null, 4); // example of converting json to string while keeping formatting
}



/**
 * Get all available info about all playlistItems in a playlist via Youtube Data API
 * 
 * @param     {string}     key              API key that will be used to access the Youtube Data API
 * @param     {string}     playlistId       ID of the playlist that will be queried
 * @param     {string}     pageToken        token that represents 1 page of results; used to access all pages recursively
 * @param     {array}      pageResults      array that contains all results on a page; next page's results are added to the
 *                                          array recursively
 * 
 * @return    {promise}    playlistItems    Returns a promise in JSON format containing info about all playlistItems in a
 *                                          playlist
 */
async function getPlaylistItems(key, playlistId, pageToken, pageResults) {
    const res = await youtube.playlistItems.list({
        auth: key,
        playlistId: playlistId,
        part: 'snippet, contentDetails',
        maxResults: 50, // this is the max allowed, unfortunately
        pageToken: pageToken
    });

    //1. get page results
    //2. append results to array
    //3. iterate to next page
    // repeat

    // loop through all pages available
    if (res.data['nextPageToken']) {    // if there's another token, first add all of the current page's items to pageResults, then go to the next page

        for (var item of res.data.items) {
            pageResults.push(item);
        }

        return getPlaylistItems(key, playlistId, res.data.nextPageToken, pageResults);
    } else {    // when we get to the last page, add all of the page's items to pageResults, copy to playlistItems, and return playlistItems
        for (var item of res.data.items) {
            pageResults.push(item);
        }
            
        var playlistItems = pageResults;

        // return unfiltered info for all playlistItems in a playlist
        return playlistItems;
    }
}



/**
 * Get all available info about a video via Youtube Data API
 * 
 * @param     {string}     key        API key that will be used to access the Youtube Data API
 * @param     {string}     videoId    ID of the channel that will be queried
 * 
 * @return    {promise}    video      Returns a promise in JSON format containing info about the video specified
 */
async function getVideo(key, videoId) {
    const res = await youtube.videos.list({
        auth: key,
        id: videoId,
        part: 'snippet, contentDetails, status, statistics',
        maxResults: 50 
    });

    let video = res.data.items[0];       // get first video

    // return unfiltered video info
    return video;
}


/**
 * Get caption track of a video via youtube-captions-scraper
 * 
 * IF THIS FUNCTION IS RETURNING STATUS CODE 429 (too many requests), ENTER 'KILL 1' IN THE SHELL
 * 
 * @param     {string}    videoId         ID of the video that will be queried
 * 
 * @return    {string}    captionTrack    Returns a string containing captions for the video specified
 */
async function getCaptions(videoId) {

    // get captions from the video, with error checking for the server response
    let captions = await getSubtitles({ videoID: videoId, lang: 'en' })
        .catch(function (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error', error.message);
            }
        });

    // use this to convert promise response to a string (to be stored as a string in the database, or written to file)
    let captionTrack = JSON.stringify(captions, null, 4);

    // the following code can be used to write jsons to a file
    // fs.writeFile("test.txt", jsonData, function(err) {
    //     if (err) {
    //         console.log(err);
    //     }
    // });

    // return captions of the specified video as a stringified JSON
    return captionTrack;
}



module.exports = {
    getChannel,
    getPlaylists,
    getPlaylistItems,
    getVideo,
    getCaptions
};