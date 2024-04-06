const { Database } = require("bun:sqlite");

var config = require('./config');
const FormData = require('form-data');
const fs = require("fs");
const axios = require('axios');
//const sqlite3 = require('sqlite3').verbose();
let conor = require('./conor.js');

// Replaced LevelDB with SQLite due to clash with Dropbox syncing
const db = new Database(config.sqlite3_output_path);

const { GoogleSpreadsheet } = require('google-spreadsheet');

// Find out when the code was last run
function getPreviousTimestamp() {
    try {
        timestamp = fs.readFileSync(config.timestamp_path);
    } catch (err) {
        // console.log("No previous timestamp")
        // If we haven't run before, return 0 (Jan 1 1970)
        return 0;
    }
    // If timestamp exists, read it
    let previousTimestamp = JSON.parse(timestamp);
    return previousTimestamp;
}

// If access token is no longer working, then this is called.
// It only works if the refresh token is correct. 
// If refresh token is not correct, you need to manually delete withings2gsheetstokens.json
// and re-run the code to do full re-authorisation flow
async function getReplacementAccessToken(refreshToken) {
    var bodyFormData = new FormData();

    bodyFormData.append('action', 'requesttoken');
    bodyFormData.append('grant_type', 'refresh_token');
    bodyFormData.append('client_id', config.withingsClientID);
    bodyFormData.append('client_secret', config.withingsClientSecret);
    bodyFormData.append('refresh_token', refreshToken);

    try {
        const response = await axios.post("https://wbsapi.withings.net/v2/oauth2", bodyFormData, {
            headers: {
                ...bodyFormData.getHeaders()
            }
        })
        // console.log("Response3: ", response);
        const accessToken = response.data.body.access_token;
        const refreshToken = response.data.body.refresh_token;
        // console.log("Refresh Token5: ", refreshToken);

        if ((typeof accessToken !== "undefined") && (typeof refreshToken !== "undefined")) {
            // console.log("Storing Updated Tokens", accessToken, refreshToken);
            storeTokens(accessToken, refreshToken);
        } else {
            console.log("Error getting new Access and refresh tokens")
        }
    } catch (error) {
        // handle error
        console.log("Error Replacing Tokens: ", error);
    }
}

// Stores the Withings tokens in a file
async function storeTokens(accessToken, refreshToken) {
    try {
        fs.writeFileSync(config.token_path, JSON.stringify({ accessToken, refreshToken }));
        // console.log("Tokens stored to " + config.token_path);
    } catch (error) {
        console.log("Error storing tokens", error);
    }
}

// Stores most recent execution timestamp to a file
async function storeTime(latestTimestamp) {
    try {

        fs.writeFileSync(config.timestamp_path, JSON.stringify(latestTimestamp));
        // console.log("Last Timestamp stored to " + config.timestamp_path);
    } catch (error) {
        console.log("Error storing timestamp", error)
    }
}

// Process the data returned by Withings API so it is easier to deal with. Dump unneeded data.
async function processData(scaleData) {
    // Iterate through measuregrps
    // Get date element (you need to group entries by date)
    // Get the measures object. It will be like:
    // measures: [ { value: 68, type: 11, unit: 0, algo: 0, fm: 3 } ]
    // or like
    // measures: [ { value: 8478, type: 91, unit: -3, algo: 0, fm: 3 } ],
    // or like:
    // measures: [
    //  { value: 78997, type: 1, unit: -3, algo: 3, fm: 3 },
    //  { value: 1406, type: 8, unit: -2, algo: 3, fm: 3 },
    //  { value: 6167, type: 76, unit: -2, algo: 3, fm: 3 },
    //  { value: 4561, type: 77, unit: -2, algo: 3, fm: 3 },
    //  { value: 325, type: 88, unit: -2, algo: 3, fm: 3 },
    //  { value: 17798, type: 6, unit: -3 },
    //  { value: 64937, type: 5, unit: -3 }
    //],

    console.log("Processing data from Withings API");

    let simplifiedData = [];
    // console.log(scaleData.measuregrps.length);
    for (var i = 0; i < scaleData.measuregrps.length; i++) {
        //console.log(scaleData.measuregrps[i].measures.length);
        for (var j = 0; j < scaleData.measuregrps[i].measures.length; j++) {
            let singleEntry = {};
            // console.log(scaleData.measuregrps[i]);
            singleEntry.date = scaleData.measuregrps[i].date;
            let metric = config.metrics[scaleData.measuregrps[i].measures[j].type];
            singleEntry[metric] = scaleData.measuregrps[i].measures[j].value;
            //console.log(singleEntry);
            simplifiedData.push(singleEntry);
        }
    }

    // console.log(simplifiedData);

    // Direct StackOverflow copy and paste. Works tho :-)
    var mergedData = simplifiedData.filter(function (v) {
        return this[v.date] ?
            !Object.assign(this[v.date], v) :
            (this[v.date] = v);
    }, {});

    // console.log(mergedData);
    return (mergedData);
}

