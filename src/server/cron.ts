import { CronJob } from 'cron';

import { downloadDatFile } from './utils';

// Create Test CronJob
const job = new CronJob('0 */15 * * * *', () => {
    console.log('Chron Job being invoked');
    // downloadDatFile();
});

// Start Job
job.start();