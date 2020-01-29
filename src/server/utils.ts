import { CosmosClient } from '@azure/cosmos';
import md5 from 'blueimp-md5';
import { exec } from 'child_process';
import csv from 'csv-parser';
import * as fs from 'fs';
import * as http from 'http';
import path from 'path';

import { absoluteLeagueDatFilePath, datFolderPath, datHashFilePath, datUrl, tempDatFilePath, uploadedCSVFilePath } from './consts';
import { config } from './db_config';

/**
 * A method which checks if the MD5 of a DAT file is unique
 * If hash is unique, the hash is then added to the hashes JSON file
 * @param datHash The MD5 Hash of the DAT file being checked
 */
export const isDatUnique = (datHash: string) => {
    let isUnique: boolean = false;
    const hashFile: { hashes: string[] } = JSON.parse(fs.readFileSync(datHashFilePath, 'utf8'));
    
    if (hashFile.hashes.includes(datHash)) {
        console.log('A duplicate DAT file was found!');
    } else {
        hashFile.hashes.push(datHash);
        console.log('A unique has was found');
        isUnique = true;
    }

    fs.writeFileSync(datHashFilePath, JSON.stringify(hashFile), 'utf8');
    return isUnique;
}

/**
 * Parses CSV files containing player ratings and uploading the resulting JSON data to Cosmos
 * @param shouldUploadData Flag indicating whether or not to upload JSON data to cosmos
 */
export const parseCSVToJSON = async (shouldUploadData = true) => {
    const uploadedFileData: { uploadedFiles: string[] } = JSON.parse(fs.readFileSync(uploadedCSVFilePath, 'utf8'));
    const promises: Promise<unknown>[] = [];
    
    fs.readdir(path.join(__dirname, '../../', '/data'), async (err, files) => {
        if (err) {
            console.log('Error reading CSV Data directory');
            console.log(err);
            return;
        }

        for (const fileName of files) {
            if (fileName.endsWith('.csv') && !uploadedFileData.uploadedFiles.includes(fileName)) {
                console.log(`Found new CSV File: ${fileName}. Parsing now...`);
            
                const date = fileName.split('_')[0];
                console.log(`The Date: ${date}`);


                await new Promise((resolve, reject) => {
                    let parsedFileJSON = [];
                    let idList = [];
                    fs.createReadStream(path.join(__dirname, '../../', '/data', fileName))
                    .pipe(csv())
                    .on('data', (data) => { 
                        if(data.FName && data.LName && data.Ht) {
                            data.id = `${date}-${data.FName}-${data.LName}-${data.Ht}`;
                            data.FName = normalizeString(data.FName);
                            data.LName = normalizeString(data.LName);
                            data.Team = normalizeString(data.Team);
                            data.date = date;
                            Object.keys(data).forEach(key => {
                                data[key] = data[key].trim();
                            })
                            if (!idList.includes(data.id)) {
                                idList.push(data.id);
                                parsedFileJSON.push(data); 
                            } else {
                                console.log(`Found a dupe for ID: ${data.id}`);
                            }
                        }
                    })
                    .on('end', () => {
                        const ratingData = parsedFileJSON.filter((rating) => {
                            return rating.FName && rating.LName;
                        });

                        if(shouldUploadData) {
                            console.log(`Found ${ratingData.length} Ratings, uploading now...`);
                            uploadRatingsToCosmos(ratingData, date).then(() => {

                                uploadedFileData.uploadedFiles.push(fileName);
                                console.log('Updating uploaded file list');
                                fs.writeFileSync(uploadedCSVFilePath, JSON.stringify(uploadedFileData), 'utf8');

                                setTimeout(() => {
                                    uploadRatingsToCosmos(ratingData.reverse(), date).then(() => {
                                        console.log('finished the secordary upload!');
                                        resolve();
                                    });
                                }, 5000);

                            }).catch((error) => {
                                console.log(`Failed to upload ratings for ${fileName} to Cosmos...`);
                                console.log(error);
                                reject();
                            }).finally(() => {
                                parsedFileJSON = [];                                
                            });
                        } else {
                            console.log('shouldUploadData was false, not uploading data to Cosmos');
                        }
                    });
                })

            }
        }

        return 'done';
    });
}

/**
 * Uploads an array of player ratings to Cosmos DB
 * Each rating is uplodaded as an individual document
 * @param ratings An array of player ratings
 */
