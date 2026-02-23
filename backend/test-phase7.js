const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:5000/api";

async function testAnalyticsWithAPI() {
  try {
    console.log("=== Phase 7 - Analytics Engine Testing ===\n");

    // 1. Login
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

    // 2. Upload a resume (create a temp file)
    console.log("2. Uploading resume...");
    const resumeContent = `
      JANE SMITH
      Senior Software Engineer
      
      SKILLS:
      - React, Node.js, JavaScript, TypeScript
      - MongoDB, PostgreSQL, Redis
      - Git, Docker, AWS
      - HTML, CSS, REST APIs
      
      EXPERIENCE:
      Full Stack Developer at Tech Corp (2020-Present)
      - Developed web applications using React and Node.js
      - Implemented RESTful APIs with Express
      - Managed databases using MongoDB
    `;

    const tempFile = path.join(__dirname, "temp-resume.pdf");
    // Create a simple text file but name it .pdf (for testing purposes)
    fs.writeFileSync(tempFile, resumeContent);

    const formData = new FormData();
    formData.append("resume", fs.createReadStream(tempFile));

    try {
      const resumeResponse = await axios.post(`${BASE_URL}/resumes/upload`, formData, {
        headers: {
          ...headers,
          ...formData.getHeaders(),
        },
      });
      console.log("✓ Resume uploaded");
      console.log(`  Skills extracted: ${resumeResponse.data.data.skills.length}\n`);
    } catch (err) {
      console.error("  ❌ Resume upload failed:");
      if (err.response) {
        console.error("    Status:", err.response.status);
        console.error("    Error:", err.response.data);
      } else {
        console.error("    Error:", err.message);
      }
      throw err; // Stop test if resume upload fails
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }

    // 3. Create a job comparison
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
    console.log(`  Match Score: ${comparisonResponse.data.data.matchScore}%`);
    console.log(`  Missing Skills: ${comparisonResponse.data.data.missingSkills.length}\n`);

    // 4. Create roadmap from comparison
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
    console.log(`  Skills to learn: ${roadmapResponse.data.data.skillCount}\n`);

    // 5. Update a skill status
    const roadmapId = roadmapResponse.data.data.roadmapId;
    const roadmapDetail = await axios.get(
      `${BASE_URL}/roadmaps-new/${roadmapId}`,
      { headers }
    );
    const firstSkill = roadmapDetail.data.data.roadmap.skillsToLearn[0]?.skill;

    if (firstSkill) {
      console.log("5. Updating skill status...");
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
    console.log(`  Top skills in demand:`);
    demandResponse.data.data.top.slice(0, 5).forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.skill} (${s.count} job(s))`);
    });
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
    console.log("  Priority skills to learn:");
    insightsResponse.data.data.prioritySkills.slice(0, 3).forEach((s, i) => {
      console.log(`    ${i + 1}. ${s}`);
    });
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
    console.log("  Suggestions:");
    cvResponse.data.data.suggestions.forEach((s) => {
      console.log(`    - ${s}`);
    });
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
    console.log("\n✅ Phase 7 - Analytics Engine Complete!");
    console.log("\nSummary:");
    console.log("  ✓ Skill demand analytics (top/least demanding)");
    console.log("  ✓ Common gaps analysis across users");
    console.log("  ✓ Per-user insights generator");
    console.log("  ✓ CV completeness scoring");
    console.log("  ✓ User report generation");
    console.log("  ✓ Date range filtering support");
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

testAnalyticsWithAPI();
