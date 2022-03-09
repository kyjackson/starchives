/**
 * This script populates the FAQ section on the about page.
 */


// make an array of question objects for populateFAQ to process
let questions = [
    {
        title: "Can I get the whole transcript for a video?",
        answer: `Yes. 
            <br><br> 
            On YouTube, open the video you want the transcript for and under the video, next to the 'SAVE' 
            button, click the three dots and select 'Open transcript.' From there you can read the video's
            whole transcript.`
    },
    
    {
        title: "Can I search resources other than captions from this site?",
        answer: `Currently, no. 
            <br><br> 
            However, I'm looking into adding the ability to search monthly reports, 
            commlinks, roadmap roundups, and other official resources that may be of interest. This will take some time 
            due to other obligations, so please be patient and check back on this question occasionally, as I'll
            update this when I have more info.`
    },

    {
        title: "Can I use this tool to search captions on other channels?",
        answer: `Unfortunately, no. 
            <br><br> 
            The way this site works is that all relevant video info on the 
            Star Citizen channel is stored in my database and updated automatically at regular intervals. This is 
            to avoid quickly using up all the daily quota permitted by the Youtube Data API, and to avoid lengthy
            response times during the retrieval of all captions matching a search query. I currently don't have the
            resources to solve this problem in a way that would allow for more general use of this tool, but the
            good news is the source code for this site is publicly available on
            <a href="https://github.com/kyjackson/archive.sc">Github</a> under the MIT License, 
            so feel free to fork and adapt the code however you'd like.
            <br><br> 
            The other factor is that I'd eventually like to include additonal Star Citizen-specific resources,
            and with this in mind, any future version of this site designed for more general use would have to be
            under a different domain.`
    },

    {
        title: "I still can't find what I'm looking for after several searches.",
        answer: `It's possible that what you're looking for may have been mentioned
            in a monthly report, commlink, or some other resource that isn't a video. 
            <br><br>
            If you're sure this isn't the case,
            the captions relating to your query may not exist or have been transcribed incorrectly. Check out the awesome
            <a href="https://docs.google.com/spreadsheets/d/1_BrcpQjSPGFvn51F46PibH8ccC30RWjyI62Fyiif2pA/">SC Dev Segment Mega Index</a>, 
            created by a fellow member of the Star Citizen community, for more detailed video info. 
            There you can find videos organized by subject, the particular developers featured in each video, and more.`
    },

    {
        title: "What are the dashes in the captions?",
        answer: `When matching captions are found, they also include the previous and next lines in the transcript.
            For better clarity and readability, I've separated these lines using the dashes.`
    },

    {
        title: "Where can I submit feedback?",
        answer: `Please submit any and all feedback, especially constructive criticisms, to <a href="mailto:admin@starchives.org">admin@starchives.org</a>,
            with the subject 'Starchives Feedback - [your name]' so I can get back to you easily if necessary.`
    },

    {
        title: "Why do searches take so long?",
        answer: `The captions take up a relatively large amount of space compared to all other data retrieved. Because all of this data is
            sent from the database to the server and then from the server to the user, response times quickly get noticeably worse 
            as more results are returned. For this reason, the amount of results per page is capped at 10, and the total amount of results
            is retrieved asynchronously from the page results, to ensure that response times are kept as low as possible, especially under
            heavy traffic, while permitting all the functionality you'd expect from a search engine.`
    }
];



// append all questions at once to faq accordion
populateFAQ(questions);



/*
 * Make a list of accordion elements using an array of question objects.
 */
function populateFAQ(questions) {
    for (let i = 0; i < questions.length; i++) {
        $("#faqAccordion").append(`
            <div id="q${i}" class="bg-dark pt-3 accordion-item">

                <h2 id="header-q${i}" class="accordion-header">
                    <button 
                        class="bg-dark bg-gradient text-white accordion-button collapsed d-flex" 
                        type="button" 
                        data-bs-toggle="collapse" 
                        data-bs-target="#collapse-q${i}" 
                        aria-controls="collapse-q${i}"
                        aria-expanded="false">

                        <div class="accordion-header-text flex-grow-1">
                            ${questions[i].title}
                        </div>
                    </button>
                </h2>

                <div 
                    id="collapse-q${i}" 
                    class="bg-secondary accordion-collapse collapse" 
                    aria-labelledby="header-q${i}">

                    <div id="body-q${i}" class="bg-dark accordion-body text-start">
                        <p class="ps-4">
                            ${questions[i].answer}
                        </p>
                    </div>
                </div>

            </div>
        `);
    } 
}