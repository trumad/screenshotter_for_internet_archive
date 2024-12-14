//Install:
//make a directory,
//copy this file into your directory
//inside there type npm init -y
//then type npm install puppeteer yargs --save (version 23 of puppeteer supported currently)
//then run this file, using: 
//node screenshotter.js --i item_identifier,another_item,yet_another_item
// or node screenshotter.js -c --i collection_identifier
// Also: node screenshotter.js --help

//todo: Add instructions for installing this script globally: https://markoskon.com/yargs-examples/

const puppeteer = require('puppeteer');

// Adding arguments handling: 
const fs = require('fs');
const milliseconds = (h, m, s) => ((h*60*60+m*60+s)*1000); // quick function to calculate milliseconds - days, hours, minutes

const argv = require('yargs')
  .usage('Usage: node $0 [options]')
  .example('node $0 -id [item_identifier,another_item]', 'Screenshot an archive item, or an array of items')
  .option("i", {
    alias: "identifier",
    describe: "Screenshot this/these items",
    type: "string",
    nargs: 1,
    demandOption: "Please use -i to specify identifier(s) (comma separated)",
  })
  .option("c", {
    alias: "collection",
    describe: "Add this to signify that the item is a collection",
    type: "boolean",
    default: false,
  })
  .option("d", {
    alias: "delay",
    describe: "How long to delay (in seconds) after the emulation has loaded before taking the first screenshot.",
    type: "number",
    default: 15,
  })
  .option("s", {
    alias: "shots",
    describe: "How many screenshots to take",
    type: "number",
    default: 1,
  })
  .option("l", {
    alias: "shotsdelay",
    describe: "Delay between shots in seconds",
    type: "number",
    default: 2,
  })
  .option("k", {
    alias: "keypresses",
    describe: "Keypresses to send (comma separated. Reference: https://github.com/GoogleChrome/puppeteer/blob/v1.14.0/lib/USKeyboardLayout.js)",
    type: "string",
    default:"Space,Enter",
  })
  .option("p", {
    alias: "keypressdelay",
    describe: "Delay between keypresses in seconds",
    type: "number",
    default: 8,
  })
  .option("t", {
    alias: "timeout",
    describe: "Max browser timeout in minutes (eg when a CD takes AGES to download. Does not handle browser crashing). Set to -1 for no timeout.",
    type: "number",
    default: 9,
  })
  .option("e", {
    alias: "headless",
    describe: "Run the browser headless",
    type: "boolean",
    default: true,
  })
  .option("o", {
    alias: "dumpio",
    describe: "provide full browser logs", // https://github.com/puppeteer/puppeteer/issues/894
    type: "boolean",
    default: false,
  })
  .help('h')
  .alias('h', 'help').argv


var iaBaseUrl = "https://archive.org/details/";
var idArg = argv.i; // the identifier the user entered
var isCollection = argv.c; // returns true if the user specified -c. Therefore the identifier is a collection
const initialDelay = milliseconds(0,0,argv.d);
const timeoutLength = milliseconds(0,argv.t,0);
const shortDelay = milliseconds(0,0,argv.p); // shortDelay is the delay between keypresses
const numberOfShots = argv.s;
const delayBetweenShots = milliseconds(0,0,argv.l);

function sleep(ms) { // usage: await sleep(4000)
    return new Promise(resolve => setTimeout(resolve, ms));
}

//console.log(iaBaseUrl + idArg)
//console.log(isCollection)
//console.log(longDelay)


var collectionUrl = isCollection ? returnCollectionUrl() : ''; // swap in whatever you like, as long as it's a collection of stuff that has a power button

var items = convertItemToArray(idArg);

var keyPresses = argv.k ? convertStringToArray(argv.k) : false;
var runHeadless = argv.e;
var dumpIo = argv.o;
console.log(`Browser running headless: ${runHeadless}`)
const maxPageTime = calculatePageOpenTime();
console.log(`Each item will take ${maxPageTime/1000} seconds to screenshot`);
console.log(keyPresses)
console.log(items);

function calculatePageOpenTime(){
    var shotsTime = numberOfShots * delayBetweenShots;
    var keypressTime = keyPresses ? (keyPresses.length * shortDelay) + checkExtraKeypressDelayLength(keyPresses) : 0;
    //console.log(keyPresses);
  //  console.log(shotsTime)
  //  console.log(keypressTime)
    if (keypressTime > shotsTime){return (keypressTime + initialDelay + 2000)}
    if (shotsTime > keypressTime){return (shotsTime + initialDelay + 2000)}
}

function returnCollectionUrl(){
    if (idArg.includes(",")){
        throw "\n-------------------------------\nPlease only run against one collection at a time!\n-------------------------------\n";
    }
    else{return iaBaseUrl + idArg}
}
//var testSpecificTitle = ""; // MUST be left blank if you want to test a collection. Leave this line as is, and uncomment/edit the below lines to test a specific item or selection of items
function convertItemToArray(string){
    var array = string.split(',');
    for (var i=0,j = array.length;i<j;i++){
        if (array[i] === ""){
            throw "\n-------------------------------\Items should be comma separated with no spaces\n-------------------------------\n";
        }
        array[i] = iaBaseUrl + array[i];
    }
    return array;
}

