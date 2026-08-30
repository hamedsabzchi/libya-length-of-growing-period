

// ============================================================================
// 1. STUDY AREA
// ============================================================================
var libya = ee.FeatureCollection('FAO/GAUL/2015/level0')
  .filter(ee.Filter.eq('ADM0_NAME', 'Libya'));

var appMap = ui.Map();
appMap.centerObject(libya, 6);
appMap.setOptions('HYBRID');

// ============================================================================
// 2. CONSTANTS
// ============================================================================
var DEFAULT_START_YEAR = 2020;
var DEFAULT_END_YEAR = 2024;
var FIRST_VALID_YEAR = 1982;
var LAST_VALID_YEAR = 2024;
var TEMPERATURE_THRESHOLD_C = 5;
var WR_MIN_MM = 5;
var WR_MAX_MM = 150;
var DEFAULT_REFERENCE_WR_MM = 100;

var classPalette = [
  '#e31a23',
  '#fd8d3c',
  '#fed976',
  '#addd8e',
  '#31a354'
];

var classNames = [
  'Class 1: 0 days - Permanently not suitable',
  'Class 2: about 30 days - Marginally not suitable',
  'Class 3: about 60 days - Marginally suitable',
  'Class 4: about 90-120 days - Moderately suitable',
  'Class 5: about 150 days - Highly suitable'
];

var appState = {
  result: null,
  startYear: DEFAULT_START_YEAR,
  endYear: DEFAULT_END_YEAR,
  rainfallSource: 'CHIRPS v2 Daily',
  etSource: 'TerraClimate PET',
  temperatureSource: 'TerraClimate temperature',
  method: 'Gintzburger and Saidi method',
  storageSource: 'SoilGrids spatial WR 0-60 cm',
  referenceStorageMm: DEFAULT_REFERENCE_WR_MM
};

// ============================================================================
// 3. FULL DATASET DESCRIPTIONS
// ============================================================================
var RAINFALL_INFO = {
  'CHIRPS v2 Daily': [
    'DATASET NAME',
    'Climate Hazards Group InfraRed Precipitation with Station data, Version 2.',
    '',
    'EARTH ENGINE INPUT',
    'Asset: UCSB-CHG/CHIRPS/DAILY',
    'Band: precipitation',
    'Native temporal step: daily',
    'Native unit: millimetres per day',
    '',
    'APPLICATION IN THIS MODEL',
    'All daily images in each calendar month are summed.',
    'The resulting monthly rainfall is positive millimetres per month.',
    'No scale factor.',
    '',
    'SPATIAL RESOLUTION',
    'Native grid: 0.05 degrees, approximately 5.6 km at the equator.',
    '',
    'DATA AVAILABILITY AND RECOMMENDED YEARS',
    'The record begins in 1982 and continues to near-present.',
    'This rainfall source itself supports growing year 2025; the final scenario limit depends on the selected ET and temperature sources.',
    'Use 1991-2020 for a 30-year baseline.',
    'Use 2021-2025 only with ERA5-Land potential evaporation, ERA5-Land 2-m temperature and Gintzburger and Saidi method; otherwise use 2020-2024.',
    '',
    'WHAT HAPPENS WHEN SELECTED',
    'CHIRPS becomes the monthly water-supply input.',
    'Interannual and monthly rainfall variability are retained.',
    'The effective output resolution cannot be finer than approximately 5.6 km unless another input is coarser.',
    '',
    'FULL REFERENCE',
    'Funk, C., Peterson, P., Landsfeld, M., Pedreros, D., Verdin, J., Shukla, S., Husak, G., Rowland, J., Harrison, L., Hoell, A. and Michaelsen, J. (2015).',
    'The climate hazards infrared precipitation with stations-a new environmental record for monitoring extremes.',
    'Scientific Data, 2, 150066.',
    'https://doi.org/10.1038/sdata.2015.66'
  ].join('\n'),

  'TerraClimate precipitation': [
    'DATASET NAME',
    'TerraClimate monthly precipitation.',
    '',
    'EARTH ENGINE INPUT',
    'Asset: IDAHO_EPSCOR/TERRACLIMATE',
    'Band: pr',
    'Temporal step: monthly',
    'Unit: monthly total millimetres',
    '',
    'APPLICATION IN THIS MODEL',
    'The pr band is used directly as positive monthly precipitation.',
    'No scale factor.',
    '',
    'SPATIAL RESOLUTION',
    'Approximately 1/24 degree, about 4 km.',
    'Earth Engine nominal pixel size: approximately 4,638 m.',
    '',
    'DATA AVAILABILITY AND RECOMMENDED YEARS',
    'The collection used here is available from January 1958 through December 2024.',
    'This TerraClimate input limits the selected scenario to growing year 2024.',
    'Use 1991-2020 for a climate-normal baseline.',
    'Use 2020-2024 as the most recent complete five-year period available in the Earth Engine TerraClimate collection.',
    '',
    'WHAT HAPPENS WHEN SELECTED',
    'TerraClimate becomes the monthly precipitation input.',
    'Pairing it with TerraClimate PET and temperature gives the most internally consistent climate combination in this app.',
    '',
    'FULL REFERENCE',
    'Abatzoglou, J.T., Dobrowski, S.Z., Parks, S.A. and Hegewisch, K.C. (2018).',
    'TerraClimate, a high-resolution global dataset of monthly climate and climatic water balance from 1958-2015.',
    'Scientific Data, 5, 170191.',
    'https://doi.org/10.1038/sdata.2017.191'
  ].join('\n'),

  'ERA5-Land precipitation': [
    'DATASET NAME',
    'ERA5-Land daily aggregated total precipitation.',
    '',
    'EARTH ENGINE INPUT',
    'Asset: ECMWF/ERA5_LAND/DAILY_AGGR',
    'Band: total_precipitation_sum',
    'Native unit: metres of water equivalent',
    '',
    'APPLICATION IN THIS MODEL',
    'Daily accumulated values are summed for each month.',
    'The monthly sum is multiplied by 1000 to convert metres to positive millimetres.',
    '',
    'SPATIAL RESOLUTION',
    'ERA5-Land native grid spacing is approximately 9 km.',
    'Earth Engine nominal pixel size: 11,132 m.',
    '',
    'DATA AVAILABILITY AND RECOMMENDED YEARS',
    'ERA5-Land begins in 1950 and extends to near-present.',
    'This TerraClimate input limits the selected scenario to growing year 2024.',
    'Use 1991-2020 for a 30-year baseline. With ERA5-Land ET and temperature, 2021-2025 is the most recent complete five-year period.',
    '',
    'WHAT HAPPENS WHEN SELECTED',
    'Reanalysis rainfall becomes the water-supply input.',
    'The effective analysis and export scale becomes 11,132 m.',
    '',
    'REFERENCES',
    'Munoz-Sabater, J. et al. (2021).',
    'ERA5-Land: a state-of-the-art global reanalysis dataset for land applications.',
    'Earth System Science Data, 13, 4349-4383.',
    'https://doi.org/10.5194/essd-13-4349-2021',
    '',
    'Munoz-Sabater, J. (2019).',
    'ERA5-Land monthly averaged data from 1950 to present.',
    'Copernicus Climate Change Service Climate Data Store.',
    'https://doi.org/10.24381/cds.68d2bb30'
  ].join('\n')
};

