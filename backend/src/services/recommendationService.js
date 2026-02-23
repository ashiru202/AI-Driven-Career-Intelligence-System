const normalize = (s) => String(s || "").trim().toLowerCase();

const recommendationsMap = {
  javascript: [
    { title: "JavaScript Full Course", platform: "YouTube", level: "Beginner", url: "https://www.youtube.com/watch?v=PkZNo7MFNFg" },
    { title: "JavaScript Guide", platform: "MDN", level: "Beginner", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  ],
  git: [
    { title: "Git & GitHub Crash Course", platform: "YouTube", level: "Beginner", url: "https://www.youtube.com/watch?v=RGOj5yH7evk" },
    { title: "Pro Git Book", platform: "Git-SCM", level: "Beginner", url: "https://git-scm.com/book/en/v2" },
  ],
  "rest api": [
    { title: "REST API Concepts", platform: "YouTube", level: "Beginner", url: "https://www.youtube.com/watch?v=Q-BpqyOT3a8" },
    { title: "HTTP Overview", platform: "MDN", level: "Beginner", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" },
  ],
};

function getRecommendations(skills = []) {
  const out = {};

  for (const raw of skills) {
    const key = normalize(raw);
    if (!key) continue;

    const alias =
      key === "rest" || key === "api" || key === "apis" ? "rest api" :
      key === "node" ? "nodejs" :
      key;

    out[raw] = recommendationsMap[alias] || [];
  }

  return out;
}

module.exports = { getRecommendations };
