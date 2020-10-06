# Withings2GSheets Intro

This App accesses your Withings scales data via their API and saves it in various formats locally and on Google Sheets for you to re-use elsewhere. 

LICENSE: Apache-2.0

Copyright Conor O'Neill 2020, conor@conoroneill.com

## TO-DO
* It is currently overly-specific to the Body Cardio scale but it shouldn't take too much effort to work cleanly for other devices. It's really just some of the metrics handling that needs to change.
* More error handling needed in places and Try/Catch around the config file opening etc


## Setting it up for yourself

- Install [Node.js](https://nodejs.org/en/) and [Git](https://git-scm.com/). Then run:

```
git clone https://github.com/conoro/withings2gsheets
cd withings2gsheets
npm install
```

## Config File
Copy config-sample.js to config.js and make the following initial changes:

* Set config.withingsState to some random string
* Set config.gSheetsId to the part of the url after /d/ in the Google Sheet you want to save your data to
* Set config.gSheetsTabId to the gid in the url for the Tab inside the Google Sheet you want to use
* Set config.height to your height in metres.
* Set config.data_dir to where you want all output files and authorization keys to be saved. I keep mine in a Dropbox folder so I can run the code on multiple machines.


## Withings API Setup
* Create a developer account using your existing Withings credentials [here](https://account.withings.com/connectionuser/account_create) 
* Register as a Withings API Partner [here](https://account.withings.com/partner/add_oauth2)
* Your only important App setting in Withings is the Callback URI which should be set to "http://localhost:5000/get_token"
* Once you setup your Withings App, you'll be shown a Client ID and Consumer Secret
* Then go back to config.js and set the following two variables using the info provided by Withings:
  * config.withingsClientID = "Client ID from Withings site"
  * config.withingsClientSecret = "Consumer Secrte from Withings site"
* More Withings API Docs are [here](https://developer.withings.com/oauth2/) for your perusal

## Google Sheets API Setup
* Follow [these instructions](https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication?id=authentication) on the google-spreadhseet NPM module site for configuring Authentication on Google Sheets. Make sure to follow the steps for creating a Service Account.
* Save the generated JSON key file as withings2gsheets-service-account.json in the directory you configured for config.output_dir in config.js. In my case that's in F:/Dropbox/Running and Health/Withings Scales Data 2020 Onwards/.withings2gsheets/

## Running the app
It's as simple as:
```
node index.js
```

* The first time you run it, your browser will open and you'll have to login to Withings and provide permission for the app to access your scales data. 
* The code logs what it is doing to the screen. 
* If all has worked ok, your Google Sheet will now have all of your Withings data. 
* If you have a lot of historical data, it will take quite a while. 
* Once you do that the first time, it will only grab the latest data after that from the API and is very quick.
* Data is also saved to a local SQLite database and to an Excel-compatible CSV file


## Dealing with problems
* If anything ever goes wrong and some data is not saved to CSV, Google Sheets or SQLite, just delete the withingsprevioustime.json file in the .withings2gsheets sub-directory of your output directory. This will cause the code to check all entries back to the start of your Withings history and save any that are missing locally. 
* If you want to just grab data from Withings from a particular time onwards, save that time as [Unix Epoch in seconds](https://www.epochconverter.com/) to withingsprevioustime.json and then run the code
* If you ever run into authorization issues with Withings, just delete the withings2gsheetstokens.json file in the .withings2gsheets sub-directory of your output directory and re-run the code. It'll re-do the authorization flow in your browser.