// Output the latest metrics to an Excel-compatible CSV file
async function writeCSV(mergedData) {

    var allLines = [];
    var dataLines = [];

    try {
        var allLines = fs.readFileSync(config.csv_output_path).toString().split("\n");
        var dataLines = allLines.slice(2);
    } catch (err) {
        // File doesn't exist, setup headers
        fs.appendFileSync(config.csv_output_path, "sep=,\n");

        // Get the metric headers from the config file
        // This isn't 100% right as it should use metricList but it'll do for the moment
        var headerLine = "date, " + Object.values(config.metrics).join(",") + "\n";
        fs.appendFileSync(config.csv_output_path, headerLine);
    }

    var splitLines = [];
    for (i in dataLines) {
        splitLines.push(dataLines[i].split(','));
    }

    // Check to see if each of the new entries is in the CSV already
    // If it isn't, add it to the end
    // Assumes first column is always the date
    for (var k = mergedData.length - 1; k >= 0; k--) {
        // console.log(mergedData[k]);
        var matched = 0;
        for (j in splitLines) {
            if (mergedData[k]['date'] == splitLines[j][0]) {
                matched = 1;
            }
        }
        if (matched == 0) {
            // Turn the new entry into comma separated list and add to CSV
            // var oneLine = Object.values(mergedData[k]).join(",") + "\n";

            // TODO: Need to make metrics configurable based on config.js
            var oneLine = mergedData[k]["date"] + "," + mergedData[k]["Weight"] + "," + mergedData[k]["Fat Free Mass"] + "," + mergedData[k]["Fat Ratio"] + "," + mergedData[k]["Fat Mass Weight"] + "," + mergedData[k]["Heart Pulse"] + "," + mergedData[k]["Muscle Mass"] + "," + mergedData[k]["Hydration"] + "," + mergedData[k]["Bone Mass"] + "," + mergedData[k]["Pulse Wave Velocity"] + "\n";

            fs.appendFileSync(config.csv_output_path, oneLine);
        }
    }
    console.log("CSV updated");
}

// Output the latest metrics to a Google Sheet of your choosing
async function writeGSheets(mergedData) {
    console.log("Starting GSheets updates");
    // spreadsheet key is the long id in the sheets URL
    const doc = new GoogleSpreadsheet(config.gSheetsId);

    // Load keys directly from json file
    await doc.useServiceAccountAuth(require(config.gsheets_key_path));

    await doc.loadInfo(); // loads document properties and worksheets

    const sheet = doc.sheetsById[config.gSheetsTabId];

    let headerValues = Object.values(config.metrics);
    headerValues.unshift("date");
    await sheet.setHeaderRow(headerValues);

    const rows = await sheet.getRows();
    // console.log(rows.length);

    //Compare new date elements with all the dates in rows. If no match, add new rows
    for (var i = mergedData.length - 1; i >= 0; i--) {

        var matched = 0;
        for (var j = 0; j < rows.length; j++) {
            // console.log(rows[j].date);
            if (mergedData[i].date == rows[j].date) matched = 1;
        }
        if (matched != 1) {
            // Write new row
            var rowArray = [mergedData[i]];
            console.log("Writing Row to GSheets:", mergedData[i].date);
            //const moreRows = await sheet.addRows(rowArray, {insert: true, raw: true})
            const moreRows = await sheet.addRows(rowArray, { insert: true })

        }
        // Now deal with Conor's Annual Tabs
        if (config.useConorsTabs == true) {
            await conor.updateCurrentAnnualTab(mergedData[i], doc);
        }
    }
    console.log("Finished GSheets updates");
}

