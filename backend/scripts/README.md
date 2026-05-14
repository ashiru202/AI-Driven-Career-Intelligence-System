# Cleanup Scripts

## Resume Cleanup Script

This script helps clean up orphaned resume files - files that exist in the `uploads/resumes` directory but don't have a corresponding database record.

### Why does this happen?

Orphaned files can occur when:
- A resume upload fails partway through (file saved but DB insert fails)
- Manual file operations in the uploads directory
- Database records deleted without proper file cleanup

### Usage

**Dry run (preview only, doesn't delete anything):**
```bash
cd backend
npm run cleanup:resumes:dry-run
```

This will show you:
- How many files are in the database
- How many files are in the uploads folder
- Which files are orphaned (no DB record)
- Total size of orphaned files

**Actual cleanup (deletes orphaned files):**
```bash
cd backend
npm run cleanup:resumes
```

### Example Output

```
Running in DRY RUN mode...

Connecting to MongoDB...
Connected to MongoDB

Found 5 resume records in database
Found 8 files in uploads/resumes directory

Found 3 orphaned file(s):

  - resume-1234567890123-old.pdf (245.67 KB)
  - resume-1234567890456-duplicate.docx (123.45 KB)
  - temp-upload-98765.pdf (89.12 KB)

Total size: 0.45 MB

⚠ DRY RUN - No files were deleted. Run without --dry-run to delete orphaned files.

MongoDB connection closed
```

### Safety Features

- **Dry run mode** by default when using `--dry-run` flag
- Only deletes files that have NO corresponding database record
- Logs all operations
- Shows file sizes before deletion
- Never touches database records (only removes files from disk)

### When to run this

- After noticing duplicate files in uploads/resumes
- As part of regular maintenance (e.g., weekly/monthly)
- After mass testing/development work
- Before backing up to save space

## Resume Skill Signature Backfill

This script fills the new analytics fields on existing resume records:

- `normalizedSkills`
- `skillsSignature`
- `candidateLevel`
- `candidateLevelSource`

### Usage

**Dry run:**
```bash
cd backend
npm run backfill:resume-skills:dry-run
```

**Write changes:**
```bash
cd backend
npm run backfill:resume-skills
```

By default, the script only updates resumes missing one or more derived fields.
Use `node scripts/backfill-resume-skill-signatures.js --force` if you need to recompute every resume.
