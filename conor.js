// Functions only needed by Conor for his decade-old GSheet containing
// one tab per year with daily run data and weight data and notes.
// Takes data from Withings tab and copies it to the current Annual Tab


var config = require('./config');
var dayjs = require('dayjs');
var customParseFormat = require('dayjs/plugin/customParseFormat');
var utc = require('dayjs/plugin/utc') // dependent on utc plugin
var timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);


async function updateCurrentAnnualTab(withingsRow, doc) {

    const annualSheet = doc.sheetsById[config.conorsAnnualTabId];

    // Now using cell-based access as row-based functions trashed cells with formulae
    // Load 365 days worth of cells
    await annualSheet.loadCells('A1:O367');

    var d1 = dayjs(withingsRow.date, "YYYY-MM-DD HH:mm:ss");
    //console.log(withingsRow.date);

    for (var j = 1; j < 367; j++) {
        // Find the matching dates with different formats.
        // Historical date format is not great
        // console.log(annualSheet.getCell(j, 0).formattedValue);
        if (d1.isSame(dayjs(annualSheet.getCell(j, 0).formattedValue, "DD/MM/YYYY"), 'day')) {
            weightKG = annualSheet.getCell(j, config.metricsConor["Weight KG"]).value;

            if ((weightKG === undefined) || (weightKG === " ") || (weightKG === null)) {
                console.log("New Conor Annual Tab Row: ", withingsRow.date, j, withingsRow.Weight);
                // Column Matching
                // Source Column B = Weight in KG >>> Target Column J
                annualSheet.getCell(j, config.metricsConor["Weight KG"]).value = withingsRow.Weight;

                // Calculate Weight in LBS >>> Target Column H
                var lbsString = (withingsRow.Weight / 0.45359237);
                annualSheet.getCell(j, config.metricsConor["Weight lbs"]).value = lbsString;

                // Calculate Weight in LBS/ST >>> Target Columm I
                var stlbsString = Math.floor(lbsString / 14) + "st " + (lbsString % 14).toFixed(2) + "lbs";
                annualSheet.getCell(j, config.metricsConor["Weight"]).value = stlbsString;

                // Source Column E = Fat Mass Weight >>> Target Column K
                annualSheet.getCell(j, config.metricsConor["Body Fat"]).value = withingsRow["Fat Mass Weight"];

                // Source Column H = Hydration >>> Target Column L
                annualSheet.getCell(j, config.metricsConor["Water"]).value = withingsRow["Hydration"];

                // Calculate BMI (could alternatively pull height from API) >>> Target Column M
                // BMI = weight (kg) / [height (m)]2
                annualSheet.getCell(j, config.metricsConor["BMI"]).value = (withingsRow.Weight / (config.height * config.height));

                // Source Column G = Muscle Mass >>> Target Column N 
                annualSheet.getCell(j, config.metricsConor["Muscle"]).value = withingsRow["Muscle Mass"];

                // Save to GSheets
                await annualSheet.saveUpdatedCells();
            }
        }
    }
}

module.exports = {
    updateCurrentAnnualTab
}
