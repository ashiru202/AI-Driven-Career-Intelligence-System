/* eslint-disable no-console */

const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');

const axios = require('axios');
const dotenv = require('dotenv');

const { extractTextFromFile } = require('../src/services/resumeTextExtractor');
const { extractSkillsWithAI } = require('../src/services/aiSkillExtractorService');
const { normalizeSkillList, compareSkills } = require('../src/utils/skillNormalizer');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function toInt(value) {
  if (value == null) return null;
  const n = Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function csvParse(text) {
  const rows = [];
  let record = [];
  let field = '';
  let inQuotes = false;

  // Normalize CRLF → LF so parsing is consistent.
  const input = String(text).replace(/\r\n/g, '\n');

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = input[i + 1];
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      record.push(field);
      field = '';
      continue;
    }

    if (ch === '\n') {
      record.push(field);
      field = '';
      // Ignore completely empty trailing line
      if (record.length !== 1 || record[0] !== '') {
        rows.push(record);
      }
      record = [];
      continue;
    }

    field += ch;
  }

  // Final field
  if (inQuotes) {
    throw new Error('CSV parse error: unterminated quote');
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    rows.push(record);
  }

  const headers = rows.shift() || [];
  const objects = rows.map((r) => {
    const obj = {};
    for (let i = 0; i < headers.length; i += 1) {
      obj[headers[i]] = r[i] ?? '';
    }
    return obj;
  });

  return { headers, rows: objects };
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvStringify(headers, rows) {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));

  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h] ?? '')).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function normalizeOutputSkills(skills) {
  const normalized = normalizeSkillList(Array.isArray(skills) ? skills : []);
  return [...new Set(normalized)];
}

async function extractSkillsKeywordOnly(text) {
  if (!text || !text.trim()) return [];
  const nlpUrl = process.env.NLP_SERVICE_URL;
  if (!nlpUrl) throw new Error('NLP_SERVICE_URL is required for keyword-only extraction');

  const resp = await axios.post(
    `${nlpUrl}/extract-skills`,
    { text },
    { timeout: 15000 }
  );

  const skills = resp.data?.skills;
  if (!Array.isArray(skills)) throw new Error('NLP service returned no skills array');
  return skills;
}

async function extractSkillsForText(text, extractor) {
  if (extractor === 'keyword') {
    const skills = await extractSkillsKeywordOnly(text);
    return { skills, source: 'keyword-only' };
  }

  if (extractor === 'hybrid') {
    const skills = await extractSkillsKeywordOnly(text);
    if (Array.isArray(skills) && skills.length > 0) {
      return { skills, source: 'keyword-only' };
    }

    const res = await extractSkillsWithAI(text);
    return { skills: res.skills, source: `hybrid-fallback:${res.source}` };
  }

  const res = await extractSkillsWithAI(text);
  return res;
}

async function semanticMatchOrKeywordFallback(resumeSkills, jobSkills) {
  const nlpUrl = process.env.NLP_SERVICE_URL;
  const normalizedResumeSkills = normalizeSkillList(resumeSkills);
  const normalizedJobSkills = normalizeSkillList(jobSkills);

  if (nlpUrl) {
    try {
      const semResponse = await axios.post(
        `${nlpUrl}/semantic-match`,
        {
          resume_skills: normalizedResumeSkills,
          job_skills: normalizedJobSkills,
          threshold: 0.5,
        },
        { timeout: 15000 }
      );

      return {
        matchScore: semResponse.data?.matchScore ?? 0,
        method: semResponse.data?.modelUsed || 'semantic',
      };
    } catch (err) {
      console.warn(`[Eval] Semantic match failed, using keyword fallback: ${err.message}`);
    }
  }

  const result = compareSkills(normalizedResumeSkills, normalizedJobSkills);
  return { matchScore: result.matchScore ?? 0, method: 'keyword-fallback' };
}

