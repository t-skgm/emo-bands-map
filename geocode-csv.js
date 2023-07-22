import { parse, stringify } from "csv/sync";
import { readFileSync, writeFileSync } from "node:fs";

const INPUT_FILE = "emo_bands_all.csv";
const OUTPUT_FILE = "emo_bands_all_geo.csv";

const GEOAPIFY_API_ROOT = "https://api.geoapify.com/v1";

const API_KEY = "db9d2fcde87449a9bc7eab587d8572dc";

/**
 * @typedef {object} Row
 * @property {string} Artist
 * @property {string} Country
 * @property {string} `State/Region/Province` state
 * @property {string} City
 * @property {string} `Related Labels`
 * @property {string} `Related Bands`
 * @property {string} `Released split with`
 * @property {string} `Year (of the first release)`
 * @property {string} Website
 * @property {string} `Streaming Site`
 * @property {string} Discogs
 * @property {string} `Rate Your Music`
 * @property {string} Style
 * @property {string} Melodiousness
 * @property {string} `My rating`
 * @property {string} Tags
 * @property {string} `Added at` Added at
 * @property {string} `Page ID`
 */

/**
 * @type {(string) => Promise<import('geojson').FeatureCollection>}
 */
const fetchGeocodedByAddress = async (address) => {
  const params = new URLSearchParams({
    apiKey: API_KEY,
    text: address,
  });
  const result = await fetch(
    `${GEOAPIFY_API_ROOT}/geocode/search?${params.toString()}`,
    { method: "GET" }
  ).then((response) => response.json());
  return result;
};

/**
 * @type {(props: any) => Promise<import('geojson').FeatureCollection>}
 */
const fetchGeocodedByProps = async (searchProps) => {
  const params = new URLSearchParams({
    apiKey: API_KEY,
    ...searchProps,
  });
  const url = `${GEOAPIFY_API_ROOT}/geocode/search?${params.toString()}`;
  console.log("fetch...", url);
  const result = await fetch(url, { method: "GET" }).then((r) => r.json());
  return result;
};

const readCSV = (filepatH) => {
  const csvFile = readFileSync(filepatH, { encoding: "utf-8" });
  return parse(csvFile, {
    columns: true,
    bom: true,
  });
};

const Columns = {
  country: "Country",
  state: `State/Region/Province`,
  city: "City",
};

const main = async () => {
  /** @type {Row[]} */
  const rows = readCSV(INPUT_FILE);

  const geoRows = [];

  for (const row of rows) {
    if (!row[Columns.country] || !row[Columns.state]) continue;

    const props = { country: row[Columns.country], state: row[Columns.state] };
    if (!!row[Columns.city]) props.city = row[Columns.city];

    const result = await fetchGeocodedByProps(props);
    const mostRelated = result.features[0];
    const { lat, lon } = mostRelated.properties;

    geoRows.push({ ...row, lat, lon });
  }

  const csvString = stringify(geoRows, { header: true, bom: true });

  writeFileSync(OUTPUT_FILE, csvString, { encoding: "utf-8" });
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/*

{
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        datasource: {
          sourcename: 'openstreetmap',
          attribution: '© OpenStreetMap contributors',
          license: 'Open Database License',
          url: 'https://www.openstreetmap.org/copyright'
        },
        country: 'United Kingdom',
        country_code: 'gb',
        state: 'England',
        state_district: 'Cambridgeshire and Peterborough',
        county: 'Cambridgeshire',
        city: 'Cambridge',
        lon: 0.1186637,
        lat: 52.2055314,
        state_code: 'ENG',
        formatted: 'Cambridge, Cambridgeshire, ENG, United Kingdom',
        address_line1: 'Cambridge',
        address_line2: 'Cambridgeshire, ENG, United Kingdom',
        county_code: 'CAM',
        category: 'administrative',
        timezone: {
          name: 'Europe/London',
          offset_STD: '+00:00',
          offset_STD_seconds: 0,
          offset_DST: '+01:00',
          offset_DST_seconds: 3600,
          abbreviation_STD: 'GMT',
          abbreviation_DST: 'BST'
        },
        plus_code: '9F426449+6F',
        plus_code_short: '49+6F Cambridge, Cambridgeshire, United Kingdom',
        result_type: 'city',
        rank: {
          importance: 0.7427670135653464,
          popularity: 8.995467104553104,
          confidence: 1,
          confidence_city_level: 1,
          match_type: 'full_match'
        },
        place_id: '5145ecb886be60be3f598aa658da4e1a4a40f00101f901bb81040000000000c00208'
      },
      geometry: { type: 'Point', coordinates: [ 0.1186637, 52.2055314 ] },
      bbox: [ 0.0686389, 52.1579417, 0.184552, 52.2372296 ]
    },
    ...
  ],
  query: { text: 'Cambridge, Cambridgeshire, UK/England' }
}
*/
