#!/usr/bin/env node
/**
 * Populate the database with Industry Trends data.
 *
 * This script runs the complete pipeline:
 * 1. Scraper  → Collect job postings from various sources
 * 2. Aggregator → Analyze job postings and create weekly skill snapshots
 * 3. Forecaster → Generate ML-based trend predictions
 */

require("dotenv").config();
const axios = require("axios");

const NLP_URL = process.env.NLP_SERVICE_URL || "http://localhost:8000";
const BACKEND_URL = "http://localhost:5001";

function getInternalToken() {
  const token = (process.env.NLP_INTERNAL_TOKEN || process.env.INTERNAL_TOKEN || "").trim();
  if (!token || token.toLowerCase() === "changeme") {
    throw new Error(
      "NLP_INTERNAL_TOKEN (or INTERNAL_TOKEN) must be set to a non-default shared secret"
    );
  }
  return token;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    const internalToken = getInternalToken();

    console.log("🚀 Starting Industry Trends Data Population Pipeline\n");

    // Step 1: Trigger scraping + processing
    console.log("📥 Step 1/2: Triggering job scraper + processor...");
    console.log("   This will:");
    console.log("   - Collect job postings from Adzuna, Remotive, TopJobs.lk, XpressJobs.lk");
    console.log("   - Extract skills from job descriptions");
    console.log("   - Create weekly skill frequency snapshots\n");

    const scrapeStart = Date.now();
    const scrapeRes = await axios.post(
      `${NLP_URL}/internal/trigger-scrape`,
      {},
      {
        headers: { "X-Internal-Token": internalToken },
        timeout: 240_000 // 4 minutes
      }
    );

    const scrapeDuration = ((Date.now() - scrapeStart) / 1000).toFixed(1);
    console.log(`   ✅ Scraping & processing completed in ${scrapeDuration}s`);
    console.log(`   Result: ${JSON.stringify(scrapeRes.data)}\n`);

    await sleep(2000);

    // Step 2: Trigger forecasting
    console.log("🔮 Step 2/2: Triggering ML forecasting...");
    console.log("   This will generate trend predictions for the top 100 skills\n");

    const forecastStart = Date.now();
    const forecastRes = await axios.post(
      `${NLP_URL}/internal/trigger-forecast`,
      {},
      {
        headers: { "X-Internal-Token": internalToken },
        timeout: 120_000 // 2 minutes
      }
    );

    const forecastDuration = ((Date.now() - forecastStart) / 1000).toFixed(1);
    console.log(`   ✅ Forecasting completed in ${forecastDuration}s`);
    console.log(`   Result: ${JSON.stringify(forecastRes.data)}\n`);

    // Summary
    const totalDuration = ((Date.now() - scrapeStart) / 1000 / 60).toFixed(1);
    console.log(`\n✨ Pipeline completed in ${totalDuration} minutes!\n`);

    console.log("📈 What's next?");
    console.log("   1. Visit http://localhost:3000/trends to view the trends dashboard");
    console.log("   2. The data will auto-refresh daily (configurable via SCRAPE_INTERVAL_HOURS)");
    console.log("   3. Run this script again anytime to manually refresh the data\n");

  } catch (error) {
    console.error("\n❌ Error:", error.response?.data || error.message);
    console.error("\nTroubleshooting:");
    console.error("   - Ensure NLP service is running: docker ps | grep nlp");
    console.error("   - Check NLP service logs: docker logs nlp-service");
    console.error("   - Verify .env has correct ADZUNA credentials (for global jobs)");
    console.error("   - Check MongoDB connection: mongo --eval 'db.version()'");
    process.exit(1);
  }
}

main();