var ET_INFO = {
  'TerraClimate PET': [
    'DATASET NAME',
    'TerraClimate potential evapotranspiration.',
    '',
    'EARTH ENGINE INPUT',
    'Asset: IDAHO_EPSCOR/TERRACLIMATE',
    'Band: pet',
    'Stored scale factor: 0.1',
    '',
    'APPLICATION IN THIS MODEL',
    'Stored values are multiplied by 0.1.',
    'Final unit: positive millimetres per month.',
    '',
    'SPATIAL RESOLUTION',
    'Approximately 1/24 degree, about 4 km.',
    'Earth Engine nominal pixel size: approximately 4,638 m.',
    '',
    'DATA AVAILABILITY AND RECOMMENDED YEARS',
    'The collection used here is available from January 1958 through December 2024.',
    'This TerraClimate input limits the selected scenario to growing year 2024.',
    'Use 1991-2020 for a climate-normal baseline.',
    'Use 2020-2024 as the most recent complete five-year period available in the Earth Engine TerraClimate collection.',
    '',
    'WHAT HAPPENS WHEN SELECTED',
    'Year-specific monthly evaporative demand is used.',
    'This is the default ET input.',
    'It is allowed with both the FAO reference and Gintzburger and Saidi method.',
    '',
    'FULL REFERENCE',
    'Abatzoglou, J.T., Dobrowski, S.Z., Parks, S.A. and Hegewisch, K.C. (2018).',
    'TerraClimate, a high-resolution global dataset of monthly climate and climatic water balance from 1958-2015.',
    'Scientific Data, 5, 170191.',
    'https://doi.org/10.1038/sdata.2017.191'
  ].join('\n'),

'ERA5-Land potential evaporation': [
  'DATASET NAME',
  'ERA5-Land potential evaporation.',
  '',
  'EARTH ENGINE INPUT',
  'Asset: ECMWF/ERA5_LAND/DAILY_AGGR',
  'Band: potential_evaporation_sum',
  'Native temporal step: daily aggregate derived from hourly ERA5-Land data',
  'Native unit: metres of water equivalent',
  'Native sign convention: upward evaporation is normally stored as a negative value.',
  '',
  'APPLICATION IN THIS MODEL',
  'Daily potential-evaporation values are summed for each calendar month.',
  'The monthly sum is multiplied by -1000.',
  'Multiplication by -1 converts the normally negative upward evaporation flux to a positive evaporative-demand magnitude.',
  'Multiplication by 1000 converts metres to millimetres.',
  'The resulting variable is positive monthly open-water potential evaporation in mm/month.',
  'No crop coefficient or pan coefficient is applied.',
  'The resulting variable must not be described as FAO-56 ET0.',
  '',
  'SPATIAL RESOLUTION',
  'ERA5-Land has an approximate native grid spacing of 9 km.',
  'The Earth Engine catalog reports a nominal pixel size of 11,132 m for this collection.',
  'Selecting this source therefore sets the effective climate-analysis and export scale to at least 11,132 m.',
  'Exporting smaller pixels would not create additional climatic information.',
  '',
  'DATA AVAILABILITY',
  'ERA5-Land begins in 1950 and extends to near-real time.',
  'This source contains the months required for the November 2024 to October 2025 growing-year calculation.',
  'Its use does not by itself guarantee that 2025 is available, because the selected rainfall and temperature sources must also cover the complete growing year.',
  'Growing year 2026 is not currently complete because the model requires data through October 2026.',
  '',
  'RECOMMENDED YEARS',
  'Use 1991-2020 for a standard 30-year historical baseline.',
  'Use 2021-2025 as the most recent complete five-year period only when all of the following are selected:',
  '1. CHIRPS or ERA5-Land rainfall;',
  '2. ERA5-Land potential evaporation;',
  '3. ERA5-Land 2-m temperature; and',
  '4. Gintzburger and Saidi full monthly-balance equation.',
  'If TerraClimate precipitation, PET or temperature is selected, the scenario must end in 2024 because the active Earth Engine TerraClimate collection currently ends in December 2024.',
  '',
  'METHOD COMPATIBILITY',
  'This source is blocked from the FAO reference-LGP option. FAO permits ET0 to be estimated from pan evaporation only through an appropriate pan coefficient.',
  'The FAO reference-LGP option applies a moisture threshold based on 0.5 times reference-crop ET0.',
  'ERA5-Land potential evaporation is open-water or pan potential evaporation and is therefore not physically equivalent to the ET0 required by that FAO criterion.',
  'A sign correction and unit conversion do not make the ERA5-Land variable equivalent to reference-crop ET0.',
  '',
  'This source is available only with the monthly water-balance implementation based on the equation reported by Gintzburger and Saidi:',
  '',
  'IMPORTANT INTERPRETATION',
  'Allowing this source with the Gintzburger and Saidi method does not mean that Gintzburger and Saidi used or endorsed ERA5-Land potential evaporation.',
  '',
  'WHAT HAPPENS WHEN SELECTED',
  'Year-specific monthly open-water potential evaporation becomes the evaporative-demand term.',
  'The model subtracts this positive demand in full within the selected monthly water-balance equation.',
  'Because open-water evaporation can differ systematically from reference-crop ET0, the resulting LGP classification may differ from a calculation using TerraClimate PET.',
  'The result must be labelled as an ERA5-Land open-water-potential-evaporation scenario.',
  '',
  'REFERENCES',
  'Munoz-Sabater, J., Dutra, E., Agusti-Panareda, A., Albergel, C., Arduini, G., Balsamo, G., Boussetta, S., Choulga, M., Harrigan, S., Hersbach, H., Martens, B., Miralles, D.G., Piles, M., Rodriguez-Fernandez, N.J., Zsoter, E., Buontempo, C. and Thepaut, J.-N. (2021).',
  'ERA5-Land: a state-of-the-art global reanalysis dataset for land applications.',
  'Earth System Science Data, 13, 4349-4383.',
  'DOI: https://doi.org/10.5194/essd-13-4349-2021',
  '',
  'Munoz-Sabater, J. (2019).',
  'ERA5-Land monthly averaged data from 1950 to present.',
  'Copernicus Climate Change Service Climate Data Store.',
  'Dataset DOI: https://doi.org/10.24381/cds.68d2bb30',
  '',
  'Food and Agriculture Organization of the United Nations (1998).',
  'Crop evapotranspiration: Guidelines for computing crop water requirements.',
  'FAO Irrigation and Drainage Paper 56.',
  'Reference ET0 documentation: https://www.fao.org/4/X0490E/x0490e00.htm',
  '',
  'Gintzburger, G. and Saidi, S. (2025).',
  'Agro-ecological Zoning of Libya: The Case of Barley and the Olive Tree.',
  'In: The Rangelands of Libya, pp. 589-616.',
  'Chapter DOI: https://doi.org/10.1079/9781800627154.0017'
    
  ].join('\n')
};

var TEMPERATURE_INFO = {
  'TerraClimate temperature': [
    'DATASET NAME',
    'TerraClimate monthly minimum and maximum air temperature.',
    '',
    'EARTH ENGINE INPUT',
    'Asset: IDAHO_EPSCOR/TERRACLIMATE',
    'Bands: tmmn and tmmx',
    'Stored scale factor: 0.1 degrees C',
    '',
    'APPLICATION IN THIS MODEL',
    'Monthly mean temperature is calculated as (tmmn + tmmx) x 0.05.',
    'This is equivalent to the average of monthly minimum and maximum temperature after applying the 0.1 scale factor.',
    'No Kelvin conversion is applied because the scaled tmmn and tmmx bands are already in degrees Celsius.',
    'A month can contribute to LGP only when Tavg is greater than 5 degrees C.',
    '',
    'SPATIAL RESOLUTION',
    'Approximately 1/24 degree, about 4 km.',
    'Earth Engine nominal pixel size: approximately 4,638 m.',
    '',
    'DATA AVAILABILITY AND SCENARIO LIMIT',
    'The Earth Engine collection used here is available through December 2024.',
    'Any scenario using TerraClimate rainfall, PET or temperature is therefore limited to growing year 2024.',
    '',
    'REFERENCE',
    'Abatzoglou, J.T., Dobrowski, S.Z., Parks, S.A. and Hegewisch, K.C. (2018).',
    'TerraClimate, a high-resolution global dataset of monthly climate and climatic water balance from 1958-2015.',
    'Scientific Data, 5, 170191.',
    'https://doi.org/10.1038/sdata.2017.191'
  ].join('\n'),

  'ERA5-Land 2-m temperature': [
    'DATASET NAME',
    'ERA5-Land daily aggregated 2-m air temperature.',
    '',
    'EARTH ENGINE INPUT',
    'Asset: ECMWF/ERA5_LAND/DAILY_AGGR',
    'Band: temperature_2m',
    'Native unit: kelvin',
    '',
    'APPLICATION IN THIS MODEL',
    'Daily mean 2-m temperature images are averaged for each calendar month.',
    'Monthly temperature is converted from kelvin to degrees Celsius by subtracting 273.15.',
    'A month can contribute to LGP only when Tavg is greater than 5 degrees C.',
    '',
    'SPATIAL RESOLUTION',
    'ERA5-Land native grid spacing is approximately 9 km.',
    'Earth Engine nominal pixel size: 11,132 m.',
    '',
    'DATA AVAILABILITY AND SCENARIO LIMIT',
    'ERA5-Land extends beyond October 2025 in the Earth Engine collection.',
    'Growing year 2025 can be calculated when rainfall and ET selections also cover November 2024 through October 2025.',
    'Growing year 2026 is not yet complete because the November 2025 through October 2026 cycle is unfinished.',
    '',
    'REFERENCES',
    'Munoz-Sabater, J. et al. (2021).',
    'ERA5-Land: a state-of-the-art global reanalysis dataset for land applications.',
    'Earth System Science Data, 13, 4349-4383.',
    'https://doi.org/10.5194/essd-13-4349-2021',
    '',
    'Munoz-Sabater, J. (2019).',
    'ERA5-Land monthly averaged data from 1950 to present.',
    'Copernicus Climate Change Service Climate Data Store.',
    'https://doi.org/10.24381/cds.68d2bb30'
  ].join('\n')
};