// Write metrics to SQLite, CSV and Google Sheets
async function persistData(mergedData) {

    console.log("Persisting data from Withings API");

    try {
        const query = db.query('CREATE TABLE IF NOT EXISTS measurements( date INTEGER PRIMARY KEY, FormattedDate TEXT, Weight REAL, FatFreeMass REAL, FatRatio REAL, FatMassWeight REAL, HeartPulse INTEGER, MuscleMass REAL, Hydration REAL, BoneMass REAL, PulseWaveVelocity REAL, UNIQUE(date))');
        query.run();
    } catch (error) {
        console.error(error);
        throw error;
    }

    for (var i = 0, len = mergedData.length; i < len; i++) {
        // Save in SQLite3.
        // TODO: Need to make all the metrics configurable based on config.js at some point

        // Save Formatted Date in SQLite too for ease of use with Excel via ODBC
        let d = new Date(mergedData[i].date * 1000);
        let month = d.getMonth() + 1;
        let formattedDate = d.getFullYear() + "-" + ("0" + month).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);
        mergedData[i]["Formatted Date"] = formattedDate;

        if (mergedData[i]["Weight"] === undefined) {
            mergedData[i]["Weight"] = " ";
        } else {
            mergedData[i]["Weight"] = mergedData[i]["Weight"] / 1000;
        }

        if (mergedData[i]["Fat Free Mass"] === undefined) {
            mergedData[i]["Fat Free Mass"] = " ";
        } else {
            mergedData[i]["Fat Free Mass"] = mergedData[i]["Fat Free Mass"] / 1000;
        }

        if (mergedData[i]["Fat Ratio"] === undefined) {
            mergedData[i]["Fat Ratio"] = " ";
        } else {
            mergedData[i]["Fat Ratio"] = mergedData[i]["Fat Ratio"] / 1000;
        }

        if (mergedData[i]["Fat Mass Weight"] === undefined) {
            mergedData[i]["Fat Mass Weight"] = " ";
        } else {
            mergedData[i]["Fat Mass Weight"] = mergedData[i]["Fat Mass Weight"] / 100;
        }

        if (mergedData[i]["Heart Pulse"] === undefined) mergedData[i]["Heart Pulse"] = " ";

        if (mergedData[i]["Muscle Mass"] === undefined) {
            mergedData[i]["Muscle Mass"] = " ";
        } else {
            mergedData[i]["Muscle Mass"] = mergedData[i]["Muscle Mass"] / 100;
        }

        if (mergedData[i]["Hydration"] === undefined) {
            mergedData[i]["Hydration"] = " ";
        } else {
            mergedData[i]["Hydration"] = mergedData[i]["Hydration"] / 100;
        }

        if (mergedData[i]["Bone Mass"] === undefined) {
            mergedData[i]["Bone Mass"] = " ";
        } else {
            mergedData[i]["Bone Mass"] = mergedData[i]["Bone Mass"] / 100;
        }

        if (mergedData[i]["Pulse Wave Velocity"] === undefined) {
            mergedData[i]["Pulse Wave Velocity"] = " ";
        } else {
            mergedData[i]["Pulse Wave Velocity"] = mergedData[i]["Pulse Wave Velocity"] / 1000;
        }

        try {
            // Insert row to SQLite DB if it doesn't already exist
            const query = db.query(`INSERT OR IGNORE INTO measurements(date, FormattedDate, Weight, FatFreeMass, FatRatio, FatMassWeight, HeartPulse, MuscleMass, Hydration, BoneMass, PulseWaveVelocity)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, mergedData[i].date, mergedData[i]["Formatted Date"], mergedData[i]["Weight"], mergedData[i]["Fat Free Mass"], mergedData[i]["Fat Ratio"], mergedData[i]["Fat Mass Weight"], mergedData[i]["Heart Pulse"], mergedData[i]["Muscle Mass"], mergedData[i]["Hydration"], mergedData[i]["Bone Mass"], mergedData[i]["Pulse Wave Velocity"]);
            query.run();
        } catch (error) {
            console.error(error);
            throw error;
        }
    }


    // Close the connection with database
    try {
        db.close(); 
    } catch (error) {
        console.error(error);
        throw error;
    }

    console.log("SQLite updated");

    // Modify Dates to be human readable and Excel/GSheets parsable
    // Settled on YYYY-MM-DD HH:mm:ss everywhere except Conor's old GSHeets annual tabs
    for (var k = 0; k < mergedData.length; k++) {
        var d = new Date(mergedData[k].date * 1000);
        var month = d.getMonth() + 1;
        var outputDate = d.getFullYear() + "-" + ("0" + month).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2) + ":" + ("0" + d.getSeconds()).slice(-2);
        mergedData[k].date = outputDate;
    }

    // Write to CSV
    await writeCSV(mergedData);

    // Write to GSheets
    await writeGSheets(mergedData);

    console.log("All done");

}

// Retrieve all the latest metrics from the Withings API
async function getWithingsData(accessToken, refreshToken, currentTime) {
    var bodyFormData = new FormData();

    bodyFormData.append('action', 'getmeas');

    // metricList from conf.toml 
    bodyFormData.append('meastypes', config.metricList);

    // Avoid duplicates by moving on 1ms from last grab
    bodyFormData.append('startdate', getPreviousTimestamp() + 1);
    bodyFormData.append('enddate', currentTime);

    // https://wbsapi.withings.net/v2/user?action=getdevice

    console.log("Getting data from Withings API");
    try {
        const response = await axios.post("https://wbsapi.withings.net/measure", bodyFormData, {
            headers: {
                ...bodyFormData.getHeaders(),
                Authorization: 'Bearer ' + accessToken
            }
        })
        //console.log("Response2: ");
        //console.dir(response.data, { depth: null });

        if (response.data.status != 401) {

            // Pull out the useful info and merge into human readable array of objects
            var mergedData = await processData(response.data.body);

            // Write out to SQLite, CSV and Google Sheets
            await persistData(mergedData);

            // TODO: Move this call to the data saving function eventually so only updates timestamp if data successfully saved locally
            // Next time around use latestTime+1 as the start time
            await storeTime(currentTime);
        } else {
            console.log("Problem with tokens. Getting Replacement Access Token. Please re-run to get Withings data.");

            // console.dir(response.data, { depth: null });

            // Need to kick-off either refresh-token or full re-authentication flow
            // console.log("Refresh Token 7: ", refreshToken);
            await getReplacementAccessToken(refreshToken);
            //console.log("Delete withings2gsheetstokens.json to deal with 401 error")
        }
    } catch (error) {
        // handle error
        console.log("Error Conor1: ", error);
    }
}

module.exports = {
    getPreviousTimestamp,
    getReplacementAccessToken,
    storeTokens,
    storeTime,
    getWithingsData,
    persistData,
    processData,
}