async function findJdTextForCase({ caseId, jdDir }) {
  const entries = await fs.readdir(jdDir);
  const fileName = entries.find(
    (n) => n.startsWith(`${caseId}_`) && n.toLowerCase().endsWith('.txt')
  );

  if (!fileName) {
    throw new Error(`No JD .txt found for ${caseId} in ${jdDir}`);
  }

  const fullPath = path.join(jdDir, fileName);
  return fs.readFile(fullPath, 'utf8');
}

async function loadJdMapFromCsv(jdCsvPath) {
  const csvText = await fs.readFile(jdCsvPath, 'utf8');
  const { headers, rows } = csvParse(csvText);

  const titleHeader = headers.find((h) => String(h).trim().toLowerCase() === 'job title') || 'Job Title';
  const descHeader = headers.find((h) => String(h).trim().toLowerCase() === 'job description') || 'Job Description';

  // Typical file shape: "",Job Title,Job Description (pandas index column)
  const idHeader =
    headers.find((h) => String(h).trim().toLowerCase() === 'jd_id') ||
    headers.find((h) => String(h).trim().toLowerCase() === 'id') ||
    headers.find((h) => String(h).trim() === '') ||
    headers[0];

  const map = new Map();
  for (const row of rows) {
    const id = toInt(row[idHeader]);
    if (id == null) continue;
    const jdTitle = row[titleHeader] ?? '';
    const jdDescription = row[descHeader] ?? '';
    if (!String(jdDescription).trim()) continue;
    map.set(id, { title: String(jdTitle), description: String(jdDescription) });
  }

  return map;
}

async function findCvPathForRow({ cvDir, selectedCvDir, caseId, cvFile }) {
  const direct = path.join(cvDir, cvFile);
  if (fssync.existsSync(direct)) return direct;

  if (selectedCvDir) {
    const entries = await fs.readdir(selectedCvDir);
    const fileName = entries.find(
      (n) => n.startsWith(`${caseId}_`) && n.toLowerCase().endsWith('.pdf')
    );
    if (fileName) return path.join(selectedCvDir, fileName);
  }

  throw new Error(`CV not found: ${direct}`);
}