var METHOD_INFO = {
  'FAO reference LGP': [
    'SCIENTIFIC PURPOSE',
    'Standardized FAO-style reference growing-period calculation.',
    '',
    'TEMPERATURE CONDITION',
    'Monthly mean temperature must be greater than 5 degrees C.',
    '',
    'MOISTURE CONDITION',
    'P + previous UWR must be greater than 0.5 ET0.',
    '',
    'STORAGE UPDATE',
    'B = P + previous UWR - ET0.',
    'Next UWR = min(WR, max(0, B)).',
    '',
    'ALLOWED ET INPUT',
    'TerraClimate PET only in this publication-safe application.',
    '',
    'BLOCKED ET INPUT',
    'ERA5-Land open-water potential evaporation.',
    '',
    'ALLOWED STORAGE OPTIONS',
    'Reference storage 100 mm.',
    'Custom uniform reference storage.',
    'SoilGrids spatial WR for 0-60 cm.',
    '',
    'INTERPRETATION',
    'Using SoilGrids with the FAO moisture criterion is a spatial-storage scenario, not the strict fixed-storage reference configuration.',
    '',
    'REFERENCE',
    'Food and Agriculture Organization of the United Nations (1996).',
    'Agro-ecological zoning: Guidelines.',
    'FAO Soils Bulletin 73. Rome: FAO.',
    'https://www.fao.org/4/w2962e/w2962e00.htm'
  ].join('\n'),

  'Gintzburger and Saidi method': [
    'SCIENTIFIC PURPOSE',
    'Monthly water-balance implementation described for Libya by Gintzburger and Saidi method.',
    '',
    'MONTHLY WATER BALANCE',
    'Mwb = P - ET + previous UWR.',
    '',
    'GROWING MONTH',
    'Monthly mean temperature must be greater than 5 degrees C.',
    'Mwb must be greater than 0 mm.',
    '',
    'STORAGE UPDATE',
    'Next UWR = min(WR, max(0, Mwb)).',
    '',
    'ALLOWED ET INPUTS',
    'TerraClimate PET.',
    'Sign-corrected ERA5-Land open-water potential evaporation.',
    '',
    'ALLOWED STORAGE OPTIONS',
    'Reference storage 100 mm.',
    'Custom uniform reference storage.',
    'Spatial SoilGrids WR for 0-60 cm.',
    '',
    'LIBYA SOURCE',
    'Gintzburger, G. and Saidi, S. Agro-ecological Zoning of Libya: The Case of Barley and the Olive Tree.',
    'The Rangelands of Libya.',
    'https://doi.org/10.1079/9781800627154.0017'
  ].join('\n')
};

var STORAGE_INFO = {
  'Reference storage 100 mm': [
    'STORAGE DEFINITION',
    'Uniform 100-mm reference soil-water storage.',
    '',
    'APPLICATION',
    'Initial UWR before November is 100 mm.',
    'Monthly UWR is constrained between 0 and 100 mm.',
    '',
    'COMPATIBILITY',
    'Available with the FAO reference method and the Gintzburger and Saidi method.',
    'Use this option when a strict fixed 100-mm reference-storage scenario is required.',
    '',
    'REFERENCE',
    'Food and Agriculture Organization of the United Nations (1996).',
    'Agro-ecological zoning: Guidelines. FAO Soils Bulletin 73.',
    'https://www.fao.org/4/w2962e/w2962e00.htm'
  ].join('\n'),

  'Custom uniform reference storage': [
    'STORAGE DEFINITION',
    'User-defined uniform reference soil-water storage.',
    '',
    'ALLOWED RANGE',
    'Enter a value from 5 to 150 mm.',
    'The default value is 100 mm.',
    '',
    'APPLICATION',
    'The entered value is used as the uniform maximum storage capacity at every pixel in Libya.',
    'The same value is also used as the initial available soil water before November in every simulated growing year.',
    'This is a model assumption, not observed November soil moisture.',
    '',
    'INTERPRETATION',
    'Lower values normally reduce carry-over water and may shorten LGP in water-limited locations.',
    'Higher values normally increase carry-over water and may lengthen LGP in water-limited locations.',
    'The selected value must be reported with the result because it directly affects the monthly water balance.',
    '',
    'COMPATIBILITY',
    'Available with the FAO reference method and the Gintzburger and Saidi method.',
    'For comparison with the former fixed setup, retain the default value of 100 mm.',
    '',
    'REFERENCE CONTEXT',
    'Food and Agriculture Organization of the United Nations (1996).',
    'Agro-ecological zoning: Guidelines. FAO Soils Bulletin 73.',
    'https://www.fao.org/4/w2962e/w2962e00.htm'
  ].join('\n'),

  'SoilGrids spatial WR 0-60 cm': [
    'DATASET PURPOSE',
    'Spatial plant-available water in the upper 60 cm.',
    '',
    'EARTH ENGINE INPUTS',
    'ISRIC/SoilGrids250m/v2_0/wv0033',
    'ISRIC/SoilGrids250m/v2_0/wv1500',
    '',
    'DEPTH INTERVALS',
    '0-5 cm, 5-15 cm, 15-30 cm and 30-60 cm.',
    '',
    'CALCULATION',
    'Layer WR = max(0, water content at 33 kPa minus water content at 1500 kPa) multiplied by layer thickness in metres.',
    'Thicknesses are 0.05, 0.10, 0.15 and 0.30 m.',
    'The four layers are summed.',
    'Total WR is constrained to 5-150 mm.',
    '',
    'SPATIAL AND TEMPORAL CHARACTER',
    'Source grid: 250 m.',
    'Static machine-learning soil prediction, not an annual time series.',
    '',
    'WHAT HAPPENS WHEN SELECTED',
    'Soil-water capacity varies spatially.',
    'Pixels with larger WR can retain more water between months.',
    'The export scale still follows the coarsest selected climate input.',
    '',
    'COMPATIBILITY',
    'Available with the Gintzburger and Saidi method.',
    'Also available with the FAO reference moisture criterion as a spatial-storage scenario.',
    'When used with FAO, report the result as FAO LGP with SoilGrids-derived spatial WR, not as the strict fixed 100-mm reference setup.',
    '',
    'REFERENCE',
    'Turek, M.E., Poggio, L., Batjes, N.H., Armindo, R.A., de Jong van Lier, Q., de Sousa, L. and Heuvelink, G.B.M. (2023).',
    'Global mapping of volumetric water retention at 100, 330 and 15 000 cm suction using the WoSIS database.',
    'International Soil and Water Conservation Research, 11(2), 225-239.',
    'https://doi.org/10.1016/j.iswcr.2022.08.001'
  ].join('\n')
};

// ============================================================================
// 4. SOURCE RESOLUTION AND RECOMMENDATION HELPERS
// ============================================================================
var RAIN_SCALE = {
  'CHIRPS v2 Daily': 5566,
  'TerraClimate precipitation': 4638,
  'ERA5-Land precipitation': 11132
};

var ET_SCALE = {
  'TerraClimate PET': 4638,
  'ERA5-Land potential evaporation': 11132
};

var TEMPERATURE_SCALE = {
  'TerraClimate temperature': 4638,
  'ERA5-Land 2-m temperature': 11132
};

function effectiveScale(rainfall, et, temperature) {
  return Math.max(
    RAIN_SCALE[rainfall],
    ET_SCALE[et],
    TEMPERATURE_SCALE[temperature]
  );
}

function scenarioMaximumYear(rainfall, et, temperature) {
  var usesTerraClimate =
    rainfall === 'TerraClimate precipitation' ||
    et === 'TerraClimate PET' ||
    temperature === 'TerraClimate temperature';
  return usesTerraClimate ? 2024 : 2025;
}

function scenarioRecentPeriod(rainfall, et, temperature) {
  return scenarioMaximumYear(rainfall, et, temperature) === 2025
    ? '2021-2025'
    : '2020-2024';
}

function combinationAdvice(rainfall, et, temperature, method, storage) {
  var maximumYear = scenarioMaximumYear(rainfall, et, temperature);
  var text = 'SELECTED COMBINATION RECOMMENDATION\n\n';

  if (rainfall === 'TerraClimate precipitation' &&
      et === 'TerraClimate PET' &&
      temperature === 'TerraClimate temperature') {
    text += 'Most internally consistent TerraClimate combination.\n';
    text += 'Rainfall, PET and temperature share TerraClimate monthly timestamps and grid.\n';
  } else if (rainfall === 'CHIRPS v2 Daily' &&
             et === 'ERA5-Land potential evaporation' &&
             temperature === 'ERA5-Land 2-m temperature') {
    text += 'Updated multi-source combination using CHIRPS rainfall and ERA5-Land evaporation and temperature.\n';
    text += 'This combination supports growing year 2025.\n';
  } else if (temperature === 'ERA5-Land 2-m temperature') {
    text += 'ERA5-Land temperature supplies the independent Tavg > 5 C growing-month condition.\n';
  } else {
    text += 'This is a valid multi-source combination subject to the selected-source date limit.\n';
  }

  text += 'Latest complete growing year for this combination: ' + maximumYear + '.\n';
  text += 'Most recent complete five-year period: ' + scenarioRecentPeriod(rainfall, et, temperature) + '.\n';
  text += 'Long-term baseline: 1991-2020.\n';
  text += '\nSelected method: ' + method + '.\n';
  text += 'Selected storage: ' + storage + '.\n';
  text += 'Effective export scale: ' + effectiveScale(rainfall, et, temperature) + ' m.';
  return text;
}

