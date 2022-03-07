/**
 * This script contains everything necessary for the search functionality on the home page to operate as intended.
 */

// first set up Youtube Iframe API
let tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);



// wait for Iframe API to be ready before searching
function onYouTubeIframeAPIReady() {
    console.log("Iframe ready.");
    return;
}

$("#loadingIcon").hide();
$(".filters").hide();

// ensure default order is ascending every time the page is loaded
$("#order").val("ASC"); 
$("#order").prop("checked", false);



/**
 * Enable/disable filters if "Filter" switch is toggled.
 */
$("#filterSwitch").prop("checked", false);
$("#filterSwitch").on("change", function(event) {
    if (!$(".filters").is(":visible")) {
        $(".filters").toggle(true);
    } else {
        $(".filters").toggle(false);
        $("#publishDate").val("");
        $("#duration").val("");
        $("#orderBy").val("");
        $("#order").prop("checked", false);
    }   
});



/**
 * Allow "Descending" filter only when column order is specified.
 */
$("#orderBy").on("change", function(event) {
    if ($("#orderBy").val()) {
        $("#order").removeAttr("disabled");
    } else {
        $("#order").prop("checked", false);
        $("#order").attr("disabled", "disabled");
    }
});



/**
 * Change value of "Descending" based on whether the checkbox is checked.
 */
$("#order").on("change", function(event) {
    if ($("#order").val() == "DESC") {
        $("#order").val("ASC");
    } else {
        $("#order").val("DESC");
    }
});



/**
 * Send a GET request to our own API endpoint for retrieving relevant captions from our database.
 */
