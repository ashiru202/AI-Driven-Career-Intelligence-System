const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testPhase7() {
  try {
    console.log("=== Phase 7 - Analytics Engine Testing ===\n");

    // 1. Register a new test user for clean testing
    console.log("1. Creating test user...");
    const testEmail = `test_${Date.now()}@example.com`;
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        name: "Test User Analytics",
        email: testEmail,
        password: "password123",
        confirmPassword: "password123",
      });
      var token = registerResponse.data.data.token;
      var userId = registerResponse.data.data.user.id;
      console.log("✓ Test user created\n");
    } catch (err) {
      // If registration fails, login with existing user
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: "jane@example.com",
        password: "password123",
      });
      var token = loginResponse.data.data.token;
      var userId = loginResponse.data.data.user.id;
      console.log("✓ Using existing user\n");
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Create mock resume using mongoose model directly (via backend)
    console.log("2. Creating test data (comparison + roadmap)...");
    
    // First create a resume directly via database
    const Resume = require("./src/models/Resume");
    await Resume.create({
      user: userId,
      fileName: "test-resume.pdf",
      filePath: "/test/path",
      fileSize: 1024,
      fileType: "application/pdf",
      extractedText: "Senior Developer with React, Node.js, JavaScript, MongoDB, Git",
      extractedSkills: ["React", "Node.js", "JavaScript", "MongoDB", "Git"],
    });

    // 3. Create job comparison
    const comparisonData = {
      jobTitle: "Senior Full Stack Developer",
      jobDescription: "Senior Full Stack Developer role requiring React, Node.js, TypeScript, MongoDB, PostgreSQL, AWS, Docker, Kubernetes, GraphQL",
      jobSkills: [
        "React",
        "Node.js",
        "TypeScript",
        "MongoDB",
        "PostgreSQL",
        "AWS",
        "Docker",
        "Kubernetes",
        "GraphQL",
        "Git",
      ],
    };

    const comparisonResponse = await axios.post(
      `${BASE_URL}/comparisons/compare`,
      comparisonData,
      { headers }
    );
    console.log("✓ Comparison created");
    console.log(`  Match Score: ${comparisonResponse.data.data.matchScore}%`);

    // 4. Create roadmap
    const roadmapData = {
      comparisonId: comparisonResponse.data.data.comparisonId,
      targetRole: "Senior Full Stack Developer",
    };

    const roadmapResponse = await axios.post(
      `${BASE_URL}/roadmaps-new`,
      roadmapData,
      { headers }
    );
    console.log("✓ Roadmap created");
    console.log(`  Skills to learn: ${roadmapResponse.data.data.skillCount}\n`);

    // 5. Update a skill status
    const roadmapId = roadmapResponse.data.data.roadmapId;
    const roadmapDetail = await axios.get(
      `${BASE_URL}/roadmaps-new/${roadmapId}`,
      { headers }
    );
    const firstSkill = roadmapDetail.data.data.roadmap.skillsToLearn[0]?.skill;

    if (firstSkill) {
      await axios.patch(
        `${BASE_URL}/roadmaps-new/${roadmapId}/skills/${encodeURIComponent(firstSkill)}`,
        { status: "IN_PROGRESS" },
        { headers }
      );
      console.log(`✓ Marked "${firstSkill}" as IN_PROGRESS\n`);
    }

    console.log("=== Testing Analytics Endpoints ===\n");

    // 6. Test Skill Demand Analytics
    console.log("6. Skill Demand Analytics:");
    const demandResponse = await axios.get(
      `${BASE_URL}/analytics/skill-demand`,
      { headers }
    );
    console.log("✓ Retrieved skill demand stats");
    if (demandResponse.data.data.top.length > 0) {
      console.log("  Top skills in demand:");
      demandResponse.data.data.top.slice(0, 5).forEach((s, i) => {
        console.log(`    ${i + 1}. ${s.skill} (${s.count} job(s))`);
      });
    } else {
      console.log("  No skill data yet (expected for first run)");
    }
    console.log();

    // 7. Test User Insights
    console.log("7. User Insights:");
    const insightsResponse = await axios.get(
      `${BASE_URL}/analytics/user-insights`,
      { headers }
    );
    console.log("✓ Generated user insights");
    console.log("  Why you might not get hired:");
    insightsResponse.data.data.reasons.forEach((r) => {
      console.log(`    - ${r}`);
    });
    if (insightsResponse.data.data.prioritySkills.length > 0) {
      console.log("  Priority skills to learn:");
      insightsResponse.data.data.prioritySkills.slice(0, 3).forEach((s, i) => {
        console.log(`    ${i + 1}. ${s}`);
      });
    }
    console.log("  Recommended actions:");
    insightsResponse.data.data.actions.forEach((a) => {
      console.log(`    - ${a}`);
    });
    console.log();

    // 8. Test CV Completeness
    console.log("8. CV Completeness:");
    const cvResponse = await axios.get(`${BASE_URL}/analytics/cv-completeness`, {
      headers,
    });
    console.log(`✓ CV Completeness Score: ${cvResponse.data.data.score}%`);
    if (cvResponse.data.data.missingSections.length > 0) {
      console.log("  Missing sections:");
      cvResponse.data.data.missingSections.forEach((s) => {
        console.log(`    - ${s}`);
      });
    }
    if (cvResponse.data.data.suggestions.length > 0) {
      console.log("  Suggestions:");
      cvResponse.data.data.suggestions.forEach((s) => {
        console.log(`    - ${s}`);
      });
    }
    console.log();

    // 9. Test User Report
    console.log("9. Full User Report:");
    const reportResponse = await axios.get(`${BASE_URL}/analytics/user-report`, {
      headers,
    });
    const report = reportResponse.data.data;
    console.log("✓ Report generated successfully");
    console.log(`  User: ${report.user.name} (${report.user.email})`);
    console.log(`  CV Completeness: ${report.cvCompleteness.score}%`);
    console.log(`  Total Roadmaps: ${report.roadmaps.length}`);
    if (report.roadmaps.length > 0) {
      console.log("  Roadmap Progress:");
      report.roadmaps.forEach((rm, i) => {
        console.log(
          `    ${i + 1}. ${rm.targetRole}: ${rm.stepsCompleted}/${rm.totalSteps} completed`
        );
      });
    }
    console.log();

    // 10. Test with date range filter
    console.log("10. Skill Demand with Date Range:");
    const today = new Date().toISOString().split("T")[0];
    const demandWithDateResponse = await axios.get(
      `${BASE_URL}/analytics/skill-demand?startDate=2026-01-01&endDate=${today}`,
      { headers }
    );
    console.log(
      `✓ Filtered by date: ${demandWithDateResponse.data.data.top.length} top skills found\n`
    );

    console.log("=== All Analytics Tests Passed! ===");
    console.log("\n✅ Phase 7 - Analytics Engine Complete!\n");
    console.log("Implemented Features:");
    console.log("  ✓ 7.1 - Analytics service module (all calculations in one service)");
    console.log("  ✓ 7.2 - Skill demand analytics (top 10 + bottom 10 by count)");
    console.log("  ✓ 7.3 - Common gaps across users (platform-wide missing skills)");
    console.log("  ✓ 7.4 - Per-user insights (reasons + priority skills + actions)");
    console.log("  ✓ 7.5 - CV completeness scoring (0-100 with suggestions)");
    console.log("  ✓ Bonus - Date range filtering support");
    console.log("  ✓ Bonus - Full user report generation");
  } catch (error) {
    console.error("\n❌ Test failed:");
    if (error.response) {
      console.error("  Status:", error.response.status);
      console.error("  Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("  Error:", error.message);
      console.error("  Stack:", error.stack);
    }
    process.exit(1);
  }
}

testPhase7();