// ============================================================================
// 5. SOIL WATER RESERVE
// ============================================================================
var wv0033 = ee.Image('ISRIC/SoilGrids250m/v2_0/wv0033').clip(libya);
var wv1500 = ee.Image('ISRIC/SoilGrids250m/v2_0/wv1500').clip(libya);

function layerWR(band, thicknessM) {
  return wv0033.select(band)
    .subtract(wv1500.select(band))
    .max(0)
    .multiply(thicknessM);
}

var spatialWR = layerWR('val_0_5cm_mean', 0.05)
  .add(layerWR('val_5_15cm_mean', 0.10))
  .add(layerWR('val_15_30cm_mean', 0.15))
  .add(layerWR('val_30_60cm_mean', 0.30))
  .max(WR_MIN_MM)
  .min(WR_MAX_MM)
  .rename('WR_mm')
  .clip(libya);

var referenceWR = ee.Image.constant(100)
  .rename('WR_mm')
  .clip(libya);


function customReferenceWR(referenceStorageMm) {
  return ee.Image.constant(referenceStorageMm)
    .rename('WR_mm')
    .clip(libya);
}

// ============================================================================
// 6. CLIMATE FUNCTIONS
// ============================================================================
function monthlyRainfall(year, month, source) {
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');

  if (source === 'TerraClimate precipitation') {
    return ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
      .filterDate(start, end)
      .select('pr')
      .first()
      .toFloat()
      .max(0)
      .rename('P_mm');
  }

  if (source === 'ERA5-Land precipitation') {
    return ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
      .filterDate(start, end)
      .select('total_precipitation_sum')
      .sum()
      .multiply(1000)
      .max(0)
      .toFloat()
      .rename('P_mm');
  }

  return ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
    .filterDate(start, end)
    .select('precipitation')
    .sum()
    .toFloat()
    .max(0)
    .rename('P_mm');
}

function monthlyET(year, month, source) {
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');

  if (source === 'TerraClimate PET') {
    return ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
      .filterDate(start, end)
      .select('pet')
      .first()
      .multiply(0.1)
      .max(0)
      .toFloat()
      .rename('ET_mm');
  }

  if (source === 'ERA5-Land potential evaporation') {
    return ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
      .filterDate(start, end)
      .select('potential_evaporation_sum')
      .sum()
      .multiply(-1000)
      .max(0)
      .toFloat()
      .rename('ET_mm');
  }

  throw new Error('Unsupported ET source.');
}

function monthlyTemperature(year, month, source) {
  var start = ee.Date.fromYMD(year, month, 1);
  var end = start.advance(1, 'month');

  if (source === 'ERA5-Land 2-m temperature') {
    return ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR')
      .filterDate(start, end)
      .select('temperature_2m')
      .mean()
      .subtract(273.15)
      .toFloat()
      .rename('Tavg_C');
  }

  var image = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
    .filterDate(start, end)
    .first();

  return image.select('tmmn')
    .add(image.select('tmmx'))
    .multiply(0.05)
    .toFloat()
    .rename('Tavg_C');
}

function monthlyClimate(year, month, rainfallSource, etSource, temperatureSource) {
  return ee.Image.cat([
    monthlyRainfall(year, month, rainfallSource),
    monthlyET(year, month, etSource),
    monthlyTemperature(year, month, temperatureSource)
  ]).set({
    year: year,
    month: month,
    rainfall_source: rainfallSource,
    et_source: etSource,
    temperature_source: temperatureSource,
    'system:time_start': ee.Date.fromYMD(year, month, 1).millis()
  });
}

function growingYearMonths(year, rainfallSource, etSource, temperatureSource) {
  var previousYear = year - 1;
  return ee.List([
    monthlyClimate(previousYear, 11, rainfallSource, etSource, temperatureSource),
    monthlyClimate(previousYear, 12, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 1, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 2, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 3, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 4, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 5, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 6, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 7, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 8, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 9, rainfallSource, etSource, temperatureSource),
    monthlyClimate(year, 10, rainfallSource, etSource, temperatureSource)
  ]);
}

// ============================================================================
// 7. LGP WATER BALANCE
// ============================================================================
function annualLGP(year, rainfallSource, etSource, temperatureSource, method, storageSource, referenceStorageMm) {
  var months = growingYearMonths(year, rainfallSource, etSource, temperatureSource);
  var capacity;
  if (storageSource === 'SoilGrids spatial WR 0-60 cm') {
    capacity = spatialWR;
  } else if (storageSource === 'Custom uniform reference storage') {
    capacity = customReferenceWR(referenceStorageMm);
  } else {
    capacity = referenceWR;
  }

  var output = ee.List.sequence(0, 11).iterate(function(index, state) {
    state = ee.Dictionary(state);
    var previousUWR = ee.Image(state.get('uwr'));
    var previousLGP = ee.Image(state.get('lgp'));
    var climate = ee.Image(months.get(ee.Number(index)));
    var p = climate.select('P_mm');
    var et = climate.select('ET_mm');
    var t = climate.select('Tavg_C');

    var fullBalance = p
      .add(previousUWR)
      .subtract(et)
      .rename('Mwb_mm');

    var nextUWR = fullBalance
      .max(0)
      .min(capacity)
      .rename('UWR_mm');

    var moistureCondition = method === 'FAO reference LGP'
      ? p.add(previousUWR).gt(et.multiply(0.5))
      : fullBalance.gt(0);

    var growingMonth = t
      .gt(TEMPERATURE_THRESHOLD_C)
      .and(moistureCondition)
      .rename('GP');

    return ee.Dictionary({
      uwr: nextUWR,
      lgp: previousLGP.add(growingMonth)
    });
  }, {
    uwr: capacity,
    lgp: ee.Image.constant(0)
  });

  return ee.Image(ee.Dictionary(output).get('lgp'))
    .rename('LGP_months')
    .clip(libya)
    .set({
      growing_year: year,
      'system:time_start': ee.Date.fromYMD(year, 10, 31).millis()
    });
}

function annualCollection(startYear, endYear, rainfall, et, temperature, method, storage, referenceStorageMm) {
  var images = [];
  for (var year = startYear; year <= endYear; year++) {
    images.push(annualLGP(year, rainfall, et, temperature, method, storage, referenceStorageMm));
  }
  return ee.ImageCollection.fromImages(images).sort('system:time_start');
}

function classifyLGP(days) {
  var result = ee.Image(1).clip(libya);
  result = result.where(days.gte(30), 2);
  result = result.where(days.gte(60), 3);
  result = result.where(days.gte(90), 4);
  result = result.where(days.gte(150), 5);
  return result.rename('LGP_Class').toByte();
}

function buildResult(startYear, endYear, rainfall, et, temperature, method, storage, referenceStorageMm) {
  var annual = annualCollection(startYear, endYear, rainfall, et, temperature, method, storage, referenceStorageMm);
  var medianMonths = annual.select('LGP_months').median().clip(libya);
  var days = medianMonths.multiply(30).rename('LGP_days');
  return {
    annual: annual,
    medianMonths: medianMonths,
    days: days,
    classes: classifyLGP(days)
  };
}

// ============================================================================
// 8. VALIDATION
// ============================================================================
function validate(startYear, endYear, rainfall, et, temperature, method, storage, referenceStorageMm) {
  if (!isFinite(startYear) || !isFinite(endYear)) {
    throw new Error('Start and end years must be valid whole years.');
  }
  var maximumYear = scenarioMaximumYear(rainfall, et, temperature);
  if (startYear < FIRST_VALID_YEAR || endYear > maximumYear) {
    throw new Error(
      'The selected source combination supports complete growing years from ' +
      FIRST_VALID_YEAR + ' through ' + maximumYear + '. ' +
      'Any TerraClimate input limits the end year to 2024. ' +
      'A combination using CHIRPS or ERA5-Land rainfall, ERA5-Land potential evaporation, ' +
      'and ERA5-Land 2-m temperature supports growing year 2025.'
    );
  }
  if (startYear > endYear) {
    throw new Error('Start year cannot be later than end year.');
  }
  if ((endYear - startYear + 1) < 3) {
    throw new Error('Select at least three complete years.');
  }
  if (method === 'FAO reference LGP' && et !== 'TerraClimate PET') {
    throw new Error('FAO reference LGP requires TerraClimate PET in this application.');
  }
  if (storage === 'Custom uniform reference storage') {
    if (!isFinite(referenceStorageMm)) {
      throw new Error('Custom reference storage must be a valid number in millimetres.');
    }
    if (referenceStorageMm < WR_MIN_MM || referenceStorageMm > WR_MAX_MM) {
      throw new Error(
        'Custom reference storage must be between ' + WR_MIN_MM +
        ' and ' + WR_MAX_MM + ' mm.'
      );
    }
  }
  // FAO reference LGP is allowed with all storage options in this version.
  // TerraClimate PET remains required for FAO, but WR capacity may be fixed, custom uniform, or SoilGrids spatial.
}

