/**
 * AI-powered skill extraction service
 *
 * Strategy (in priority order):
 *   1. Groq (LLaMA-3.3-70b) — contextual, handles synonyms & unlisted skills
 *   2. NLP microservice       — fast keyword matching fallback
 *   3. Empty array            — never crashes the caller
 */

const Groq = require('groq-sdk');
const axios = require('axios');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are an expert skill extraction AI for career analysis.
Extract ALL technical and professional skills from the given text.
Include: programming languages, frameworks, tools, cloud platforms, databases,
methodologies (Agile, Scrum), and soft skills if clearly stated.
Return ONLY a valid JSON array of skill name strings - no explanation, no markdown, no extra text.
Example output: ["Python", "React", "AWS", "Machine Learning", "Agile"]`;

/**
 * Extract skills using Groq (LLaMA-3.3-70b).
 * Text is truncated to 3 000 chars to stay within token limits.
 * @param {string} text
 * @returns {Promise<string[]>}
 */
async function extractWithGroq(text) {
  const snippet = text.substring(0, 3000);

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Extract skills from this text:\n\n${snippet}` }
    ],
    temperature: 0.1,   // low temperature = deterministic, structured output
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '';

  // Robustly extract the JSON array even if the model adds a preamble
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Groq response did not contain a JSON array');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Groq returned an empty or invalid array');
  }

  return parsed.map(s => String(s).trim()).filter(Boolean);
}

/**
 * Extract skills using the NLP keyword microservice (fallback).
 * @param {string} text
 * @returns {Promise<string[]>}
 */
async function extractWithKeywords(text) {
  const nlpResponse = await axios.post(
    `${process.env.NLP_SERVICE_URL}/extract-skills`,
    { text },
    { timeout: 8000 }
  );

  const skills = nlpResponse.data?.skills;
  if (!Array.isArray(skills)) throw new Error('NLP service returned no skills array');
  return skills;
}

/**
 * Main entry point.
 * Tries Groq first, falls back to NLP keyword service, returns [] on total failure.
 *
 * @param {string} text  — raw resume or job-description text
 * @returns {Promise<{ skills: string[], source: 'groq'|'keyword'|'none' }>}
 */
async function extractSkillsWithAI(text) {
  if (!text || !text.trim()) return { skills: [], source: 'none' };

  // Layer 1: Groq AI 
  if (process.env.GROQ_API_KEY) {
    try {
      const skills = await extractWithGroq(text);
      console.log(`[AI Extractor] Groq extracted ${skills.length} skills`);
      return { skills, source: 'groq' };
    } catch (err) {
      console.warn('[AI Extractor] Groq failed, trying keyword fallback:', err.message);
    }
  }

  // Layer 2: NLP keyword microservice 
  if (process.env.NLP_SERVICE_URL) {
    try {
      const skills = await extractWithKeywords(text);
      console.log(`[AI Extractor] Keyword extracted ${skills.length} skills`);
      return { skills, source: 'keyword' };
    } catch (err) {
      console.warn('[AI Extractor] Keyword fallback also failed:', err.message);
    }
  }

  // Layer 3: Empty Array Fallback
  console.error('[AI Extractor] All extraction methods failed');
  return { skills: [], source: 'none' };
}

module.exports = { extractSkillsWithAI };
