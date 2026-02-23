const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

async function testWithRoadmapData() {
  try {
    console.log("=== Creating Test Data and Testing Analytics ===\n");

    // 1. Login
    console.log("1. Logging in...");
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: "jane@example.com",
      password: "password123",
    });

    const token = loginResponse.data.data.token;
    const userId = loginResponse.data.data.user.id;
    console.log("✓ Login successful");
    console.log(`  User ID: ${userId}\n`);

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Create a mock resume first
    console.log("2. Creating mock resume...");
    const Resume = require("./src/models/Resume");
    const resume = await Resume.create({
      user: userId,
      fileName: "test-resume.txt",
      filePath: "/test/path",
      fileSize: 1024,
      fileType: "text/plain",
      extractedText: "Senior Developer with skills in React, Node.js, JavaScript, MongoDB, Git, HTML, CSS",
      extractedSkills: ["React", "Node.js", "JavaScript", "MongoDB", "Git", "HTML", "CSS"],
    });
    console.log("✓ Resume created\n");

    // 3. Create a comparison with job description
    console.log("3. Creating job comparison...");
    const comparisonData = {
      jobTitle: "Senior Full Stack Developer",
      jobDescription: `
        Senior Full Stack Developer
        Required Skills:
        - React, Node.js, TypeScript
        - MongoDB, PostgreSQL
        - AWS, Docker, Kubernetes
        - REST APIs, GraphQL
        - Git, CI/CD
        - Agile methodologies
      `,
      jobSkills: [
        "React",
        "Node.js",
        "TypeScript",
        "MongoDB",
        "PostgreSQL",
        "AWS",
        "Docker",
        "Kubernetes",
        "REST APIs",
        "GraphQL",
        "Git",
        "CI/CD",
      ],
    };

    const comparisonResponse = await axios.post(
      `${BASE_URL}/comparisons/compare`,
      comparisonData,
      { headers }
    );
    console.log("✓ Comparison created");
    console.log(
      `  Match Score: ${comparisonResponse.data.data.matchScore}%\n`
    );

    // 3. Create roadmap from comparison
    console.log("4. Creating roadmap from comparison...");
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
    console.log(`  Roadmap ID: ${roadmapResponse.data.data.roadmapId}`);
    console.log(`  Steps: ${roadmapResponse.data.data.skillCount}\n`);

    // 4. Update some skill statuses
    const roadmapId = roadmapResponse.data.data.roadmapId;
    
    // Get roadmap details to find first skill
    const roadmapDetail = await axios.get(
      `${BASE_URL}/roadmaps-new/${roadmapId}`,
      { headers }
    );
    const firstSkill = roadmapDetail.data.data.roadmap.skillsToLearn[0]?.skill || "TypeScript";

    console.log("5. Updating skill status to IN_PROGRESS...");
    await axios.patch(
      `${BASE_URL}/roadmaps-new/${roadmapId}/skills/${encodeURIComponent(firstSkill)}`,
      { status: "IN_PROGRESS" },
      { headers }
    );
    console.log(`✓ Marked "${firstSkill}" as IN_PROGRESS\n`);

    // Now test analytics with real data
    console.log("=== Testing Analytics with Real Data ===\n");

    // 5. Test Skill Demand
    console.log("6. Testing Skill Demand Analytics...");
    const demandResponse = await axios.get(
      `${BASE_URL}/analytics/skill-demand`,
      { headers }
    );
    console.log("✓ Skill Demand Stats:");
    console.log("  Top skills:");
    demandResponse.data.data.top.slice(0, 5).forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.skill} (${s.count} jobs)`);
    });
    console.log();

    // 6. Test User Insights
    console.log("7. Testing User Insights...");
    const insightsResponse = await axios.get(
      `${BASE_URL}/analytics/user-insights`,
      { headers }
    );
    console.log("✓ User Insights:");
    console.log("  Reasons:");
    insightsResponse.data.data.reasons.forEach((r) => {
      console.log(`    - ${r}`);
    });
    console.log("  Priority Skills to Learn:");
    insightsResponse.data.data.prioritySkills.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s}`);
    });
    console.log("  Recommended Actions:");
    insightsResponse.data.data.actions.forEach((a) => {
      console.log(`    - ${a}`);
    });
    console.log();

    // 7. Test CV Completeness
    console.log("8. Testing CV Completeness...");
    const cvResponse = await axios.get(`${BASE_URL}/analytics/cv-completeness`, {
      headers,
    });
    console.log("✓ CV Completeness:");
    console.log(`  Score: ${cvResponse.data.data.score}%`);
    if (cvResponse.data.data.missingSections.length > 0) {
      console.log("  Missing Sections:");
      cvResponse.data.data.missingSections.forEach((s) => {
        console.log(`    - ${s}`);
      });
    }
    console.log("  Suggestions:");
    cvResponse.data.data.suggestions.forEach((s) => {
      console.log(`    - ${s}`);
    });
    console.log();

    // 8. Test User Report
    console.log("9. Testing Full User Report...");
    const reportResponse = await axios.get(`${BASE_URL}/analytics/user-report`, {
      headers,
    });
    const report = reportResponse.data.data;
    console.log("✓ User Report Generated:");
    console.log(`  User: ${report.user.name} (${report.user.email})`);
    console.log(`  CV Completeness: ${report.cvCompleteness.score}%`);
    console.log(`  Total Roadmaps: ${report.roadmaps.length}`);
    if (report.roadmaps.length > 0) {
      console.log("  Roadmap Progress:");
      report.roadmaps.forEach((rm, i) => {
        console.log(
          `    ${i + 1}. ${rm.targetRole}: ${rm.stepsCompleted}/${
            rm.totalSteps
          } steps completed (${rm.matchScore}% match)`
        );
      });
    }
    console.log(`  Generated At: ${report.generatedAt}\n`);

    // 9. Test with date range filter
    console.log("10. Testing Skill Demand with Date Range...");
    const today = new Date().toISOString().split("T")[0];
    const demandWithDateResponse = await axios.get(
      `${BASE_URL}/analytics/skill-demand?startDate=2026-01-01&endDate=${today}`,
      { headers }
    );
    console.log(
      "✓ Skills in demand (filtered by date):",
      demandWithDateResponse.data.data.top.length,
      "skills found\n"
    );

    console.log("=== All Analytics Tests Passed Successfully! ===");
    console.log("\n✅ Phase 7 - Analytics Engine Complete!");
  } catch (error) {
    console.error("\n❌ Test failed:");
    if (error.response) {
      console.error("  Status:", error.response.status);
      console.error("  Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("  Error:", error.message);
    }
    process.exit(1);
  }
}

testWithRoadmapData();
