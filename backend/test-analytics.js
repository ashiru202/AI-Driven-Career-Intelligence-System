const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testAnalytics() {
  try {
    console.log("=== Testing Analytics Engine ===\n");

    // 1. Login to get token
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: "jane@example.com",
      password: "password123",
    });

    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    console.log("✓ Login successful\n");

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Test Skill Demand Analytics
    console.log("2. Testing Skill Demand Analytics...");
    const demandResponse = await axios.get(
      `${BASE_URL}/analytics/skill-demand`,
      { headers }
    );
    console.log("✓ Skill Demand Stats:");
    console.log(
      "  Top skills:",
      demandResponse.data.data.top.slice(0, 3).map((s) => s.skill)
    );
    console.log(
      "  Least demanded:",
      demandResponse.data.data.least.slice(0, 3).map((s) => s.skill)
    );
    console.log();

    // 3. Test Common Gaps (if STAFF/ADMIN - skip if USER)
    try {
      console.log("3. Testing Common Gaps Analysis...");
      const gapsResponse = await axios.get(
        `${BASE_URL}/analytics/common-gaps`,
        { headers }
      );
      console.log("✓ Common Gaps:");
      console.log(
        "  Top gaps:",
        gapsResponse.data.data.slice(0, 3).map((g) => g.skill)
      );
    } catch (error) {
      if (error.response?.status === 403) {
        console.log("  (Skipped - requires STAFF/ADMIN role)");
      } else {
        throw error;
      }
    }
    console.log();

    // 4. Test User Insights
    console.log("4. Testing User Insights...");
    const insightsResponse = await axios.get(
      `${BASE_URL}/analytics/user-insights`,
      { headers }
    );
    console.log("✓ User Insights:");
    console.log("  Reasons:", insightsResponse.data.data.reasons);
    console.log(
      "  Priority Skills:",
      insightsResponse.data.data.prioritySkills
    );
    console.log("  Actions:", insightsResponse.data.data.actions);
    console.log();

    // 5. Test CV Completeness
    console.log("5. Testing CV Completeness...");
    const cvResponse = await axios.get(`${BASE_URL}/analytics/cv-completeness`, {
      headers,
    });
    console.log("✓ CV Completeness:");
    console.log("  Score:", cvResponse.data.data.score + "%");
    console.log("  Missing Sections:", cvResponse.data.data.missingSections);
    console.log("  Suggestions:", cvResponse.data.data.suggestions);
    console.log();

    // 6. Test User Report
    console.log("6. Testing User Report Generation...");
    const reportResponse = await axios.get(`${BASE_URL}/analytics/user-report`, {
      headers,
    });
    console.log("✓ User Report Generated:");
    console.log("  User:", reportResponse.data.data.user.name);
    console.log("  CV Score:", reportResponse.data.data.cvCompleteness.score);
    console.log("  Roadmaps:", reportResponse.data.data.roadmaps.length);
    console.log("  Generated At:", reportResponse.data.data.generatedAt);
    console.log();

    console.log("=== All Analytics Tests Passed! ===");
  } catch (error) {
    console.error("❌ Test failed:");
    if (error.response) {
      console.error("  Status:", error.response.status);
      console.error("  Error:", error.response.data);
    } else {
      console.error("  Error:", error.message);
    }
    process.exit(1);
  }
}

testAnalytics();