// ============================================================================
// 9. USER INTERFACE HELPERS
// ============================================================================
var COLORS = {
  navy: '#0b3c5d',
  blue: '#1769aa',
  green: '#2e7d32',
  lightGreen: '#e8f5e9',
  lightBlue: '#eaf4fb',
  orange: '#fff3e0',
  red: '#b71c1c',
  gray: '#f5f7fa',
  dark: '#263238',
  muted: '#607d8b',
  white: '#ffffff'
};

function infoBox(text, color, background) {
  return ui.Label(text, {
    fontSize: '10px',
    color: color,
    backgroundColor: background,
    padding: '7px',
    margin: '4px 0',
    whiteSpace: 'pre-wrap'
  });
}

function heading(text) {
  return ui.Label(text, {
    fontWeight: 'bold',
    fontSize: '13px',
    color: COLORS.navy,
    margin: '8px 0 4px 0'
  });
}

function addLine(panel, name, value) {
  panel.add(ui.Label(name + ': ' + value, {
    fontSize: '11px',
    color: COLORS.dark,
    margin: '2px 0',
    whiteSpace: 'pre-wrap'
  }));
}

// ============================================================================
// 10. PANELS
// ============================================================================
var controlPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    width: '370px',
    padding: '10px',
    backgroundColor: COLORS.white,
    stretch: 'vertical'
  }
});

var guidePanel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    position: 'top-right',
    width: '410px',
    height: '85%',
    maxHeight: '680px',
    padding: '10px',
    backgroundColor: COLORS.white,
    border: '1px solid #cfd8dc',
    shown: true
  }
});

var guideContent = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    width: '100%',
    padding: '0 4px 6px 0',
    stretch: 'horizontal'
  }
});

var resultPanel = ui.Panel();
var chartPanel = ui.Panel();
var exportPanel = ui.Panel({style: {shown: false}});
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-left',
    width: '330px',
    padding: '10px',
    backgroundColor: COLORS.white,
    border: '1px solid #cccccc'
  }
});

// ============================================================================
// 11. CONTROLS
// ============================================================================
var periodSelect = ui.Select({
  items: [
    '2020-2024 | Most recent TerraClimate five-year period',
    '2021-2025 | Most recent ERA5-Land-supported five-year period',
    '1991-2020 | 30-year baseline',
    '1982-2024 | Extended TerraClimate-compatible period',
    '1982-2025 | Extended ERA5-Land-supported period',
    '1982-2010 | Earlier period',
    'Custom period'
  ],
  value: '2020-2024 | Most recent TerraClimate five-year period',
  style: {stretch: 'horizontal'}
});

var startYearBox = ui.Textbox({
  value: String(DEFAULT_START_YEAR),
  placeholder: 'Start year',
  style: {width: '145px'}
});

var endYearBox = ui.Textbox({
  value: String(DEFAULT_END_YEAR),
  placeholder: 'End year',
  style: {width: '145px'}
});

