#!/usr/bin/env node
/*
Node helper: create-gcs-bucket.js
Usage:
  # Install dependency first:
  npm install @google-cloud/storage

  # Create bucket using Application Default Credentials or service account key
  node scripts/create-gcs-bucket.js --bucket my-bucket-name --project my-gcp-project --location US --createIfMissing --key ./sa-key.json

Notes:
- If you provide --key, the script will set GOOGLE_APPLICATION_CREDENTIALS for the run.
- This script must be run locally where you have access to GCP credentials.
*/

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

const argv = require('yargs')
  .option('bucket', { type: 'string', demandOption: true, describe: 'Bucket name (without gs://)' })
  .option('project', { type: 'string', describe: 'GCP project id' })
  .option('location', { type: 'string', default: 'US', describe: 'Bucket location' })
  .option('key', { type: 'string', describe: 'Path to service account JSON key file' })
  .option('createIfMissing', { type: 'boolean', default: false, describe: 'Create bucket if missing' })
  .help()
  .argv;

async function main() {
  const bucketName = argv.bucket;
  if (argv.key) {
    if (!fs.existsSync(argv.key)) {
      console.error('Service account key not found at', argv.key);
      process.exit(2);
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = argv.key;
  }

  const storage = new Storage({ projectId: argv.project });
  const bucket = storage.bucket(bucketName);

  try {
    const [exists] = await bucket.exists();
    if (exists) {
      console.log(`Bucket exists: gs://${bucketName}`);
      process.exit(0);
    }

    console.log(`Bucket gs://${bucketName} does not exist.`);
    if (!argv.createIfMissing) {
      console.error('Run again with --createIfMissing to create it.');
      process.exit(3);
    }

    console.log(`Creating bucket gs://${bucketName} in location ${argv.location}...`);
    await storage.createBucket(bucketName, {
      location: argv.location,
      uniformBucketLevelAccess: true,
    });
    console.log('Bucket created successfully. Verifying...');
    const [nowExists] = await bucket.exists();
    if (nowExists) {
      console.log(`Verified: gs://${bucketName}`);
      process.exit(0);
    } else {
      console.error('Creation reported success but verification failed.');
      process.exit(4);
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
