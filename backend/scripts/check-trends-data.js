#!/usr/bin/env node
/**
 * Quick diagnostic script to check Industry Trends data in the database.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const SkillForecast = require("../src/models/SkillForecast");
const SkillSnapshot = require("../src/models/SkillSnapshot");
const JobPosting = require("../src/models/JobPosting");

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/career-intelligence";
    console.log(`🔗 Connecting to MongoDB: ${mongoUri}\n`);

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB\n");

    // Check JobPostings
    const jobCount = await JobPosting.countDocuments();
    console.log(`📊 JobPostings: ${jobCount} documents`);
    if (jobCount > 0) {
      const latest = await JobPosting.findOne().sort({ scrapedAt: -1 }).select("source scrapedAt");
      console.log(`   Latest: ${latest?.source} at ${latest?.scrapedAt}\n`);
    } else {
      console.log("   ⚠️  No job postings found. Run scraper first!\n");
    }

    // Check SkillSnapshots
    const snapshotCount = await SkillSnapshot.countDocuments();
    console.log(`📈 SkillSnapshots: ${snapshotCount} documents`);
    if (snapshotCount > 0) {
      const distinctSkills = await SkillSnapshot.distinct("skill");
      const distinctPeriods = await SkillSnapshot.distinct("periodStart");
      console.log(`   ${distinctSkills.length} unique skills tracked`);
      console.log(`   ${distinctPeriods.length} unique weeks of data`);

      // Sample some snapshots
      const samples = await SkillSnapshot.find().limit(3).sort({ periodStart: -1 });
      console.log("   Sample snapshots:");
      samples.forEach(s => {
        console.log(`     - ${s.skill}: ${(s.relativeFreq * 100).toFixed(3)}% on ${s.periodStart.toISOString().split('T')[0]} (${s.marketScope})`);
      });
      console.log();
    } else {
      console.log("   ⚠️  No snapshots found. Run aggregator after scraping!\n");
    }

    // Check SkillForecasts
    const forecastCount = await SkillForecast.countDocuments();
    console.log(`🔮 SkillForecasts: ${forecastCount} documents`);
    if (forecastCount > 0) {
      const risingCount = await SkillForecast.countDocuments({ trendDirection: "rising" });
      const fallingCount = await SkillForecast.countDocuments({ trendDirection: "falling" });
      const stableCount = await SkillForecast.countDocuments({ trendDirection: "stable" });

      console.log(`   Rising:  ${risingCount}`);
      console.log(`   Falling: ${fallingCount}`);
      console.log(`   Stable:  ${stableCount}`);

      // Sample forecasts
      const risingSkills = await SkillForecast.find({ trendDirection: "rising" })
        .sort({ trendSlope: -1 })
        .limit(3);

      if (risingSkills.length > 0) {
        console.log("\n   Top 3 rising skills:");
        risingSkills.forEach(f => {
          console.log(`     - ${f.skill}: slope ${(f.trendSlope * 100).toFixed(4)}% /wk (R²=${f.trendConfidence.toFixed(3)})`);
        });
      }

      const fallingSkills = await SkillForecast.find({ trendDirection: "falling" })
        .sort({ trendSlope: 1 })
        .limit(3);

      if (fallingSkills.length > 0) {
        console.log("\n   Top 3 falling skills:");
        fallingSkills.forEach(f => {
          console.log(`     - ${f.skill}: slope ${(f.trendSlope * 100).toFixed(4)}% /wk (R²=${f.trendConfidence.toFixed(3)})`);
        });
      }
      console.log();
    } else {
      console.log("   ⚠️  No forecasts found. Run forecaster after aggregation!\n");
    }

    // Configuration check
    console.log("⚙️  Configuration:");
    console.log(`   RISING_SLOPE_THRESHOLD:  ${process.env.RISING_SLOPE_THRESHOLD || "0.001"}`);
    console.log(`   FALLING_SLOPE_THRESHOLD: ${process.env.FALLING_SLOPE_THRESHOLD || "-0.001"}`);
    console.log(`   MIN_DATA_POINTS:         ${process.env.MIN_DATA_POINTS || "4"}`);
    console.log();

    // Recommendations
    console.log("💡 Next Steps:");
    if (jobCount === 0) {
      console.log("   1. Run the scraper to collect job postings:");
      console.log("      POST http://localhost:5001/api/admin/trends/trigger-scrape");
    } else if (snapshotCount === 0) {
      console.log("   1. Run the aggregator to generate snapshots:");
      console.log("      cd nlp-service && python -m processor");
    } else if (forecastCount === 0) {
      console.log("   1. Run the forecaster to generate predictions:");
      console.log("      POST http://localhost:5001/api/admin/trends/trigger-forecast");
    } else if (risingCount === 0 && fallingCount === 0) {
      console.log("   1. All skills are 'stable' (slopes between -0.001 and 0.001)");
      console.log("   2. Consider adjusting slope thresholds in .env:");
      console.log("      RISING_SLOPE_THRESHOLD=0.0001");
      console.log("      FALLING_SLOPE_THRESHOLD=-0.0001");
      console.log("   3. Or wait for more weeks of data to accumulate");
    } else {
      console.log("   ✅ Everything looks good! Check the frontend at /trends");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

main();
