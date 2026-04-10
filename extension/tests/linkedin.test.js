// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { detectLinkedInJob } from "../src/content/detectors/linkedin.js";

describe("LinkedIn detector", () => {
  it("extracts core job fields on LinkedIn pages", () => {
    document.head.innerHTML = "";
    document.body.innerHTML = `
      <section class="job-details-jobs-unified-top-card__job-title">
        <h1>Senior Frontend Engineer</h1>
      </section>
      <div class="job-details-jobs-unified-top-card__company-name"><a>Acme Inc</a></div>
      <div class="job-details-jobs-unified-top-card__primary-description-container">
        <span class="tvm__text">Colombo, Sri Lanka</span>
      </div>
      <div class="jobs-description-content__text">
        Build and maintain scalable React interfaces for our product teams while collaborating with backend engineers, QA, and design stakeholders to deliver user-focused features.
      </div>
    `;

    const result = detectLinkedInJob({
      root: document,
      url: "https://www.linkedin.com/jobs/view/123456789",
      pageTitle: "Senior Frontend Engineer | LinkedIn",
    });

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      jobTitle: "Senior Frontend Engineer",
      company: "Acme Inc",
      location: "Colombo, Sri Lanka",
      site: "linkedin",
      extractedBy: "linkedin-detector",
    });
    expect(result.jobDescription.length).toBeGreaterThan(80);
  });

  it("returns null on non-LinkedIn pages", () => {
    document.head.innerHTML = "";
    document.body.innerHTML = "<h1>Not a LinkedIn page</h1>";

    const result = detectLinkedInJob({
      root: document,
      url: "https://example.com/jobs/1",
      pageTitle: "Example Job",
    });

    expect(result).toBeNull();
  });
});
