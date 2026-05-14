const LINKEDIN_URL_PATTERN = /linkedin\.com\/jobs(\/|$)|linkedin\.com\/jobs\/view/i;

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getNodeText(node) {
  if (!node) return "";

  const inner = normalizeText(node.innerText || "");
  const content = normalizeText(node.textContent || "");

  // Prefer whichever representation is longer.
  // LinkedIn frequently truncates visible text (innerText) behind expander widgets,
  // while textContent still contains the full content.
  return inner.length >= content.length ? inner : content;
}

function getFirstText(root, selectors, minLength = 1) {
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    const text = getNodeText(node);
    if (text.length >= minLength) {
      return text;
    }
  }

  return "";
}

function getLongestText(root, selectors, minLength = 1) {
  let best = "";

  for (const selector of selectors) {
    const nodes = root.querySelectorAll(selector);
    for (const node of nodes) {
      const text = getNodeText(node);
      if (text.length > best.length) {
        best = text;
      }
    }
  }

  return best.length >= minLength ? best : "";
}

function getCombinedText(root, selectors, minLength = 1) {
  let best = "";

  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    if (nodes.length === 0) continue;
    const combined = normalizeText(
      nodes
        .map((node) => getNodeText(node))
        .filter(Boolean)
        .join("\n")
    );

    if (combined.length > best.length) {
      best = combined;
    }
  }

  return best.length >= minLength ? best : "";
}

function looksLikeJobDescription(text) {
  const value = normalizeText(text).toLowerCase();
  if (value.length < 200) return false;

  const hints = [
    "responsibilities",
    "requirements",
    "qualifications",
    "experience",
    "skills",
    "about the job",
    "what you will",
    "what you'll",
    "role",
  ];

  return hints.some((hint) => value.includes(hint));
}

function extractLargestMeaningfulBlock(root) {
  const container = root.querySelector("main") || root.body || root;
  const candidates = container.querySelectorAll("section, article, div");

  let best = "";
  for (const node of candidates) {
    const text = getNodeText(node);
    if (!text) continue;
    if (text.length > 10000) continue;
    if (!looksLikeJobDescription(text)) continue;
    if (text.length > best.length) {
      best = text;
    }
  }

  return best.slice(0, 10000);
}

function stripHtmlToText(html) {
  if (!html) return "";

  try {
    const container = document.createElement("div");
    container.innerHTML = String(html);
    return normalizeText(container.textContent || "");
  } catch {
    return normalizeText(String(html));
  }
}

function isJobPostingType(value) {
  if (!value) return false;
  if (Array.isArray(value)) {
    return value.some((entry) => String(entry).toLowerCase() === "jobposting");
  }
  return String(value).toLowerCase() === "jobposting";
}

function tryExtractJsonLdJobPosting(root) {
  const scripts = root.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const raw = script?.textContent;
    if (!raw || !raw.trim()) continue;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const candidates = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray(parsed["@graph"])
        ? parsed["@graph"]
        : [parsed];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue;
      if (!isJobPostingType(candidate["@type"])) continue;

      const title = normalizeText(candidate.title || candidate.name || "");
      const description = stripHtmlToText(candidate.description || "").slice(0, 10000);

      const org = candidate.hiringOrganization;
      const company = normalizeText(
        (org && typeof org === "object" ? org.name : "") || ""
      );

      const jobLocation = Array.isArray(candidate.jobLocation)
        ? candidate.jobLocation[0]
        : candidate.jobLocation;
      const address = jobLocation?.address;
      const locationParts = [
        address?.addressLocality,
        address?.addressRegion,
        address?.addressCountry,
      ]
        .map((part) => normalizeText(part))
        .filter(Boolean);
      const location = locationParts.join(", ");

      return {
        title: title || "",
        description: description || "",
        company: company || "",
        location: location || "",
      };
    }
  }

  return null;
}

function extractLinkedInDescription(root) {
  const selectors = [
    ".jobs-description-content__text",
    ".jobs-box__html-content",
    ".show-more-less-html__markup",
    ".jobs-description__content",
    ".jobs-search__job-details--container .jobs-description",
    "[data-job-details-section='description']",
    "[data-test-job-description]",
    "#job-details",
    ".jobs-description__container",
    ".jobs-description",
  ];

  const combinedDom = getCombinedText(root, selectors, 80).slice(0, 10000);
  const longestDom = getLongestText(root, selectors, 80).slice(0, 10000);
  const fromDom = combinedDom.length >= longestDom.length ? combinedDom : longestDom;
  if (fromDom.length >= 120) {
    return fromDom;
  }

  const jsonLd = tryExtractJsonLdJobPosting(root);
  if (jsonLd?.description && jsonLd.description.length >= 80) {
    return jsonLd.description;
  }

  const heuristic = extractLargestMeaningfulBlock(root);
  if (heuristic.length >= 120) {
    return heuristic;
  }

  return fromDom;
}

function looksLikeLinkedInPage(root, url) {
  if (LINKEDIN_URL_PATTERN.test(url)) {
    return true;
  }

  return !!root.querySelector("meta[property='og:site_name'][content='LinkedIn']");
}

export function detectLinkedInJob(options = {}) {
  const root = options.root || document;
  const url = String(options.url || globalThis.location?.href || "");
  const pageTitle = String(options.pageTitle || globalThis.document?.title || "");

  if (!looksLikeLinkedInPage(root, url)) {
    return null;
  }

  const jsonLd = tryExtractJsonLdJobPosting(root);

  const jobTitle =
    getFirstText(
      root,
      [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".top-card-layout__title",
        ".jobs-unified-top-card__job-title",
        "h1.t-24",
        "h1",
      ],
      2
    ) ||
    normalizeText(jsonLd?.title || "") ||
    normalizeText(pageTitle.replace(/\|\s*LinkedIn.*$/i, ""));

  const company =
    getFirstText(
    root,
    [
      ".job-details-jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name",
      ".topcard__org-name-link",
      ".topcard__flavor-row .topcard__flavor:first-child",
    ],
    2
  ) || normalizeText(jsonLd?.company || "");

  const location =
    getFirstText(
    root,
    [
      ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
      ".jobs-unified-top-card__bullet",
      ".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__bullet",
      ".topcard__flavor--bullet",
    ],
    2
  ) || normalizeText(jsonLd?.location || "");

  const jobDescription = extractLinkedInDescription(root);

  if (!jobTitle && jobDescription.length < 80) {
    return null;
  }

  return {
    jobTitle: jobTitle || "Untitled LinkedIn Role",
    company: company || null,
    location: location || null,
    jobDescription,
    descriptionLength: jobDescription.length,
    site: "linkedin",
    extractedBy: "linkedin-detector",
  };
}
