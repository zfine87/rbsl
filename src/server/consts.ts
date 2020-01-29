import * as path from 'path';

export const sourceDir = 'dist';
export const dataDir = 'data';
export const datUrl = 'http://therbsl.com/downloads/league.dat';
export const datFolderPath = path.join(sourceDir, '/public/dats/');
export const tempDatFilePath = path.join(sourceDir, '/public/dats/temp-dat.dat');

// File path to the DAT Hash JSON file
export const datHashFilePath = path.join(sourceDir, '/public/dats/hashes.json');

// File path to the CSV Upload tracking JSON file
export const uploadedCSVFilePath = path.join(dataDir, '/ratings.json'); 

// File path to the directory FBPB3 will use to load DAT
export const absoluteLeagueDatFilePath = 'C:\\Users\\Public\\Documents\\GDS\\Fast Break Pro Basketball 3\\leaguedata\\swag\\league.dat';