var config = {};
config.metrics = {};

config.withingsClientID = "Get this by creating a Withings App on their Dev site"
config.withingsClientSecret = "Get this by creating a Withings App on their Dev site"
config.withingsState = "some random string"
config.gSheetsId = "Get it from the part of the url after /d/ in the Google Sheet you want to use"
config.gSheetsTabId = "Get it from the gid in url of the Google Sheet you want to use"
config.useConorsTabs = false // should be false for everyone except Conor
config.conorsAnnualTabId = "9999999999"  // For Conor only. Currently 2020 tab of my 10 year old GSheet

config.height = 1.7526 // Your height in metres. Easier than pulling from Withings API

// If any repeated token issues connecting to Withings, you should manually delete withings2gsheetstokens.json in .withings2gsheets and re-run
// I keep my config files and output files in Dropbox so I can run the code on multiple machines. Change the directory below to wherever you want on your PC.
config.data_dir = "D:/Users/conor/Dropbox/Running and Health/Withings Scales Data 2020 Onwards/" 
config.output_dir = config.data_dir + ".withings2gsheets/";

//config.output_dir =
//   (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) +
//   "/.withings2gsheets/";
config.token_path = config.output_dir + "withings2gsheetstokens.json";
config.timestamp_path = config.output_dir + "withingsprevioustime.json";

// This is the file you got from Google when you setup access to GSheets. This should be saved in config.data_dir + ".withings2gsheets/" too
config.gsheets_key_path = config.output_dir + "withings2gsheets-service-account.json";

// This CSV outuput file is slightly unusual so that it loads correctly into Excel with just a double-click
config.csv_output_path = config.data_dir + "withings_data.csv";

// This LevelDB database is the "master" system of record. I never actually do anything with it tho. Just nice to have.
config.leveldb_output_path = config.data_dir + "withings_data.db";


config.metrics = {
   "1": "Weight",
   "5": "Fat Free Mass",
   "6": "Fat Ratio",
   "8": "Fat Mass Weight",
   "11": "Heart Pulse",
   "76": "Muscle Mass",
   "77": "Hydration",
   "88": "Bone Mass",
   "91": "Pulse Wave Velocity"
}

config.metricList = "1,5,6,8,11,76,77,88,91"


// Ignore if you aren't Conor :-) Columns by index
config.metricsConor = {
   "Weight lbs": 7,
   "Weight": 8,
   "Weight KG": 9,
   "Body Fat": 10,
   "Water": 11,
   "BMI": 12,
   "Muscle": 13
}


module.exports = config;

/*
    All available Metrics in August 2020 for all devices
       1	Weight (kg)
       4	Height (meter)
       5	Fat Free Mass (kg)
       6	Fat Ratio (%)
       8	Fat Mass Weight (kg)
       9	Diastolic Blood Pressure (mmHg)
       10	Systolic Blood Pressure (mmHg)
       11	Heart Pulse (bpm) - only for BPM and scale devices
       12	Temperature (celsius)
       54	SP02 (%)
       71	Body Temperature (celsius)
       73	Skin Temperature (celsius)
       76	Muscle Mass (kg)
       77	Hydration (kg)
       88	Bone Mass (kg)
       91	Pulse Wave Velocity (m/s)
       123	VO2 max is a numerical measurement of your body’s ability to consume oxygen (ml/min/kg).

    Available Metrics on Body Cardio Scale, August 2020
       1	Weight (kg)
       5	Fat Free Mass (kg)
       6	Fat Ratio (%)
       8	Fat Mass Weight (kg)
       11	Heart Pulse (bpm)
       76	Muscle Mass (kg)
       77	Hydration (kg)
       88	Bone Mass (kg)
       91	Pulse Wave Velocity (m/s)
*/