function convertStringToArray(string){
    var array = string.split(',');
    for (var i=0,j = array.length;i<j;i++){
        if (array[i] === ""){
            throw "\n-------------------------------\IStrings should be comma separated with no spaces\n-------------------------------\n";
        }
    }
    console.log(array);
    return array;
}

function checkExtraKeypressDelayLength(keypresses){
    var total = 0;
    for (let i=0,j = keypresses.length;i<j;i++){
        var keyPress = keypresses[i];
        parts = keyPress.split(' ');
        key = parts.pop();
        if (parts.length > 0) {
            for (const modKey of parts) {
                if (modKey == "DELAY"){ // if the user submits "DELAY 5" as a keypress
                    var keypressDelay = parseInt(key);
                    total = total + milliseconds(0,0,keypressDelay);
                }
            }
        }
    }
    return total
}

async function run() { // define the main function
    let browser = await puppeteer.launch({ timeout: 0, headless: runHeadless, dumpio: dumpIo}); // launch browser
    try {
        var itemsArray = []; // we'll populate this in the for loop below
        if (isCollection){ // user submitted a collection
            let firstPage = await browser.newPage(); // Load up the browser tab for the first page, which will be the collection page
            await bigPage(firstPage);
            firstPage.setDefaultTimeout(timeoutLength); // Need to set this to zero for every page we load, otherwise there are errors.
            console.log("Visiting collection: " + collectionUrl)
            await firstPage.goto(collectionUrl + '?&sort=titleSorter&page=1'); // Let's view in alphabetical by default
            var totalItems = await firstPage.$('.results_count'); // grab the total number of items from this page element
            totalItems = await totalItems.evaluate( totalItems => totalItems.textContent.replace(/\D+/g,"")); // strip it down to just the number
            console.log("Total Items we need to gather URLs for: " + totalItems);
            var finalPage = Math.ceil(totalItems/75); // bit of bath to grab the highest page we need to paginate IA to in order to grab all item urls
            console.log("Gonna visit every page in this collection up to page " + finalPage);
            firstPage.close();
            // Loop through & gather all the items in the collection & put them in itemsArray:
            for (var i=1,j = finalPage;i<=j;i++){ // Loop through all the pages in the collection
                let currentResultsPage = collectionUrl + "?&sort=titleSorter&page=" + i; // current page URL
                console.log("Hitting up " + currentResultsPage + " to get full URLs for more items...");
                let browserPage = await browser.newPage(); // open up a tab
                await bigPage(browserPage);
                browserPage.setDefaultTimeout(timeoutLength); // set that timeout to zero baby
                await browserPage.goto(currentResultsPage); // and go ahead & visit the URL
                let content = await browserPage.evaluate(() => { // Grabbing the hrefs for the items and putting it into the content array
                    let divs = [...document.querySelectorAll('.item-ttl')];
                    return divs.map((div) => div.getElementsByTagName("a")[0].href);
                });
                for (var k=0,l = content.length;k<l;k++){ // for every href in the content array
                    itemsArray.push(content[k]) // push it into the overall itemsArray
                }
                await browserPage.close(); // close this tab (and probably start again unless we're on the last page)

            }
            // All righty, we've grabbed all the hrefs of our items. Let's visit each one
            console.log("---------FULL LIST OF ITEMS:---------");
            console.log(itemsArray);
            console.log("---------END OF FULL LIST OF ITEMS:---------");
        }
        else if (!isCollection){
            itemsArray = items;
        }
        for (i=0,j = itemsArray.length;i<j;i++){ // for each item:
            var currentUrl = itemsArray[i]; // the full URL of the current item in the loop
            var itemId = currentUrl.split("details/")[1]; // Split out the item identifier
            var potentialPngFilename = './'+itemId+'_0.png'
            try {
                if (fs.existsSync(potentialPngFilename)) {
                    console.log("Skipping Item with existing screenshot: " + itemId);
                    continue;
                }
            } catch(err) {
                console.error(err)
                console.log("Error for some reason...")
            }
            // Go ahead and load up the page
            let page = await browser.newPage(); // open up a tab
            var thisPageConsoleLogs = []
            page.on('console', message =>
                thisPageConsoleLogs.push `${message.type().substr(0, 3).toUpperCase()} ${message.text()}`)
            await bigPage(page);
            page.on('pageerror', error => console.error(`âŒ ${error}`)); // log page console errors, cos why not
            page.setDefaultTimeout(timeoutLength); // set that timeout - especially for those damn CD ROM load times
            await page.goto(currentUrl); // Visit the url
            let bodyHTML = await page.evaluate(() => document.body.innerHTML);
            console.log("Doing Item: " + itemId);
            console.log("gonna get power button")
            const powerButton = await page.$('.ghost'); // Identify the power button element
            console.log("gonna click power button");
            await powerButton.evaluate( powerButton => powerButton.click() ); // Click it
            // let emulator content load - waits until the splash screen disappears, indicating that all the files have loaded
            console.log("gonna wait for splash screen to go away")
            await page.waitForFunction("document.querySelector('.emularity-splash-screen') && document.querySelector('.emularity-splash-screen').style.display == 'none'");
            // wait another 10 seconds, for good measure
                function giveUp(arg) { // function to close the browser if all else fails
                 // console.log(`arg was => ${arg}`);
                 console.log("page must have stopped responding for item " + itemId);
                 fs.closeSync(fs.openSync(potentialPngFilename, 'w')); // touches the filename so it doesn't crap out on the same file next time through
                    browser.close(); // SHUT IT DOWN (this will trigger the normal error catching, which will restart the run function)
                }
            var fallbackTimeout = setTimeout(giveUp, maxPageTime*3, potentialPngFilename); // give up after waiting 3 times as long as it should take to do the shots/keypresses
            console.log(`splash screen went away. waiting for ${initialDelay/1000} seconds.`)
            await sleep(initialDelay);
            /*-------------------------------------
        EXPERIMENTAL KEYPRESS SECTION
        Uncomment these next 3 lines to: click the emulator (to focus it), press "1", wait for the delay length. 
        Copy/paste the lines if you want to add delays or keypresses
        Keyboard reference: https://github.com/GoogleChrome/puppeteer/blob/v1.14.0/lib/USKeyboardLayout.js
        --------------------------------------*/
            console.log("gonna click canvas")
            await page.click('#canvas'); // EXPERIMENTAL - Clicks on the canvas to focus it. 
            console.log("gonna screenshot");
            takeShots();
            console.log("gonna press keys (after a delay)");
            pressKeys();
            await sleep(maxPageTime);
            /*-------------------------------------
        End of experimental keypress section
        --------------------------------------*/
            async function pressKeys(){
                if (!keyPresses){return} // user doesn't want to press any keys
                //  await canvasElement.type(String.fromCharCode(13), { delay: 100 });
                //  return;
                let parts, key;
                forLoop:
                for (var i=0,j = keyPresses.length;i<j;i++){
                    await sleep(shortDelay-100);
                    try{
                        parts = keyPresses[i].split(' ');
                        key = parts.pop();
                        if (parts.length > 0) {
                            for (const modKey of parts) {
                                    if (modKey == "DELAY"){ // if the user submits "DELAY 5" as a keypress
                                        var keypressDelay = milliseconds(0,0,parseInt(key));
                                        console.log(`doing an extra ${parseInt(key)} second delay`)
                                        await sleep(keypressDelay); // do an extra delay
                                        console.log(`Extra delay done. Continuing the next forLoop.`);
                                        continue forLoop; // what is this goto magic JS can do??
                                    }
                                    else{
                                    console.log(`holding key ${modKey}`);
                                    await page.keyboard.down(modKey);
                                    }
                                }
                        }
                        console.log(`pressing key "${key}"`);
                        await page.keyboard.down(key);
                        await sleep(80);
                        await page.keyboard.press(key);
                        await page.keyboard.up(key);
                        if (parts.length > 0) {
                            for (const modKey of parts) {
                                if (modKey != "DELAY"){
                                    console.log(`releasing key ${modKey}`);
                                    await page.keyboard.up(modKey);
                                }
                            }
                        }
                    }
                    catch(e){console.log(e)}
                }
            }
            async function takeShots(){ // making this async so it can do its magic while keypresses are happening separately
                for (var i=0,j = numberOfShots;i<j;i++){
                    await sleep(delayBetweenShots);
                    await takeShot(i);
                }
                async function takeShot(i){
                    await page.waitForSelector('#canvas');          // wait for the selector to load
                    const screenshotElement = await page.$('#canvas');        // declare a variable with an ElementHandle
                    await screenshotElement.screenshot({ path: `./${itemId}_${i}.png`, type: 'png' });
                }
            }
            //thisPageConsoleLogs = JSON.stringify(thisPageConsoleLogs);
            //fs.writeFileSync(`./${itemId}.json`, thisPageConsoleLogs);
            console.log("gonna close browser tab")
            await page.close(); // close the tab, to save on memory
            clearTimeout(fallbackTimeout); // let's clear that timeout before we start a new tab
        }
        // all done I guess!
        console.log("Done! Closing browser.");
        await browser.close(); // close the headless browser
    }
    catch(err){ // Handling errors:
        console.log("*------------------*ERROR*-----------------*\n" + err + "\nItem ID was: " + itemId  + ". Creating empty screenshot for this item & restarting...\n*------------------*ERROR*----------------*");
        fs.closeSync(fs.openSync(potentialPngFilename, 'w')); // touches the filename so it doesn't crap out on the same file next time through
        //thisPageConsoleLogs = JSON.stringify(thisPageConsoleLogs);
        //fs.writeFileSync(`./${itemId}.json`, thisPageConsoleLogs);
        await browser.close();
        run();
    }
}

async function bigPage(page){
    await page.setViewport({
                width: 1024,
                height: 1800,
                deviceScaleFactor: 1,
                });
}

run(); // make it happen


