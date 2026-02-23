from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import re

app = FastAPI(title="NLP Microservice", version="1.0.0")

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
    return {"message": "NLP Microservice API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"ok": True, "service": "nlp"}

@app.post("/extract-skills", response_model=SkillsResponse)
async def extract_skills(input_data: TextInput):
    """
    Extract technical skills from the provided text (resume content)
    """
    if not input_data.text or len(input_data.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text input is required")
    
    try:
        skills = extract_skills_from_text(input_data.text)
        return SkillsResponse(skills=skills)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting skills: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