var yearPanel = ui.Panel({
  widgets: [
    ui.Panel([ui.Label('Start year'), startYearBox]),
    ui.Panel([ui.Label('End year'), endYearBox])
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});

var rainfallSelect = ui.Select({
  items: Object.keys(RAINFALL_INFO),
  value: appState.rainfallSource,
  style: {stretch: 'horizontal'}
});

var rainfallInfo = infoBox(
  RAINFALL_INFO[appState.rainfallSource],
  COLORS.dark,
  COLORS.lightBlue
);

var etSelect = ui.Select({
  items: Object.keys(ET_INFO),
  value: appState.etSource,
  style: {stretch: 'horizontal'}
});

var etInfo = infoBox(
  ET_INFO[appState.etSource],
  COLORS.dark,
  COLORS.lightBlue
);

var temperatureSelect = ui.Select({
  items: Object.keys(TEMPERATURE_INFO),
  value: appState.temperatureSource,
  style: {stretch: 'horizontal'}
});

var temperatureInfo = infoBox(
  TEMPERATURE_INFO[appState.temperatureSource],
  COLORS.dark,
  COLORS.lightBlue
);

temperatureSelect.onChange(function(value) {
  temperatureInfo.setValue(TEMPERATURE_INFO[value]);
  updateAdvice();
});

var methodSelect = ui.Select({
  items: Object.keys(METHOD_INFO),
  value: appState.method,
  style: {stretch: 'horizontal'}
});

var methodInfo = infoBox(
  METHOD_INFO[appState.method],
  COLORS.dark,
  COLORS.lightGreen
);

var storageSelect = ui.Select({
  items: Object.keys(STORAGE_INFO),
  value: appState.storageSource,
  style: {stretch: 'horizontal'}
});

var storageInfo = infoBox(
  STORAGE_INFO[appState.storageSource],
  COLORS.dark,
  COLORS.lightBlue
);


var referenceStorageBox = ui.Textbox({
  value: String(DEFAULT_REFERENCE_WR_MM),
  placeholder: '5-150 mm',
  style: {width: '110px'}
});

var referenceStoragePanel = ui.Panel({
  widgets: [
    ui.Label('Custom uniform storage (mm):'),
    referenceStorageBox
  ],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {
    shown: false,
    margin: '3px 0 5px 0'
  }
});

var referenceStorageHelp = infoBox(
  'Allowed range: 5-150 mm. The selected value is used as both the uniform ' +
  'storage capacity and the initial available storage before November in every ' +
  'simulated growing year. Default: 100 mm.',
  COLORS.dark,
  COLORS.orange
);
referenceStorageHelp.style().set('shown', false);

function updateReferenceStorageVisibility(storageSource) {
  var showCustom = storageSource === 'Custom uniform reference storage';
  referenceStoragePanel.style().set('shown', showCustom);
  referenceStorageHelp.style().set('shown', showCustom);
}

var adviceInfo = infoBox(
  combinationAdvice(
    appState.rainfallSource,
    appState.etSource,
    appState.temperatureSource,
    appState.method,
    appState.storageSource
  ),
  COLORS.dark,
  COLORS.orange
);

function updateAdvice() {
  adviceInfo.setValue(combinationAdvice(
    rainfallSelect.getValue(),
    etSelect.getValue(),
    temperatureSelect.getValue(),
    methodSelect.getValue(),
    storageSelect.getValue()
  ));
}

rainfallSelect.onChange(function(value) {
  rainfallInfo.setValue(RAINFALL_INFO[value]);
  updateAdvice();
});

etSelect.onChange(function(value) {
  etInfo.setValue(ET_INFO[value]);
  updateAdvice();
});

methodSelect.onChange(function(value) {
  methodInfo.setValue(METHOD_INFO[value]);
  if (value === 'FAO reference LGP') {
    etSelect.setValue('TerraClimate PET');
    updateReferenceStorageVisibility(storageSelect.getValue());
  }
  updateAdvice();
});

storageSelect.onChange(function(value) {
  storageInfo.setValue(STORAGE_INFO[value]);
  updateReferenceStorageVisibility(value);
  updateAdvice();
});

referenceStorageBox.onChange(function(value) {
  if (storageSelect.getValue() === 'Custom uniform reference storage') {
    updateAdvice();
  }
});

periodSelect.onChange(function(value) {
  if (value.indexOf('2020-2024') === 0) {
    startYearBox.setValue('2020');
    endYearBox.setValue('2024');
  }
  if (value.indexOf('2021-2025') === 0) {
    startYearBox.setValue('2021');
    endYearBox.setValue('2025');
  }
  if (value.indexOf('1991-2020') === 0) {
    startYearBox.setValue('1991');
    endYearBox.setValue('2020');
  }
  if (value.indexOf('1982-2024') === 0) {
    startYearBox.setValue('1982');
    endYearBox.setValue('2024');
  }
  if (value.indexOf('1982-2025') === 0) {
    startYearBox.setValue('1982');
    endYearBox.setValue('2025');
  }
  if (value.indexOf('1982-2010') === 0) {
    startYearBox.setValue('1982');
    endYearBox.setValue('2010');
  }
});

var diagnosticsCheckbox = ui.Checkbox({
  label: 'Calculate area statistics and chart',
  value: false
});

var runButton = ui.Button({
  label: 'GENERATE MAP',
  style: {
    stretch: 'horizontal',
    color: COLORS.white,
    backgroundColor: COLORS.green,
    fontWeight: 'bold',
    margin: '6px 0'
  }
});

var resetButton = ui.Button({
  label: 'Reset app',
  style: {stretch: 'horizontal'}
});

var statusLabel = infoBox(
  'Ready. Select the period and inputs, then generate the map.',
  COLORS.muted,
  COLORS.gray
);

// ============================================================================
// 12. MAP AND LEGEND
// ============================================================================
function addBoundary() {
  appMap.addLayer(
    libya.style({
      color: '111111',
      fillColor: '00000000',
      width: 2
    }),
    {},
    'Libya Boundary',
    true
  );
}

function drawLegend() {
  legendPanel.clear();
  legendPanel.add(ui.Label('LGP Classification', {
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 0 8px 0'
  }));

  for (var i = 0; i < classNames.length; i++) {
    var box = ui.Label('', {
      backgroundColor: classPalette[i],
      padding: '8px',
      margin: '0 6px 4px 0',
      width: '18px',
      height: '14px'
    });

    var label = ui.Label(classNames[i], {
      fontSize: '10px',
      margin: '1px 0 4px 0'
    });

    legendPanel.add(ui.Panel(
      [box, label],
      ui.Panel.Layout.flow('horizontal')
    ));
  }
}

function displayResult() {
  appMap.layers().reset();
  appMap.addLayer(
    appState.result.classes,
    {min: 1, max: 5, palette: classPalette},
    'LGP Classification',
    true,
    0.9
  );
  addBoundary();
  drawLegend();
  appMap.centerObject(libya, 6);
}

// ============================================================================
// 13. GUIDANCE AND REFERENCES
// ============================================================================
function renderGuide() {
  guideContent.clear();

  guideContent.add(heading('Selected configuration'));

  addLine(
    guideContent,
    'Rainfall',
    appState.rainfallSource
  );

  addLine(
    guideContent,
    'Evaporation / ET',
    appState.etSource
  );

  addLine(
    guideContent,
    'Temperature',
    appState.temperatureSource
  );

  addLine(
    guideContent,
    'LGP method',
    appState.method
  );

  addLine(
    guideContent,
    'Soil storage',
    appState.storageSource
  );
  if (appState.storageSource === 'Custom uniform reference storage') {
    addLine(
      guideContent,
      'Custom reference storage',
      appState.referenceStorageMm + ' mm'
    );
  }

  addLine(
    guideContent,
    'Recommendation',
    combinationAdvice(
      appState.rainfallSource,
      appState.etSource,
      appState.temperatureSource,
      appState.method,
      appState.storageSource
    )
  );

  addLine(
    guideContent,
    'Temperature input',
    appState.temperatureSource +
      '. See the selected Temperature source description for its band, ' +
      'unit conversion, spatial resolution and available dates.'
  );

  addLine(
    guideContent,
    'Export scale',
    effectiveScale(
      appState.rainfallSource,
      appState.etSource,
      appState.temperatureSource
    ) + ' m'
  );

  // --------------------------------------------------------------------------
  // MULTI-YEAR PROCESSING EXPLANATION
  // --------------------------------------------------------------------------
  guideContent.add(
    heading('Multi-year calculation')
  );

  guideContent.add(
    infoBox(
      'The application calculates LGP independently for every selected ' +
      'growing year. Each growing year starts in November of the previous ' +
      'calendar year and ends in October of the named growing year. For ' +
      'example, growing year 2025 covers November 2024 through October ' +
      '2025.\n\n' +

      'For each growing year, the application evaluates all twelve months ' +
      'in sequence. A month receives a value of 1 when the selected ' +
      'temperature and moisture conditions are satisfied, or 0 when those ' +
      'conditions are not satisfied. The twelve monthly values are summed ' +
      'to create one annual LGP image expressed as the number of qualifying ' +
      'growing months from 0 to 12.\n\n' +

      'After all selected growing years have been processed, the application ' +
      'calculates the pixel-wise median of the annual LGP images. The median ' +
      'is calculated independently at every pixel, so the final value is the ' +
      'middle annual LGP value at that location across the selected period.\n\n' +

      'The median LGP in months is multiplied by 30 to obtain approximate ' +
      'LGP days. Those approximate days are classified into the five final ' +
      'LGP classes displayed on the map.' +
      '' +
      '',
      COLORS.dark,
      COLORS.lightBlue
    )
  );

  guideContent.add(resultPanel);
  guideContent.add(chartPanel);
}


function renderMethods() {
  guideContent.clear();

  guideContent.add(
    heading('FAO reference LGP')
  );

  guideContent.add(
    infoBox(
      METHOD_INFO['FAO reference LGP'],
      COLORS.dark,
      COLORS.lightGreen
    )
  );

  guideContent.add(
    heading('Gintzburger and Saidi method')
  );

  guideContent.add(
    infoBox(
      METHOD_INFO['Gintzburger and Saidi method'],
      COLORS.dark,
      COLORS.lightBlue
    )
  );

  guideContent.add(
    infoBox(
      'The map is a climatic LGP indicator. It is not a complete ' +
      'crop-suitability assessment or a national agro-ecological zoning map.',
      COLORS.red,
      COLORS.orange
    )
  );
}


function renderInterpretation() {
  guideContent.clear();

  guideContent.add(
    heading('Interpretation')
  );

  for (var i = 0; i < classNames.length; i++) {
    addLine(
      guideContent,
      'Class ' + (i + 1),
      classNames[i].split(': ')[1]
    );
  }

  guideContent.add(
    infoBox(
      'A longer LGP means that the selected temperature and moisture ' +
      'conditions were satisfied in more months. The final class represents ' +
      'the pixel-wise median of the independently calculated annual LGP ' +
      'values over the selected period.',
      COLORS.dark,
      COLORS.orange
    )
  );
}


function renderReferences() {
  guideContent.clear();

  guideContent.add(
    heading('References')
  );

  guideContent.add(
    infoBox(
      'Only public dataset documentation, peer-reviewed publications and ' +
      'official data catalogues are cited in this application. Web addresses ' +
      'are shown as plain text because Earth Engine ui.Label does not render ' +
      'embedded HTML links.',
      COLORS.dark,
      COLORS.lightGreen
    )
  );

  addLine(
    guideContent,
    'CHIRPS rainfall',
    'Funk, C., Peterson, P., Landsfeld, M., Pedreros, D., Verdin, J., ' +
    'Shukla, S., Husak, G., Rowland, J., Harrison, L., Hoell, A. and ' +
    'Michaelsen, J. (2015). The climate hazards infrared precipitation ' +
    'with stations: a new environmental record for monitoring extremes. ' +
    'Scientific Data, 2, 150066. DOI: ' +
    'https://doi.org/10.1038/sdata.2015.66'
  );

  addLine(
    guideContent,
    'TerraClimate',
    'Abatzoglou, J.T., Dobrowski, S.Z., Parks, S.A. and Hegewisch, K.C. ' +
    '(2018). TerraClimate, a high-resolution global dataset of monthly ' +
    'climate and climatic water balance from 1958-2015. Scientific Data, ' +
    '5, 170191. DOI: ' +
    'https://doi.org/10.1038/sdata.2017.191'
  );

  addLine(
    guideContent,
    'ERA5-Land scientific paper',
    'Munoz-Sabater, J., Dutra, E., Agusti-Panareda, A., Albergel, C., ' +
    'Arduini, G., Balsamo, G., Boussetta, S., Choulga, M., Harrigan, S., ' +
    'Hersbach, H., Martens, B., Miralles, D.G., Piles, M., ' +
    'Rodriguez-Fernandez, N.J., Zsoter, E., Buontempo, C. and ' +
    'Thepaut, J.-N. (2021). ERA5-Land: a state-of-the-art global ' +
    'reanalysis dataset for land applications. Earth System Science Data, ' +
    '13, 4349-4383. DOI: ' +
    'https://doi.org/10.5194/essd-13-4349-2021'
  );

  addLine(
    guideContent,
    'ERA5-Land dataset',
    'Munoz-Sabater, J. (2019). ERA5-Land monthly averaged data from 1950 ' +
    'to present. Copernicus Climate Change Service Climate Data Store. ' +
    'Dataset DOI: ' +
    'https://doi.org/10.24381/cds.68d2bb30'
  );

  addLine(
    guideContent,
    'Soil water retention',
    'Turek, M.E., Poggio, L., Batjes, N.H., Armindo, R.A., de Jong van ' +
    'Lier, Q., de Sousa, L. and Heuvelink, G.B.M. (2023). Global mapping ' +
    'of volumetric water retention at 100, 330 and 15 000 cm suction using ' +
    'the WoSIS database. International Soil and Water Conservation ' +
    'Research, 11(2), 225-239. DOI: ' +
    'https://doi.org/10.1016/j.iswcr.2022.08.001'
  );

  addLine(
    guideContent,
    'FAO AEZ and LGP method',
    'Food and Agriculture Organization of the United Nations (1996). ' +
    'Agro-ecological zoning: Guidelines. FAO Soils Bulletin 73. Rome: FAO. ' +
    'Official publication: ' +
    'https://www.fao.org/4/w2962e/w2962e00.htm'
  );

  addLine(
    guideContent,
    'Libya Gintzburger and Saidi method',
    'Gintzburger, G. and Saidi, S. (2025). Agro-ecological Zoning of ' +
    'Libya: The Case of Barley and the Olive Tree. In: The Rangelands of ' +
    'Libya, pp. 589-616. Chapter DOI: ' +
    'https://doi.org/10.1079/9781800627154.0017'
  );
}

// ============================================================================
// 14. RESULT SUMMARY AND AREA STATISTICS
// ============================================================================
function updateResultPanel() {
  resultPanel.clear();
  resultPanel.add(heading('Result summary'));

  if (!appState.result) {
    resultPanel.add(infoBox('No result yet.', COLORS.muted, COLORS.gray));
    return;
  }

  addLine(resultPanel, 'Period', appState.startYear + '-' + appState.endYear);
  addLine(resultPanel, 'Rainfall source', appState.rainfallSource);
  addLine(resultPanel, 'ET source', appState.etSource);
  addLine(resultPanel, 'Temperature source', appState.temperatureSource);
  addLine(resultPanel, 'Method', appState.method);
  addLine(resultPanel, 'Storage', appState.storageSource);
if (appState.storageSource === 'Custom uniform reference storage') {
    addLine(resultPanel, 'Custom reference storage', appState.referenceStorageMm + ' mm');
  }
  addLine(resultPanel, 'Effective export scale',
    effectiveScale(appState.rainfallSource, appState.etSource, appState.temperatureSource) + ' m');
  addLine(resultPanel, 'Final statistic', 'Pixel-wise median annual LGP');
  addLine(resultPanel, 'Displayed output', 'LGP Classification');
}

function calculateAreaStatistics() {
  chartPanel.clear();

  if (!diagnosticsCheckbox.getValue() || !appState.result) {
    chartPanel.add(infoBox('Area statistics are off.', COLORS.muted, COLORS.gray));
    return;
  }

  var grouped = ee.Image.pixelArea()
    .divide(1e6)
    .rename('area_km2')
    .addBands(appState.result.classes)
    .reduceRegion({
      reducer: ee.Reducer.sum().group({
        groupField: 1,
        groupName: 'class'
      }),
      geometry: libya.geometry(),
      scale: effectiveScale(appState.rainfallSource, appState.etSource, appState.temperatureSource),
      maxPixels: 1e13,
      tileScale: 8
    });

  var groups = ee.List(ee.Dictionary(grouped).get('groups', ee.List([])));

  var table = ee.FeatureCollection(groups.map(function(item) {
    item = ee.Dictionary(item);
    var classNumber = ee.Number(item.get('class')).toInt();
    return ee.Feature(null, {
      class_name: ee.List(classNames).get(classNumber.subtract(1)),
      area_km2: item.get('sum')
    });
  }));

  chartPanel.add(
    ui.Chart.feature.byFeature(table, 'class_name', ['area_km2'])
      .setChartType('ColumnChart')
      .setOptions({
        title: 'Area by LGP class',
        hAxis: {
          title: 'LGP class',
          slantedText: true,
          slantedTextAngle: 30
        },
        vAxis: {title: 'Area (km2)'},
        legend: {position: 'none'},
        colors: [COLORS.blue]
      })
  );
}

// ============================================================================
// 15. RUN, EXPORT AND RESET
// ============================================================================
function runAnalysis() {
  try {
    var startYear = Number(startYearBox.getValue());
    var endYear = Number(endYearBox.getValue());
    var rainfall = rainfallSelect.getValue();
    var et = etSelect.getValue();
    var temperature = temperatureSelect.getValue();
    var method = methodSelect.getValue();
    var storage = storageSelect.getValue();
    var referenceStorageMm = Number(referenceStorageBox.getValue());

    validate(startYear, endYear, rainfall, et, temperature, method, storage, referenceStorageMm);
    statusLabel.setValue('Calculating LGP Classification...');

    appState.startYear = startYear;
    appState.endYear = endYear;
    appState.rainfallSource = rainfall;
    appState.etSource = et;
    appState.temperatureSource = temperature;
    appState.method = method;
    appState.storageSource = storage;
    appState.referenceStorageMm = referenceStorageMm;
    appState.result = buildResult(startYear, endYear, rainfall, et, temperature, method, storage, referenceStorageMm);

    displayResult();
    updateResultPanel();
    calculateAreaStatistics();
    exportPanel.style().set('shown', true);
    renderGuide();
    statusLabel.setValue('LGP Classification generated successfully.');
  } catch (error) {
    statusLabel.setValue('Error: ' + error.message);
    print('LGP application error:', error);
  }
}

runButton.onClick(runAnalysis);

var exportButton = ui.Button({
  label: 'Export LGP Classification',
  style: {stretch: 'horizontal'},
  onClick: function() {
    if (!appState.result) {
      return;
    }

    Export.image.toDrive({
      image: appState.result.classes,
      description: 'Libya_LGP_Classification_' + appState.startYear + '_' + appState.endYear,
      folder: 'GEE_Exports',
      fileNamePrefix: 'Libya_LGP_Classification_' + appState.startYear + '_' + appState.endYear,
      region: libya.geometry(),
      scale: effectiveScale(appState.rainfallSource, appState.etSource, appState.temperatureSource),
      crs: 'EPSG:4326',
      maxPixels: 1e13
    });

    statusLabel.setValue('Export task created. Complete it in the Tasks tab.');
  }
});

exportPanel.add(heading('7. Export'));
exportPanel.add(exportButton);
exportPanel.add(infoBox(
  'Only LGP Classification is exported. The export scale follows the coarsest selected climate input.',
  COLORS.muted,
  COLORS.gray
));

function resetApp() {
  appState.result = null;
  appState.startYear = DEFAULT_START_YEAR;
  appState.endYear = DEFAULT_END_YEAR;
  appState.rainfallSource = 'CHIRPS v2 Daily';
  appState.etSource = 'TerraClimate PET';
  appState.temperatureSource = 'TerraClimate temperature';
  appState.method = 'Gintzburger and Saidi method';
  appState.storageSource = 'SoilGrids spatial WR 0-60 cm';
  appState.referenceStorageMm = DEFAULT_REFERENCE_WR_MM;

  periodSelect.setValue('2020-2024 | Most recent TerraClimate five-year period');
  startYearBox.setValue('2020');
  endYearBox.setValue('2024');
  rainfallSelect.setValue(appState.rainfallSource);
  etSelect.setValue(appState.etSource);
  temperatureSelect.setValue(appState.temperatureSource);
  methodSelect.setValue(appState.method);
  storageSelect.setValue(appState.storageSource);
  referenceStorageBox.setValue(String(DEFAULT_REFERENCE_WR_MM));
  updateReferenceStorageVisibility(appState.storageSource);
  rainfallInfo.setValue(RAINFALL_INFO[appState.rainfallSource]);
  etInfo.setValue(ET_INFO[appState.etSource]);
  temperatureInfo.setValue(TEMPERATURE_INFO[appState.temperatureSource]);
  methodInfo.setValue(METHOD_INFO[appState.method]);
  storageInfo.setValue(STORAGE_INFO[appState.storageSource]);
  updateAdvice();

  diagnosticsCheckbox.setValue(false);
  exportPanel.style().set('shown', false);
  appMap.layers().reset();
  addBoundary();
  drawLegend();
  appMap.centerObject(libya, 6);
  updateResultPanel();
  chartPanel.clear();
  chartPanel.add(infoBox('Area statistics are off.', COLORS.muted, COLORS.gray));
  renderGuide();
  statusLabel.setValue('Ready.');
}

resetButton.onClick(resetApp);

// ============================================================================
// 16. BUILD CONTROL PANEL
// ============================================================================
controlPanel.add(ui.Label('Libya Length of Growing Period (LGP) Zone Mapping Tool', {
  fontSize: '19px',
  fontWeight: 'bold',
  color: COLORS.navy,
  margin: '0 0 2px 0'
}));

controlPanel.add(ui.Label('By: Hamed Sabzchi Dehkharghani', {
  fontSize: '11px',
  color: COLORS.muted,
  margin: '0 0 6px 0'
}));

controlPanel.add(infoBox(
  'Date limits are scenario-specific. Any selection using TerraClimate precipitation, PET or temperature is limited to growing year 2024. Growing year 2025 is enabled only when rainfall is CHIRPS or ERA5-Land, ET is ERA5-Land potential evaporation, temperature is ERA5-Land 2-m temperature, and Gintzburger and Saidi method is used. Growing year 2026 is not complete because its November 2025 through October 2026 cycle is unfinished during the tool developing stage.',
  COLORS.dark,
  COLORS.orange
));

controlPanel.add(infoBox(
  'The deprecated Global ET0 v3.0 is not involved based on the provoiders recomendation. The toll will wait for v3.1 availability in GEE',
  COLORS.green,
  COLORS.lightGreen
));

controlPanel.add(heading('1. Time period'));
controlPanel.add(periodSelect);
controlPanel.add(yearPanel);
controlPanel.add(heading('2. Rainfall source'));
controlPanel.add(rainfallSelect);
controlPanel.add(rainfallInfo);
controlPanel.add(heading('3. Evaporation / ET source'));
controlPanel.add(etSelect);
controlPanel.add(etInfo);
controlPanel.add(heading('4. Temperature source'));
controlPanel.add(temperatureSelect);
controlPanel.add(temperatureInfo);
controlPanel.add(heading('5. LGP method'));
controlPanel.add(methodSelect);
controlPanel.add(methodInfo);
controlPanel.add(heading('6. Soil-water storage'));
controlPanel.add(storageSelect);
controlPanel.add(referenceStoragePanel);
controlPanel.add(referenceStorageHelp);
controlPanel.add(storageInfo);
controlPanel.add(heading('7. Selected combination recommendation'));
controlPanel.add(adviceInfo);
controlPanel.add(diagnosticsCheckbox);
controlPanel.add(heading('Generate'));
controlPanel.add(runButton);
controlPanel.add(resetButton);
controlPanel.add(statusLabel);
controlPanel.add(exportPanel);

// ============================================================================
// 17. BUILD GUIDE PANEL
// ============================================================================
guidePanel.add(ui.Label('Notes', {
  fontSize: '18px',
  fontWeight: 'bold',
  color: COLORS.blue,
  margin: '0 0 3px 0'
}));

var guideTabs = ui.Panel({
  widgets: [
    ui.Button({label: 'Guide', style: {stretch: 'horizontal'}, onClick: renderGuide}),
    ui.Button({label: 'Method', style: {stretch: 'horizontal'}, onClick: renderMethods}),
    ui.Button({label: 'Use', style: {stretch: 'horizontal'}, onClick: renderInterpretation}),
    ui.Button({label: 'Refs', style: {stretch: 'horizontal'}, onClick: renderReferences})
  ],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {
    stretch: 'horizontal',
    margin: '0 0 7px 0'
  }
});

guidePanel.add(guideTabs);
guidePanel.add(guideContent);

// ============================================================================
// 18. INITIALIZE APPLICATION
// ============================================================================
ui.root.clear();

var splitPanel = ui.SplitPanel({
  firstPanel: controlPanel,
  secondPanel: appMap,
  orientation: 'horizontal',
  wipe: false,
  style: {stretch: 'both'}
});

ui.root.widgets().reset([splitPanel]);
appMap.add(guidePanel);
appMap.add(legendPanel);
appMap.style().set('cursor', 'crosshair');
appMap.style().set('stretch', 'both');

addBoundary();
drawLegend();
updateResultPanel();
chartPanel.add(infoBox('Area statistics are off.', COLORS.muted, COLORS.gray));
renderGuide();

print('FINAL CORRECTED LIBYA LGP APPLICATION');
print('Global ET0 v3.0 removed from all operational code.');
print('No unverified Global ET0 v3.1 Earth Engine asset is used.');
print('Scenario-specific latest complete year: 2024 for any TerraClimate input; 2025 for fully CHIRPS/ERA5-Land-supported Gintzburger and Saidi method combinations.');
print('Default period: 2020-2024, the latest complete five-year period shared by all active input datasets.');
print('Default rainfall: CHIRPS v2 Daily.');
print('Default ET: TerraClimate PET.');
print('Default method: Gintzburger and Saidi method.');
print('Default storage: SoilGrids spatial WR 0-60 cm.');
print('Default temperature: TerraClimate temperature.');








function addDynamicMapSymbols(mapWidget) {
  if (!mapWidget) {
    throw new Error('A valid ui.Map must be supplied.');
  }

  // Hide default controls, including "Zoom 10 | 20 km".
  mapWidget.setControlVisibility({
    all: false
  });

  var TARGET_BAR_PIXELS = 180;
  var MIN_BAR_PIXELS = 100;
  var MAX_BAR_PIXELS = 240;
  var SEGMENT_COUNT = 4;

  var mainPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('vertical'),
    style: {
      position: 'bottom-right',
      margin: '10px',
      padding: '8px 10px',
      backgroundColor: '#ffffff',
      border: '1px solid #777777'
    }
  });

  var northArrow = ui.Label({
    value: '▲\nN',
    style: {
      width: '30px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#111111',
      textAlign: 'center',
      whiteSpace: 'pre',
      margin: '0 10px 0 0',
      padding: '0'
    }
  });

  var barPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {
      margin: '0',
      padding: '0',
      height: '12px'
    }
  });

  var labelPanel = ui.Panel({
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {
      margin: '1px 0 0 0',
      padding: '0'
    }
  });

  var scalePanel = ui.Panel({
    widgets: [
      barPanel,
      labelPanel
    ],
    layout: ui.Panel.Layout.flow('vertical'),
    style: {
      margin: '0',
      padding: '0'
    }
  });

  var symbolRow = ui.Panel({
    widgets: [
      northArrow,
      scalePanel
    ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {
      margin: '0',
      padding: '0'
    }
  });

  mainPanel.add(symbolRow);
  mapWidget.add(mainPanel);

  function chooseNiceDistance(rawMetres) {
    if (!isFinite(rawMetres) || rawMetres <= 0) {
      return 1000;
    }

    var power = Math.pow(
      10,
      Math.floor(Math.log(rawMetres) / Math.LN10)
    );

    var normalized = rawMetres / power;
    var multiplier;

    if (normalized <= 1) {
      multiplier = 1;
    } else if (normalized <= 2) {
      multiplier = 2;
    } else if (normalized <= 5) {
      multiplier = 5;
    } else {
      multiplier = 10;
    }

    return multiplier * power;
  }

  function formatDistance(metres) {
    if (metres >= 1000) {
      var kilometres = metres / 1000;

      var roundedKilometres = kilometres >= 10
        ? Math.round(kilometres)
        : Math.round(kilometres * 10) / 10;

      return roundedKilometres + ' km';
    }

    if (metres >= 10) {
      return Math.round(metres) + ' m';
    }

    return (Math.round(metres * 10) / 10) + ' m';
  }

  function makeSegment(widthPixels, dark) {
    return ui.Label({
      value: '',
      style: {
        width: widthPixels + 'px',
        height: '10px',
        margin: '0',
        padding: '0',
        backgroundColor: dark ? '#111111' : '#ffffff',
        border: '1px solid #111111'
      }
    });
  }

  function makeLabel(text, widthPixels, alignment) {
    return ui.Label({
      value: text,
      style: {
        width: widthPixels + 'px',
        fontSize: '9px',
        color: '#111111',
        textAlign: alignment,
        whiteSpace: 'nowrap',
        margin: '0',
        padding: '0'
      }
    });
  }

  function updateScaleBar() {
    var metresPerPixel = Number(mapWidget.getScale());

    if (!isFinite(metresPerPixel) || metresPerPixel <= 0) {
      return;
    }

    var desiredMetres =
      metresPerPixel * TARGET_BAR_PIXELS;

    var niceMetres =
      chooseNiceDistance(desiredMetres);

    var totalPixels =
      Math.round(niceMetres / metresPerPixel);

    if (totalPixels < MIN_BAR_PIXELS) {
      niceMetres = chooseNiceDistance(
        metresPerPixel * TARGET_BAR_PIXELS * 1.5
      );

      totalPixels =
        Math.round(niceMetres / metresPerPixel);
    }

    if (totalPixels > MAX_BAR_PIXELS) {
      niceMetres = chooseNiceDistance(
        metresPerPixel * TARGET_BAR_PIXELS * 0.6
      );

      totalPixels =
        Math.round(niceMetres / metresPerPixel);
    }

    totalPixels = Math.max(
      MIN_BAR_PIXELS,
      Math.min(MAX_BAR_PIXELS, totalPixels)
    );

    var segmentPixels = Math.max(
      1,
      Math.floor(totalPixels / SEGMENT_COUNT)
    );

    var correctedTotalPixels =
      segmentPixels * SEGMENT_COUNT;

    var metresPerSegment =
      niceMetres / SEGMENT_COUNT;

    barPanel.clear();
    labelPanel.clear();

    for (var i = 0; i < SEGMENT_COUNT; i++) {
      barPanel.add(
        makeSegment(
          segmentPixels,
          i % 2 === 0
        )
      );
    }

    for (var j = 0; j <= SEGMENT_COUNT; j++) {
      var labelWidth =
        (j === 0 || j === SEGMENT_COUNT)
          ? Math.floor(segmentPixels / 2)
          : segmentPixels;

      var alignment = 'center';

      if (j === 0) {
        alignment = 'left';
      } else if (j === SEGMENT_COUNT) {
        alignment = 'right';
      }

      labelPanel.add(
        makeLabel(
          formatDistance(metresPerSegment * j),
          labelWidth,
          alignment
        )
      );
    }

    barPanel.style().set(
      'width',
      correctedTotalPixels + 'px'
    );

    labelPanel.style().set(
      'width',
      correctedTotalPixels + 'px'
    );
  }

  var boundsListenerId =
    mapWidget.onChangeBounds(function() {
      updateScaleBar();
    });

  updateScaleBar();

  return {
    panel: mainPanel,

    update: function() {
      updateScaleBar();
    },

    remove: function() {
      mapWidget.unlisten(boundsListenerId);
      mapWidget.remove(mainPanel);
    }
  };
}

// The visible custom application map is appMap.
var dynamicMapSymbols =
  addDynamicMapSymbols(appMap);
