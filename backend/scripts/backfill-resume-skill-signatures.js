#!/usr/bin/env node
/**
 * Backfill normalized resume skills, skill signatures, and candidate levels.
 *
 * Usage:
 *   node scripts/backfill-resume-skill-signatures.js --dry-run
 *   node scripts/backfill-resume-skill-signatures.js
 *   node scripts/backfill-resume-skill-signatures.js --force
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Resume = require('../src/models/Resume');
const { buildResumeDerivedFields } = require('../src/utils/resumeDerivedFields');

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const batchSize = 250;

function shouldBackfill(resume) {
  if (force) return true;

  return (
    !Array.isArray(resume.normalizedSkills) ||
    typeof resume.skillsSignature !== 'string' ||
    resume.skillsSignature.length === 0 ||
    !resume.candidateLevel ||
    !resume.candidateLevelSource
  );
}

async function flushBatch(batch) {
  if (batch.length === 0) return 0;
  if (dryRun) return batch.length;

  await Resume.bulkWrite(batch, { ordered: false });
  return batch.length;
}

async function run() {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://localhost:27017/career-intelligence';

  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const cursor = Resume.find()
    .select('extractedSkills extractedText normalizedSkills skillsSignature candidateLevel candidateLevelSource')
    .cursor();

  let scanned = 0;
  let matched = 0;
  let updated = 0;
  let batch = [];

  for await (const resume of cursor) {
    scanned += 1;
    if (!shouldBackfill(resume)) continue;

    matched += 1;
    const derivedFields = buildResumeDerivedFields(
      resume.extractedSkills || [],
      resume.extractedText || ''
    );

    batch.push({
      updateOne: {
        filter: { _id: resume._id },
        update: { $set: derivedFields },
      },
    });

    if (batch.length >= batchSize) {
      updated += await flushBatch(batch);
      batch = [];
      console.log(`${dryRun ? 'Would update' : 'Updated'} ${updated} resume(s)...`);
    }
  }

  updated += await flushBatch(batch);

  console.log('\nBackfill complete');
  console.log(`Scanned: ${scanned}`);
  console.log(`Matched: ${matched}`);
  console.log(`${dryRun ? 'Would update' : 'Updated'}: ${updated}`);

  if (dryRun) {
    console.log('\nDry run only. Re-run without --dry-run to write changes.');
  }
}

run()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  });
