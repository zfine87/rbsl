import { CosmosClient } from '@azure/cosmos';
import express from 'express';
import * as util from 'util';

import { sourceDir } from './consts';
import { config } from './db_config';
import { convertDATtoCSV, downloadDatFile, parseCSVToJSON, processAllLocalDatFiles } from './utils';

// Import CronJobs
import './cron';

// Start Server
const app = express();
const portNumber = 3000;

// Add static assets path
app.use(express.static(sourceDir));

// Home Page Route
app.get('/', (req, res) => {
    res.send('Hello World!')
});

// Run data parse/upload pipeline in prod mode
app.get('/upload', (req, res) => {
    processAllLocalDatFiles().then(() => {
        parseCSVToJSON();
    });
});

// Run data parse/upload pipeline in test mode
app.get('/test', (req, res) => {
    processAllLocalDatFiles(true).then(() => {
        parseCSVToJSON(false);
    });
});

app.get('/runpyscript', async (req, res) => {
    await convertDATtoCSV();
    res.send('Python script complete');
})

// Route for on-demand running of DAT download/parsing
app.get('/fetch', (req, res) => {
    downloadDatFile();
    res.send('its done');
})

app.listen(portNumber, () => {
    console.log(`Express web server started: http://localhost:${portNumber}`);
    console.log(`Serving content from /${sourceDir}/`);
    console.log(`Active DIR: ${__dirname}`);
});

