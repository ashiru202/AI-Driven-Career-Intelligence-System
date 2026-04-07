// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { detectIndeedJob } from "../src/content/detectors/indeed.js";

describe("Indeed detector", () => {
  it("extracts core job fields on Indeed pages", () => {
    document.head.innerHTML = "";
    document.body.innerHTML = `
      <h1 data-testid="jobsearch-JobInfoHeader-title">Senior Backend Engineer</h1>
      <div data-testid="inlineHeader-companyName">Globex</div>
      <div data-testid="job-location">Remote</div>
      <div id="jobDescriptionText">
        Design, build, and operate resilient services using Node.js and MongoDB while working across distributed systems, observability, and performance optimization initiatives.
      </div>
    `;

    const result = detectIndeedJob({
      root: document,
      url: "https://www.indeed.com/viewjob?jk=abc123",
      pageTitle: "Senior Backend Engineer - Indeed.com",
    });

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      jobTitle: "Senior Backend Engineer",
      company: "Globex",
      location: "Remote",
      site: "indeed",
      extractedBy: "indeed-detector",
    });
    expect(result.jobDescription.length).toBeGreaterThan(80);
  });

  it("returns null on non-Indeed pages", () => {
    document.head.innerHTML = "";
    document.body.innerHTML = "<h1>Generic page</h1>";

    const result = detectIndeedJob({
      root: document,
      url: "https://example.com/job/2",
      pageTitle: "Example",
    });

    expect(result).toBeNull();
  });
});