$("form").on("submit", function(event) {
    event.preventDefault();

    // disable search button to prevent additional queries while loading
    $("#searchButton").attr("disabled", "disabled");
    $("#results").empty();

    // get values of search bar and filter ready for ajax
    let keyword = $("#searchBar").val();
    let videoPublishDate = $("#publishDate").val();
    let videoDuration = $("#duration").val();
    let orderResultsBy = $("#orderBy").val();
    let orderResults = $("#order").val();

 
        
    $("#loadingIcon").show();
    $("#loadingIcon").css("visibility", "visible");
    $("#results").show();
    
    $.ajax({
        method: "GET",
        url: `${window.location.origin}/results`,
        dataType: 'json',
        data: {
            query: keyword,
            date: videoPublishDate,
            duration: videoDuration,
            orderBy: orderResultsBy,
            order: orderResults
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (errorThrown == "timeout") {
                $("#loadingIcon").hide();
                $("#loadingIcon").css("visibility", "hidden");
                $("#searchButton").removeAttr("disabled");
                $("#results").show();
            }

            $("#results").html(`
                <p class="mx-auto justify-content-center text-start">Search timed out. Try making your query longer or more specific. If the search keeps timing out, the site may be experiencing heavy traffic.</p>
            `);
        },
        timeout: 15000
    })
    .done(function (result) {
        $("#loadingIcon").hide();
        $("#loadingIcon").css("visibility", "hidden");
        $("#results").show();
        $("#searchButton").removeAttr("disabled");

        

        // get amount of video results
        let total = 0;
        for (let i = 0; i < result.length; i++) {
            for (let j = 0; j < result[i].length; j++) {
                total++;
            }
        }

        if (total >= 100) {
            $("#results").html(`<p class="mx-auto justify-content-center text-start">Found ${total} or more videos containing "${keyword}"</p>`);
        } else {
            $("#results").html(`<p class="mx-auto justify-content-center text-start">Found ${total} videos containing "${keyword}"</p>`);
        }
        

        if (result.length > 0) {
            
            // display first page and page navigation bar
            let page = 0;

            $("#results").append(`

                <div class="mx-auto justify-content-end">
                <nav aria-label="page-navigation">
                    <ul class="pagination">
                        <li class="page-item">
                            <button 
                                id="previousPage" 
                                class="page-link" 
                                onclick="this.blur();" 
                                aria-label="Previous">

                                <span aria-hidden="true">&laquo;</span>
                            </button>
                        </li>

                        <li class="page-item">
                            <span id="currentPage" class="page-link">${page+1} of ${result.length}</span>
                        </li>

                        <li class="page-item">
                            <button 
                                id="nextPage" 
                                class="page-link" 
                                onclick="this.blur();" 
                                aria-label="Next">

                                <span aria-hidden="true">&raquo;</span>
                            </button>
                        </li>
                    </ul>
                </nav>
                </div>

                <div id="resultsAccordion" class="mx-auto w-75 accordion accordion-flush"></div>
            `);

            // associate pages with their respective numbers
            let pageMap = new Map();
            result.forEach(function (page, index) {
                pageMap.set(index, page);
            });
            
            // always display the first page first
            $("#previousPage").prop("disabled");
            showPage(pageMap.get(page));

            // set up result page navigation
            $("#previousPage").on("click", function() {
                if (page > 0) {
                    page--;
                    $("#currentPage").html(`${page+1} of ${result.length}`);
                    showPage(pageMap.get(page));

                    if (page === 0) {
                        $("#previousPage").prop("disabled");
                    }

                    if (page < result.length && $("#nextPage").attr("disabled")) {
                        $("#nextPage").removeProp("disabled");
                    }
                }
            });

            $("#nextPage").on("click", function() {
                if (page < result.length-1) {
                    page++;
                    $("#currentPage").html(`${page+1} of ${result.length}`);
                    showPage(pageMap.get(page));

                    if (page === result.length) {
                        $(this).prop("disabled");
                    }

                    if (page > 0 && $("#previousPage").attr("disabled")) {
                        $("#nextPage").removeProp("disabled");
                    }
                }
            });

        } 

        console.log(result);
    });



    // display all the videos for a specified page
    function showPage(page) {
        // clear the current results if there are any
        $("#resultsAccordion").empty();

        for (let video in page) {

            // simplify video info
            let id = page[video].videoId;
            let title = page[video].videoTitle;
            let publishDate = page[video].videoPublishDate.slice(0, 10); // make videoPublishDate human-readable in ISO 8601 format
            let duration = page[video].duration;
            let viewCount = page[video].videoViewCount;
            let likeCount = page[video].videoLikeCount;
            let commentCount = page[video].videoCommentCount;
            


            // append accordion items with all relevant video info
            $("#resultsAccordion").append(`
                <div id="${id}" class="bg-dark pt-3 accordion-item">

                    <h2 id="header-${id}" class="accordion-header">
                        <button
                            class="bg-dark bg-gradient text-white accordion-button collapsed d-flex"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#collapse-${id}" 
                            aria-controls="collapse-${id}" 
                            aria-expanded="false">

                            <div class="accordion-header-text flex-grow-1">
                                ${title}
                            </div>

                            <div class="accordion-header-text">
                                ${publishDate}
                            </div>
                        </button>
                    </h2>

                    <div
                        id="collapse-${id}" 
                        class="bg-secondary accordion-collapse collapse"
                        aria-labelledby="header-${id}">

                        <div id="body-${id}" class="bg-dark accordion-body">
                            <div class="d-flex justify-content-center">
                                <div id="player-${id}" class="me-3"></div>
                                <div id="info-${id}" class="text-start">
                                    <p class="divider">
                                        Video Stats
                                        <hr class="divider">
                                        Duration: ${duration}
                                        <br>
                                        Views: ${viewCount}
                                        <br>
                                        Likes: ${likeCount}
                                        <br>
                                        Comments: ${commentCount}
                                    </p>
                                    
                                </div>
                            </div>
                            <div id="timestamps-${id}" class="d-flex flex-column"></div>
                        </div>
                    </div>

                </div>
            `);

            // create the iframe for each video
            let player = new YT.Player(`player-${id}`, {
                height: '480',
                width: '720',
                videoId: id,
                host: 'https://www.youtube.com'
            });

            // if there's a search query, get and display the captions
            if (keyword.length != 0) {
                let captions = JSON.parse(page[video].captionTrack);
                let timestamps = new Map();

                // get every occurance of the search phrase in the caption track
                // NOTE: includes() is case sensitive, so convert captions and query to lowercase first
                captions.forEach(function(segment, index) {
                    if (segment.text.toLowerCase().includes(keyword.toLowerCase())) {
                        let longSegment = segment.text;
                        
                        if (captions[index-1] !== undefined) {
                            longSegment = `${captions[index-1].text} - ${longSegment}`;
                        }
                        if (captions[index+1] !== undefined) {
                            longSegment = `${longSegment} - ${captions[index+1].text}`;
                        }

                        // convert seconds to hr:min:sec
                        // let hr = Math.floor(segment.start / 3600);
                        // let min = Math.floor((segment.start % 3600)/ 60);
                        // let sec = Math.floor(segment.start - (min * 60));

                        // let hrPadded = ('00'+hr).slice(-2);
                        // let minPadded = ('00'+min).slice(-2);
                        // let secPadded = ('00'+sec).slice(-2);

                        //timestamps.set(segment.start, segment.text);
                        timestamps.set(segment.start-3, longSegment);
                    }
                });

                // append timestamp links to each accordion item
                timestamps.forEach(function (value, key) {
                    let time = format(key);

                    $(`#timestamps-${page[video].videoId}`).append(`

                        <br>
                        <div class="pt-3 d-flex justify-content-left text-start">
                            <a id="play-${key}-${page[video].videoId}" href="#header-${page[video].videoId}">${time}</a>
                            <span>&nbsp;-&nbsp;</span>
                            <p>"...${value}..."</p>
                        </div>
                    
                    `);
                    
                    $(`a[id*='${key}']`).on("click", function () {
                        player.seekTo(key, true);
                        player.playVideo();
                    });
                    
                });
            }
        }
    }
});



// helper function for converting time in seconds to time in hh:mm:ss
// reference: https://stackoverflow.com/questions/3733227/javascript-seconds-to-minutes-and-seconds
function format(seconds) {   
    var hr = Math.floor(seconds / 3600);
    var min = Math.floor((seconds % 3600) / 60);
    var sec = Math.floor(seconds % 60);

    // format result depending on amount of each time component
    var result = "";
    if (hr > 0) {
        result += "" + hr + ":" + (min < 10 ? "0" : "");
    }
    result += "" + min + ":" + (sec < 10 ? "0" : "");
    result += "" + sec;
    return result;
}