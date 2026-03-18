#!/usr/bin/env node
/**
 * Cleanup script for orphaned resume files
 *
 * This script finds files in the uploads/resumes directory that don't have
 * a corresponding database record and deletes them.
 *
 * Usage: node scripts/cleanupOrphanedResumes.js [--dry-run]
 */

const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import Resume model
const Resume = require('../src/models/Resume');

async function cleanupOrphanedResumes(dryRun = false) {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get all resume file paths from database
    const resumes = await Resume.find().select('filePath');
    const dbFilePaths = new Set(resumes.map(r => path.resolve(r.filePath)));
    console.log(`Found ${dbFilePaths.size} resume records in database`);

    // Get all files from uploads/resumes directory
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'resumes');

    let files = [];
    try {
      files = await fs.readdir(uploadsDir);
    } catch (err) {
      console.error(`Error reading uploads directory: ${err.message}`);
      return;
    }

    console.log(`Found ${files.length} files in uploads/resumes directory\n`);

    // Find orphaned files
    const orphanedFiles = [];
    for (const file of files) {
      const fullPath = path.resolve(path.join(uploadsDir, file));
      if (!dbFilePaths.has(fullPath)) {
        orphanedFiles.push({ name: file, path: fullPath });
      }
    }

    if (orphanedFiles.length === 0) {
      console.log('✓ No orphaned files found. All files have database records.');
      return;
    }

    console.log(`Found ${orphanedFiles.length} orphaned file(s):\n`);

    // Display and optionally delete orphaned files
    let totalSize = 0;
    for (const file of orphanedFiles) {
      try {
        const stats = await fs.stat(file.path);
        const sizeKB = (stats.size / 1024).toFixed(2);
        totalSize += stats.size;

        console.log(`  - ${file.name} (${sizeKB} KB)`);

        if (!dryRun) {
          await fs.unlink(file.path);
          console.log(`    ✓ Deleted`);
        }
      } catch (err) {
        console.log(`    ✗ Error: ${err.message}`);
      }
    }

    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`\nTotal size: ${totalSizeMB} MB`);

    if (dryRun) {
      console.log('\n⚠ DRY RUN - No files were deleted. Run without --dry-run to delete orphaned files.');
    } else {
      console.log(`\n✓ Cleanup complete. Deleted ${orphanedFiles.length} orphaned file(s).`);
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Parse command line arguments
const dryRun = process.argv.includes('--dry-run');

if (dryRun) {
  console.log('Running in DRY RUN mode...\n');
}

cleanupOrphanedResumes(dryRun).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