function shouldFill(value, force) {
  if (force) return true;
  return !String(value || '').trim();
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(`Usage:\n  node scripts/runEvaluationPack.js --template <csv> --cv-dir <dir> (--jd-dir <dir> | --jd-csv <csv>) [--selected-cv-dir <dir>] [--out <csv>] [--extractor system|keyword|hybrid] [--force]\n\nNotes:\n- Loads backend/.env automatically for GROQ_API_KEY and NLP_SERVICE_URL.\n- Writes in-place by default, and creates a .bak backup on first run.\n- If --jd-csv is provided, it selects the JD row by jd_id from the template.\n- extractor=system: uses extractSkillsWithAI (Groq-first then NLP fallback).\n- extractor=keyword: uses NLP /extract-skills only (higher precision, usually lower recall).\n- extractor=hybrid: keyword-first; if empty, falls back to system extraction.\n`);
    process.exit(0);
  }

  const templatePath = args.template;
  const outPathArg = args.out;
  const cvDir = args['cv-dir'];
  const jdDir = args['jd-dir'];
  const jdCsvPath = args['jd-csv'];
  const selectedCvDir = args['selected-cv-dir'];
  const force = Boolean(args.force);
  const extractor = (args.extractor || 'system').toLowerCase();

  if (!templatePath || !cvDir || (!jdDir && !jdCsvPath)) {
    console.error('Missing required args. Use --help for usage.');
    process.exit(1);
  }

  if (!['system', 'keyword', 'hybrid'].includes(extractor)) {
    console.error(`Invalid --extractor value: ${extractor} (expected system|keyword|hybrid)`);
    process.exit(1);
  }

  const outputPath = outPathArg || templatePath;

  // Load backend env (keys + NLP endpoint)
  dotenv.config({ path: path.join(__dirname, '..', '.env') });

  if (!process.env.NLP_SERVICE_URL) {
    console.warn('[Eval] NLP_SERVICE_URL is not set. Skill extraction may be empty unless GROQ_API_KEY is set.');
  }

  // Backup once
  const backupPath = `${templatePath}.bak`;
  if (!fssync.existsSync(backupPath)) {
    await fs.copyFile(templatePath, backupPath);
    console.log(`[Eval] Backup created: ${backupPath}`);
  }

  const csvText = await fs.readFile(templatePath, 'utf8');
  const { headers, rows } = csvParse(csvText);

  let jdMap = null;
  if (jdCsvPath) {
    jdMap = await loadJdMapFromCsv(jdCsvPath);
    console.log(`[Eval] Loaded JD CSV: ${jdCsvPath} (rows=${jdMap.size})`);
  }

  const requiredCols = ['system_cv_skills', 'system_jd_skills', 'system_match_score'];
  for (const col of requiredCols) {
    if (!headers.includes(col)) {
      throw new Error(`CSV is missing required column: ${col}`);
    }
  }

  for (const row of rows) {
    const caseId = row.case_id;
    const cvFile = row.cv_file;

    const needCv = shouldFill(row.system_cv_skills, force);
    const needJd = shouldFill(row.system_jd_skills, force);
    const needScore = shouldFill(row.system_match_score, force);

    if (!needCv && !needJd && !needScore) {
      console.log(`[Eval] ${caseId}: already filled (skip)`);
      continue;
    }

    console.log(`[Eval] ${caseId}: processing…`);

    let resumeText = '';
    let jdText = '';

    try {
      const cvPath = await findCvPathForRow({ cvDir, selectedCvDir, caseId, cvFile });
      resumeText = await extractTextFromFile(cvPath);
    } catch (err) {
      console.warn(`[Eval] ${caseId}: CV text extraction failed: ${err.message}`);
    }

    try {
      if (jdMap) {
        const jdId = toInt(row.jd_id);
        const item = jdId == null ? null : jdMap.get(jdId);
        if (!item) {
          throw new Error(`jd_id ${row.jd_id} not found in JD CSV`);
        }
        jdText = item.description;
      } else {
        jdText = await findJdTextForCase({ caseId, jdDir });
      }
    } catch (err) {
      console.warn(`[Eval] ${caseId}: JD load failed: ${err.message}`);
    }

    let resumeSkills = [];
    let jdSkills = [];

    try {
      const res = await extractSkillsForText(resumeText, extractor);
      resumeSkills = normalizeOutputSkills(res.skills);
      if (!resumeSkills.length) console.warn(`[Eval] ${caseId}: no CV skills extracted (source=${res.source})`);
    } catch (err) {
      console.warn(`[Eval] ${caseId}: CV skill extraction failed: ${err.message}`);
    }

    try {
      const res = await extractSkillsForText(jdText, extractor);
      jdSkills = normalizeOutputSkills(res.skills);
      if (!jdSkills.length) console.warn(`[Eval] ${caseId}: no JD skills extracted (source=${res.source})`);
    } catch (err) {
      console.warn(`[Eval] ${caseId}: JD skill extraction failed: ${err.message}`);
    }

    let matchScore = 0;
    try {
      const match = await semanticMatchOrKeywordFallback(resumeSkills, jdSkills);
      matchScore = match.matchScore;
      console.log(`[Eval] ${caseId}: matchScore=${matchScore} (${match.method})`);
    } catch (err) {
      console.warn(`[Eval] ${caseId}: match score failed: ${err.message}`);
    }

    if (needCv) row.system_cv_skills = resumeSkills.join(', ');
    if (needJd) row.system_jd_skills = jdSkills.join(', ');
    if (needScore) row.system_match_score = String(matchScore);
  }

  const outText = csvStringify(headers, rows);

  try {
    await fs.writeFile(outputPath, outText, 'utf8');
    console.log(`[Eval] Updated CSV written: ${outputPath}`);
  } catch (err) {
    // Windows frequently locks open CSVs (Excel, sometimes VS Code extensions).
    if (outputPath === templatePath && (err.code === 'EBUSY' || err.code === 'EPERM')) {
      const fallbackPath = templatePath.replace(/\.csv$/i, '.system.csv');
      await fs.writeFile(fallbackPath, outText, 'utf8');
      console.warn(`[Eval] Could not overwrite locked template. Wrote fallback instead: ${fallbackPath}`);
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
