from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
import logging

logger = logging.getLogger(__name__)

# ── sentence-transformers (loaded lazily on first request) ──────────────────
_semantic_model = None

def get_semantic_model():
    """Load the sentence-transformer model once and cache it."""
    global _semantic_model
    if _semantic_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence-transformer model 'all-MiniLM-L6-v2'…")
            _semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Semantic model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load semantic model: {e}")
            _semantic_model = None
    return _semantic_model

app = FastAPI(title="NLP Microservice", version="2.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    text: str

class SkillsResponse(BaseModel):
    skills: List[str]

# Common tech skills to extract
SKILL_PATTERNS = {
    # Programming Languages
    'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c++', 'cpp', 'c#', 'csharp',
    'ruby', 'go', 'golang', 'rust', 'swift', 'kotlin', 'php', 'perl', 'scala', 'r',
    
    # Web Technologies
    'html', 'html5', 'css', 'css3', 'react', 'reactjs', 'react.js', 'angular', 'vue', 'vuejs',
    'vue.js', 'svelte', 'nextjs', 'next.js', 'nuxt', 'gatsby', 'jquery', 'bootstrap', 
    'tailwind', 'tailwindcss', 'sass', 'scss', 'less',
    
    # Backend Frameworks
    'nodejs', 'node.js', 'express', 'expressjs', 'django', 'flask', 'fastapi', 'spring',
    'springboot', 'laravel', 'rails', 'asp.net', 'dotnet',
    
    # Databases
    'mongodb', 'mysql', 'postgresql', 'postgres', 'redis', 'sqlite', 'oracle', 'mssql',
    'dynamodb', 'cassandra', 'elasticsearch', 'firebase', 'firestore',
    
    # Cloud & DevOps
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'jenkins',
    'gitlab', 'github', 'circleci', 'terraform', 'ansible', 'puppet', 'chef',
    
    # Mobile
    'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic',
    
    # Data Science & ML
    'machine learning', 'ml', 'deep learning', 'ai', 'artificial intelligence',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy',
    'jupyter', 'matplotlib', 'seaborn', 'opencv',
    
    # Tools & Others
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'slack', 'agile',
    'scrum', 'kanban', 'rest', 'restful', 'api', 'graphql', 'websocket', 'microservices',
    'oauth', 'jwt', 'ci/cd', 'tdd', 'bdd', 'unit testing', 'jest', 'mocha', 'pytest',
    'selenium', 'cypress'
}

def extract_skills_from_text(text: str) -> List[str]:
    """
    Extract skills from text using pattern matching and keyword extraction
    """
    text_lower = text.lower()
    found_skills = set()
    
    # Split text into words and phrases
    words = re.findall(r'\b\w+\b', text_lower)
    
    # Check for single word matches
    for word in words:
        if word in SKILL_PATTERNS:
            found_skills.add(word)
    
    # Check for multi-word patterns (like "machine learning", "react native")
    for pattern in SKILL_PATTERNS:
        if ' ' in pattern and pattern in text_lower:
            found_skills.add(pattern)
    
    # Check for common patterns like "React.js" or "Node.js"
    for pattern in SKILL_PATTERNS:
        if '.' in pattern:
            # Also check without the dot
            pattern_no_dot = pattern.replace('.', '')
            if pattern in text_lower or pattern_no_dot in text_lower:
                found_skills.add(pattern)
    
    # Normalize skill names
    skill_map = {
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'ts': 'TypeScript',
        'typescript': 'TypeScript',
        'reactjs': 'React',
        'react.js': 'React',
        'react': 'React',
        'nodejs': 'Node.js',
        'node.js': 'Node.js',
        'vuejs': 'Vue.js',
        'vue.js': 'Vue.js',
        'vue': 'Vue.js',
        'nextjs': 'Next.js',
        'next.js': 'Next.js',
        'mongodb': 'MongoDB',
        'mysql': 'MySQL',
        'postgresql': 'PostgreSQL',
        'postgres': 'PostgreSQL',
        'aws': 'AWS',
        'azure': 'Azure',
        'gcp': 'Google Cloud',
        'google cloud': 'Google Cloud',
        'docker': 'Docker',
        'kubernetes': 'Kubernetes',
        'k8s': 'Kubernetes',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c++': 'C++',
        'csharp': 'C#',
        'c#': 'C#',
        'html': 'HTML',
        'html5': 'HTML5',
        'css': 'CSS',
        'css3': 'CSS3',
        'tailwind': 'Tailwind CSS',
        'tailwindcss': 'Tailwind CSS',
        'git': 'Git',
        'github': 'GitHub',
        'gitlab': 'GitLab',
        'rest': 'REST API',
        'restful': 'REST API',
        'api': 'API',
        'graphql': 'GraphQL',
        'django': 'Django',
        'flask': 'Flask',
        'fastapi': 'FastAPI',
        'express': 'Express.js',
        'expressjs': 'Express.js',
        'ml': 'Machine Learning',
        'machine learning': 'Machine Learning',
        'ai': 'Artificial Intelligence',
        'artificial intelligence': 'Artificial Intelligence',
    }
    
    normalized_skills = []
    for skill in found_skills:
        normalized = skill_map.get(skill, skill.title())
        if normalized not in normalized_skills:
            normalized_skills.append(normalized)
    
    return sorted(normalized_skills)

@app.get("/")
async def root():
    return {"message": "NLP Microservice API", "version": "2.0.0", "features": ["keyword-extraction", "semantic-matching"]}

@app.get("/health")
async def health():
    model_ready = get_semantic_model() is not None
    return {"ok": True, "service": "nlp", "semanticModel": model_ready}


@app.post("/extract-skills", response_model=SkillsResponse)
async def extract_skills(input_data: TextInput):
    """
    Extract technical skills from the provided text using keyword matching.
    This is kept as a reliable fallback. Primary extraction is now done
    via Groq AI in the backend.
    """
    if not input_data.text or len(input_data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text input is required")

    try:
        skills = extract_skills_from_text(input_data.text)
        return SkillsResponse(skills=skills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting skills: {str(e)}")


# ── Schemas for semantic matching ──────────────────────────────────────────
class SemanticMatchInput(BaseModel):
    resume_skills: List[str]
    job_skills: List[str]
    threshold: float = 0.50   # cosine similarity threshold (0–1)

class SemanticMatchEntry(BaseModel):
    jobSkill: str
    matchedWith: str
    score: float
    isExact: bool

class SemanticMatchResponse(BaseModel):
    matchScore: int
    commonSkills: List[str]
    missingSkills: List[str]
    semanticMatches: List[SemanticMatchEntry]
    modelUsed: str


@app.post("/semantic-match", response_model=SemanticMatchResponse)
async def semantic_match(input_data: SemanticMatchInput):
    """
    Compare resume skills vs job skills using transformer embeddings
    (all-MiniLM-L6-v2). Falls back to exact/keyword matching if the
    model is unavailable.
    """
    resume_skills = [s.strip() for s in input_data.resume_skills if s.strip()]
    job_skills    = [s.strip() for s in input_data.job_skills    if s.strip()]
    threshold     = input_data.threshold

    if not job_skills:
        return SemanticMatchResponse(
            matchScore=0, commonSkills=[], missingSkills=[],
            semanticMatches=[], modelUsed="none"
        )
    if not resume_skills:
        return SemanticMatchResponse(
            matchScore=0, commonSkills=[], missingSkills=job_skills,
            semanticMatches=[], modelUsed="none"
        )

    model = get_semantic_model()

    # ── Semantic path ────────────────────────────────────────────────────
    if model is not None:
        try:
            from sentence_transformers import util
            import torch

            resume_emb = model.encode(resume_skills, convert_to_tensor=True, show_progress_bar=False)
            job_emb    = model.encode(job_skills,    convert_to_tensor=True, show_progress_bar=False)

            common_skills: List[str] = []
            missing_skills: List[str] = []
            semantic_matches: List[dict] = []

            for i, job_skill in enumerate(job_skills):
                cos_scores = util.cos_sim(job_emb[i], resume_emb)[0]
                best_idx   = int(cos_scores.argmax())
                best_score = float(cos_scores[best_idx])

                if best_score >= threshold:
                    common_skills.append(job_skill)
                    semantic_matches.append({
                        "jobSkill":   job_skill,
                        "matchedWith": resume_skills[best_idx],
                        "score":      round(best_score, 3),
                        "isExact":    job_skill.lower() == resume_skills[best_idx].lower()
                    })
                else:
                    missing_skills.append(job_skill)

            match_score = round((len(common_skills) / len(job_skills)) * 100)
            return SemanticMatchResponse(
                matchScore=match_score,
                commonSkills=common_skills,
                missingSkills=missing_skills,
                semanticMatches=semantic_matches,
                modelUsed="all-MiniLM-L6-v2"
            )
        except Exception as e:
            logger.error(f"Semantic matching failed, falling back to keyword: {e}")

    # ── Keyword-exact fallback ───────────────────────────────────────────
    resume_lower = {s.lower() for s in resume_skills}
    common_skills  = [s for s in job_skills if s.lower() in resume_lower]
    missing_skills = [s for s in job_skills if s.lower() not in resume_lower]
    match_score    = round((len(common_skills) / len(job_skills)) * 100)

    return SemanticMatchResponse(
        matchScore=match_score,
        commonSkills=common_skills,
        missingSkills=missing_skills,
        semanticMatches=[
            {"jobSkill": s, "matchedWith": s, "score": 1.0, "isExact": True}
            for s in common_skills
        ],
        modelUsed="keyword-fallback"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
