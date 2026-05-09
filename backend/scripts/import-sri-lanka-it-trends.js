#!/usr/bin/env node

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Papa = require("papaparse");

const connectDB = require("../src/config/db");
const JobPosting = require("../src/models/JobPosting");
const SkillSnapshot = require("../src/models/SkillSnapshot");
const SkillForecast = require("../src/models/SkillForecast");
const { normalizeSkillList } = require("../src/utils/skillNormalizer");

const DATASET_SNAPSHOT_SOURCE = "dataset-lk-it-jobs";
const DATASET_SOURCE_ID_PREFIX = "dataset-lk-it-jobs:";

function parseArgs(argv) {
  const args = {
    csv: path.join(__dirname, "..", "data", "sri-lanka", "sri_lanka_it_jobs_dataset.csv"),
    weeks: 12,
    jobsPerWeek: 120,
    reset: false,
    mongoUri: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--csv") {
      args.csv = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--weeks") {
      args.weeks = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }

    if (token === "--jobsPerWeek" || token === "--jobs-per-week") {
      args.jobsPerWeek = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }

    if (token === "--reset") {
      args.reset = true;
      continue;
    }

    if (token === "--mongoUri" || token === "--mongo-uri") {
      args.mongoUri = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function startOfWeekUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function normalizeSkillToken(token) {
  if (!token) return "";

  // Remove parenthetical notes and collapse whitespace.
  return String(token)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSkillField(field) {
  if (!field) return [];

  const raw = String(field);

  // First split on commas (primary delimiter in the CSV).
  const commaParts = raw
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);

  // Then split slash-separated entries like "JavaScript/TypeScript".
  const tokens = [];
  for (const part of commaParts) {
    if (part.includes("/")) {
      const subParts = part
        .split("/")
        .map(p => p.trim())
        .filter(Boolean);
      tokens.push(...subParts);
    } else {
      tokens.push(part);
    }
  }

  return tokens.map(normalizeSkillToken).filter(Boolean);
}

function buildSkillsFromRow(row) {
  const softSkills = splitSkillField(row["Soft Skills"]);
  const techStack = splitSkillField(row["Tech Stack"]);

  return normalizeSkillList([...techStack, ...softSkills]);
}

function safeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatISODate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log("Import Sri Lanka IT trends dataset into MongoDB");
    console.log("\nUsage:");
    console.log("  node scripts/import-sri-lanka-it-trends.js --reset");
    console.log("  node scripts/import-sri-lanka-it-trends.js --csv <path> --weeks 12 --jobsPerWeek 120 --reset");
    console.log("  node scripts/import-sri-lanka-it-trends.js --mongoUri mongodb://localhost:27018/career-intelligence --reset");
    console.log("\nOptions:");
    console.log("  --csv <path>         Path to sri_lanka_it_jobs_dataset.csv");
    console.log("  --weeks <n>          Number of weeks of snapshots to generate (default: 12)");
    console.log("  --jobsPerWeek <n>    Number of synthetic postings per week (default: 120)");
    console.log("  --reset              Delete previous dataset-imported docs first");
    console.log("  --mongoUri <uri>     Override MONGO_URI (useful when backend runs via Docker)");
    process.exit(0);
  }

  if (!Number.isFinite(args.weeks) || args.weeks < 2) {
    throw new Error("--weeks must be a number >= 2");
  }
  if (!Number.isFinite(args.jobsPerWeek) || args.jobsPerWeek < 1) {
    throw new Error("--jobsPerWeek must be a number >= 1");
  }

  const csvPath = path.resolve(args.csv);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at: ${csvPath}`);
  }

  if (args.mongoUri) {
    process.env.MONGO_URI = String(args.mongoUri).trim();
  }

  const csvText = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }

  const roles = (parsed.data || [])
    .map((row) => {
      const role = String(row.Role || "").trim();
      const skills = buildSkillsFromRow(row);
      return role ? { role, skills } : null;
    })
    .filter(Boolean);

  if (roles.length === 0) {
    throw new Error("No roles found in CSV. Expected a 'Role' column.");
  }

  const now = new Date();
  const currentWeekStart = startOfWeekUTC(now);

  const weeks = [];
  for (let offset = args.weeks - 1; offset >= 0; offset -= 1) {
    weeks.push(addDaysUTC(currentWeekStart, -7 * offset));
  }

  await connectDB();

  try {
    if (args.reset) {
      const [jobsDel, snapDel, forecastDel] = await Promise.all([
        JobPosting.deleteMany({ marketScope: "local-lk" }),
        SkillSnapshot.deleteMany({ marketScope: "local-lk" }),
        SkillForecast.deleteMany({ marketScope: "local-lk" }),
      ]);

      console.log(
        `🧹 Reset complete: deleted ${jobsDel.deletedCount} job_postings, ${snapDel.deletedCount} skill_snapshots, ${forecastDel.deletedCount} skill_forecasts`
      );
    }

    console.log(`📄 Loaded ${roles.length} roles from CSV`);
    console.log(`🗓️  Generating ${weeks.length} weekly snapshots (${formatISODate(weeks[0])} → ${formatISODate(weeks[weeks.length - 1])})`);

    let totalJobsUpserted = 0;

    for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
      const weekStart = weeks[weekIndex];
      const weekEnd = addDaysUTC(weekStart, 7);

      const postings = [];
      // The dataset has no time dimension. Keep role sampling deterministic
      // week-to-week to avoid introducing artificial trends.
      const roleStep = 37; // coprime with 209 (dataset size), ensures broad coverage

      for (let i = 0; i < args.jobsPerWeek; i += 1) {
        const { role, skills } = roles[(i * roleStep) % roles.length];

        const scrapedAt = addDaysUTC(weekStart, (i % 6) + 1);
        const postedAt = addDaysUTC(scrapedAt, -2);

        const slug = safeSlug(role);
        const sourceId = `${DATASET_SOURCE_ID_PREFIX}${formatISODate(weekStart)}:${slug}:${i}`;

        postings.push({
          title: role,
          company: "Dataset",
          location: "Sri Lanka",
          description: `Dataset-derived posting for ${role}. Skills: ${skills.join(", ")}`,
          extractedSkills: skills,
          source: "mock",
          sourceId,
          marketScope: "local-lk",
          postedAt,
          scrapedAt,
          processed: true,
        });
      }

      const jobOps = postings.map((doc) => ({
        updateOne: {
          filter: { source: doc.source, sourceId: doc.sourceId },
          update: { $set: doc },
          upsert: true,
        },
      }));

      const jobRes = await JobPosting.bulkWrite(jobOps, { ordered: false });
      totalJobsUpserted += (jobRes.upsertedCount || 0) + (jobRes.modifiedCount || 0);

      const skillCounts = new Map();
      for (const posting of postings) {
        const uniqueSkills = new Set(posting.extractedSkills || []);
        for (const skill of uniqueSkills) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        }
      }

      const totalJobs = postings.length;
      const snapshotOps = [];
      for (const [skill, count] of skillCounts.entries()) {
        snapshotOps.push({
          updateOne: {
            filter: { skill, marketScope: "local-lk", periodStart: weekStart },
            update: {
              $set: {
                skill,
                marketScope: "local-lk",
                periodStart: weekStart,
                periodEnd: weekEnd,
                count,
                totalJobs,
                relativeFreq: totalJobs > 0 ? count / totalJobs : 0,
                sources: [DATASET_SNAPSHOT_SOURCE],
              },
            },
            upsert: true,
          },
        });
      }

      if (snapshotOps.length > 0) {
        await SkillSnapshot.bulkWrite(snapshotOps, { ordered: false });
      }

      console.log(
        `✅ Week ${formatISODate(weekStart)}: ${totalJobs} job_postings, ${skillCounts.size} skills snapshotted`
      );
    }

    console.log("\n✨ Import complete");
    console.log(`   Scope: local-lk`);
    console.log(`   CSV: ${csvPath}`);
    console.log(`   Weeks: ${args.weeks}`);
    console.log(`   Jobs/week: ${args.jobsPerWeek}`);

  } finally {
    await mongoose.connection.close();
  }
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err.message);
  process.exit(1);
});
