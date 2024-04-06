/* withings2gsheets

 Copyright Conor O'Neill 2020 (conor@conoroneill.com)
 LICENSE: Apache-2.0

 This Node.js app downloads your data that was uploaded by a Withings weighing scales 
 to their Cloud API and saves it to CSV, SQLite and Google Sheets.

*/

let utils = require('./utils.js');

const FormData = require('form-data');

const opn = require("open");
const fs = require("fs");
const express = require('express');
const axios = require('axios');

// Use this approach to access the variables in config.js directly
var config = require('./config');

// First make sure output directory exists
try {
  fs.mkdirSync(config.output_dir);
} catch (err) {
  if (err.code != "EEXIST") {
    throw err;
  }
}

doEverything();

async function doEverything() {
  // Main code block
  const app = express();
  const server = app.listen(5005, '127.0.0.1', () => { });

  let previousTimestamp = utils.getPreviousTimestamp();
  let currentTime = Math.round(Date.now() / 1000);

  // Now deal with the Withings Access Tokens etc
  // Check if we have previously stored a Withings access token.
  try {
    let tokendata = fs.readFileSync(config.token_path);
    // If Withings token exists, read it
    let tokens = JSON.parse(tokendata);

    // If more than 3 hours since last grab, need to use Withings refresh token to get 
    // new access token and new refresh token
    if ((currentTime - previousTimestamp) > 10800) {
      console.log("More than 3 hours since last run. Getting new refresh and access tokens")
      // console.log("Refresh Token 6: ", tokens.refreshToken);
      await utils.getReplacementAccessToken(tokens.refreshToken);
    }

    // Re-read the Withings token file with the new tokens
    tokendata = fs.readFileSync(config.token_path);
    tokens = JSON.parse(tokendata);
    // console.log(tokens);

    // Get latest data from Withings API
    await utils.getWithingsData(tokens.accessToken, tokens.refreshToken, currentTime);


    server.close(() => {
      console.log('Shutting down');
      process.exit(0);
    });

  } catch (err) {
    // If Withings token file doesn't exist, run the full auth flow to get access token
    // and request token from scratch.
    let authURL = "https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=" +
      config.withingsClientID +
      "&redirect_uri=http://localhost:5005/get_token&scope=user.info,user.metrics,user.activity&" +
      "state=" +
      config.withingsState;
    opn(authURL, { wait: false });
  }


  // This route is called-back in a redirect by the Withings OAuth2 flow once you login on the browser
  app.get('/get_token', async (req, res) => {

    // TODO: Add error handling here?
    var bodyFormData = new FormData();
    const requestToken = req.query.code;
    // console.log(requestToken);

    // Use the initial token in the Withings response to request the longterm access token
    bodyFormData.append('action', 'requesttoken');
    bodyFormData.append('grant_type', 'authorization_code');
    bodyFormData.append('client_id', config.withingsClientID);
    bodyFormData.append('client_secret', config.withingsClientSecret);
    bodyFormData.append('code', requestToken);
    bodyFormData.append('redirect_uri', 'http://localhost:5005/get_token');

    try {
      const response = await axios.post("https://wbsapi.withings.net/v2/oauth2", bodyFormData, { headers: bodyFormData.getHeaders() });

      const accessToken = response.data.body.access_token;
      const refreshToken = response.data.body.refresh_token;

      if ((typeof accessToken !== "undefined") && (typeof refreshToken !== "undefined")) {
        console.log("Storing Tokens");

        // Store the tokens
        utils.storeTokens(accessToken, refreshToken);

        // Get the latest Withings data
        await utils.getWithingsData(accessToken, refreshToken, currentTime);

        // Display completed message on browser
        res.status(200).send('Withings data saved!');

        // Hopefully shut down cleanly
        server.close(() => {
          console.log('Shutting down');
          process.exit(0);
        });
      } else {
        // Some problem getting the tokens e.g. bad config.js settings
        console.log("Error getting Access and refresh tokens");

        // Display error  message on browser
        res.status(200).send('Problem in Node.js getting the tokens');

        // Hopefully shut down cleanly
        server.close(() => {
          console.log('Shutting down');
          process.exit(0);
        });
      }
    } catch (error) {
      // handle error
      console.log("Error Conor2: ", error);
    }
  })

}
