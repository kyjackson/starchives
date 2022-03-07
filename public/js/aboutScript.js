/**
 * This script populates the FAQ section on the about page.
 */



const q1 = {
    title: "Can I get the whole transcript for a video?",
    answer: `Yes. 
        <br><br> 
        On YouTube, open the video you want the transcript for and under the video, next to the 'SAVE' 
        button, click the three dots and select 'Open transcript.' From there you can read the video's
        whole transcript.`
};

const q2 = {
    title: "Can I search resources other than captions from this site?",
    answer: `Currently, no. 
        <br><br> 
        However, I'm looking into adding the ability to search monthly reports, 
        commlinks, roadmap roundups, and other official resources that may be of interest. This will take some time 
        due to other obligations, so please be patient and check back on this question occasionally, as I'll
        update this when I have more info.`
};

const q3 = {
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
};

const q4 = {
    title: "I still can't find what I'm looking for after several searches.",
    answer: `It's possible that what you're looking for may have been mentioned
        in a monthly report, commlink, or some other resource that isn't a video. 
        <br><br>
        If you're sure this isn't the case,
        the captions relating to your query may not exist or have been transcribed incorrectly. Check out the awesome
        <a href="https://docs.google.com/spreadsheets/d/1_BrcpQjSPGFvn51F46PibH8ccC30RWjyI62Fyiif2pA/">SC Dev Segment Mega Index</a>, 
        created by a fellow member of the Star Citizen community, for more detailed video info. 
        There you can find videos organized by subject, the particular developers featured in each video, and more.`
};

const q5 = {
    title: "What are the dashes in the captions?",
    answer: `When matching captions are found, they also include the previous and next lines in the transcript.
        For better clarity and readability, I've separated these lines using the dashes.`
};

const q6 = {
    title: "Where can I submit feedback?",
    answer: `Please submit any and all feedback, especially constructive criticisms, to <a href="mailto:admin@starchives.org">admin@starchives.org</a>,
        with the subject 'Starchives Feedback - [your name]' so I can get back to you easily if necessary.`
};

const q7 = {
    title: "Why is there a maximum of 100 results?",
    answer: `The more results there are, the longer the responses take. This can be especially problematic
        if several users are trying to search with broad terms at the same time, so to keep response times reasonable,
        I've set the maximum results per query to 100 for now, with a 15-second timeout.`
};

let questions = [q1, q2, q3, q4, q5, q6, q7];

console.log("test");

// append all questions at once to faq accordion
populateFAQ(questions);




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