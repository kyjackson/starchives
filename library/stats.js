/**
 * This module reads the database to get a set of stats that may be of particular interest.
 * It should export the following functions, and no more:
 * 
 * - updateStats
 * 
 */

// get all database variables needed for stats functions to work correctly
const {
    executeSQLFromServer
} = require('./database');



//----------------Stats Update Functions----------------



async function updateStats() {

}



module.exports = {
    updateStats
};