export const uploadRatingsToCosmos = (ratings: any[], date: string): Promise<any> => {
    if (!ratings || !ratings.length) {
        console.log('No ratings found to upload to Cosmos');
        return Promise.resolve();
    }

    // Connect to cosmos
    const client = new CosmosClient({ endpoint: config.host, key: config.authKey });

    // Run Cosmos stored procedure to bulk insert records
    return client.database('Ratings').container('ratings').scripts.storedProcedure('bulk-create').execute(date, [{ ratings: ratings }]);
}

/**
 * A method which downloads the DAT file, checks for uniqueness,
 * And triggers Python CSV generation script
 */
export const downloadDatFile = () => {
    console.log('Checking for a new DAT file');
    const file = fs.createWriteStream(tempDatFilePath);

    const downloadPromise = new Promise((resolve, reject) => {
        http.get(datUrl, function (response) {
            response.pipe(file);
            file.on('finish', function () {
                console.log('Successfully downloaded the DAT file!');
                file.close();  // close() is async, call cb after close completes.
                resolve();
            });
        }).on('error', function (err) { // Handle errors
            console.log('There was an error downloading the DAT file!');
            console.log(err);
            fs.unlink(tempDatFilePath, () => { 
                reject();
            }); // Delete the file async. (But we don't check the result)
        });
    })

    downloadPromise.then(() => {
        const fileString = fs.readFileSync(tempDatFilePath);
        if(isDatUnique(md5(fileString))) {
            // Trigger Python CSV generation script
            copyDatToLeagueFolder().then(() => {
                convertDATtoCSV();
            }).catch((error) => {
                console.log('Not copying DAT file because error was found')
                console.log(error);
            });
        }
        console.log('DAT Update Check complete');
    }).catch((error) => {
        console.log('Error downloading DAT file, not attempting DAT Parse');
    });
}

/**
 * Method which checks /dats for new dats and begins python processing on them
 * @param forceRun Flag indicating whether or not to ignore duplicate DAT checking
 */
export const processAllLocalDatFiles = (forceRun: boolean = false) => {
    return new Promise((resolve) => {
        fs.readdir(datFolderPath, async (err, items) => {
            for (const fileName of items) {
                if(fileName.endsWith('.dat')) {
                    const datFilePath = path.join(datFolderPath, fileName);
                    const fileString = fs.readFileSync(datFilePath);
                    if(isDatUnique(md5(fileString)) || forceRun) {
                        console.log(`About to process ${fileName}`);
    
                        // Trigger Python CSV generation script
                        await copyDatToLeagueFolder(datFilePath).then(async () => {
                            await convertDATtoCSV();
                        }).catch((error) => {
                            console.log('Not copying DAT file because error was found')
                            console.log(error);
                        });
                    }
                }
            }
            resolve();
        });
    })
};

/**
 * Promise which copies the DAT file tp the FBPB3 folder
 */
export const copyDatToLeagueFolder = (datFilePath?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.copyFile(datFilePath || tempDatFilePath, absoluteLeagueDatFilePath, (err) => {
            if (err) {
                reject(err);
            }
            console.log('DAT file copied to FBPB3 Folder');
            resolve();
        });
    }) 
}

/**
 * Invokes a child process which uses a python script
 * to convert DAT file into a corresponding player rating CSV
 */
export const convertDATtoCSV = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const pythonScript = exec('python main.py', { cwd: path.join(__dirname, '../../python')});
        pythonScript.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });              
    
        pythonScript.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });

        pythonScript.on('exit', (code) => {
            console.log(`Python conversion script exited with code ${code}`);
            resolve();
        });
    });
}

/**
 * Transforms a friendly string into a normalized string
 * @param friendlyString The friendly string
 */
export const normalizeString = (friendlyString: string): string => {
    return friendlyString.replace(' ', '_').toLowerCase();
}

/**
 * Takes a normalized string and makes it friendly
 * @param normalizedString The normalized string
 */
export const friendifyString = (normalizedString: string): string => {
    const nameBreakChars = [' ', `'`];

    let friendlyName = normalizedString.replace('_', ' ');

    nameBreakChars.forEach((char) => {
        friendlyName = friendlyName.split(char).map((nameSegment) => {
            nameSegment[0].toUpperCase();
            return nameSegment;
        }).join(char);
    })

    return friendlyName;
}