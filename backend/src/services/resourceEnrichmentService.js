/**
 * Resource Enrichment Service
 * 
 * Strategy (3-layer):
 *  1. Curated map  — real, verified URLs for 80+ common skills (instant, no API cost)
 *  2. Gemini AI    — for any skill NOT in the curated map  (free tier, gemini-2.0-flash)
 *  3. Search fallback — always-working YouTube / Google search URLs if AI fails / no key set
 * 
 * Resources are returned as: { name, url, type }
 * type: 'documentation' | 'tutorial' | 'video' | 'course' | 'article'
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── In-memory cache  (skill → resources[]) ──────────────────────────────────
const resourceCache = new Map();

// ─── 1. CURATED RESOURCE MAP  (real, verified URLs) ─────────────────────────
const CURATED_RESOURCES = {
  // ── Languages ───────────────────────────────────────────────────────────────
  python: [
    { name: 'Official Python Documentation', url: 'https://docs.python.org/3/', type: 'documentation' },
    { name: 'Python Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=rfscVS0vtbw', type: 'video' },
    { name: 'Real Python Tutorials', url: 'https://realpython.com/', type: 'tutorial' },
    { name: 'Automate the Boring Stuff with Python (Free Book)', url: 'https://automatetheboringstuff.com/', type: 'tutorial' },
  ],
  javascript: [
    { name: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', type: 'documentation' },
    { name: 'JavaScript.info – The Modern JavaScript Tutorial', url: 'https://javascript.info/', type: 'tutorial' },
    { name: 'JavaScript Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=jS4aFq5-91M', type: 'video' },
    { name: 'Eloquent JavaScript (Free Book)', url: 'https://eloquentjavascript.net/', type: 'tutorial' },
  ],
  typescript: [
    { name: 'Official TypeScript Documentation', url: 'https://www.typescriptlang.org/docs/', type: 'documentation' },
    { name: 'TypeScript Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=30LWjhZzg50', type: 'video' },
    { name: 'TypeScript Deep Dive (Free Book)', url: 'https://basarat.gitbook.io/typescript/', type: 'tutorial' },
  ],
  java: [
    { name: 'Official Java Tutorials – Oracle', url: 'https://docs.oracle.com/javase/tutorial/', type: 'documentation' },
    { name: 'Java Full Course – Programming with Mosh (YouTube)', url: 'https://www.youtube.com/watch?v=eIrMbAQSU34', type: 'video' },
    { name: 'Baeldung Java Guides', url: 'https://www.baeldung.com/', type: 'tutorial' },
  ],
  'c++': [
    { name: 'cppreference.com (C++ Reference)', url: 'https://en.cppreference.com/w/', type: 'documentation' },
    { name: 'C++ Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y', type: 'video' },
    { name: 'learncpp.com – Free C++ Tutorial', url: 'https://www.learncpp.com/', type: 'tutorial' },
  ],
  'c#': [
    { name: 'Official C# Documentation – Microsoft', url: 'https://learn.microsoft.com/en-us/dotnet/csharp/', type: 'documentation' },
    { name: 'C# Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=GhQdlIFylQ8', type: 'video' },
    { name: 'C# Corner Tutorials', url: 'https://www.c-sharpcorner.com/', type: 'tutorial' },
  ],
  go: [
    { name: 'Official Go Documentation', url: 'https://go.dev/doc/', type: 'documentation' },
    { name: 'A Tour of Go (Interactive)', url: 'https://go.dev/tour/welcome/1', type: 'tutorial' },
    { name: 'Go Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=YS4e4q9oBaU', type: 'video' },
  ],
  golang: [
    { name: 'Official Go Documentation', url: 'https://go.dev/doc/', type: 'documentation' },
    { name: 'A Tour of Go (Interactive)', url: 'https://go.dev/tour/welcome/1', type: 'tutorial' },
    { name: 'Go Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=YS4e4q9oBaU', type: 'video' },
  ],
  rust: [
    { name: 'The Rust Programming Language Book (Free)', url: 'https://doc.rust-lang.org/book/', type: 'tutorial' },
    { name: 'Official Rust Documentation', url: 'https://www.rust-lang.org/learn', type: 'documentation' },
    { name: 'Rust Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=zF34dRivLOw', type: 'video' },
  ],
  ruby: [
    { name: 'Official Ruby Documentation', url: 'https://ruby-doc.org/', type: 'documentation' },
    { name: 'The Odin Project – Ruby Path', url: 'https://www.theodinproject.com/paths/full-stack-ruby-on-rails', type: 'tutorial' },
    { name: 'Ruby Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=t_ispmWmdjY', type: 'video' },
  ],
  php: [
    { name: 'Official PHP Documentation', url: 'https://www.php.net/docs.php', type: 'documentation' },
    { name: 'PHP Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=OK_JCtrrv-c', type: 'video' },
    { name: 'PHP.net Manual', url: 'https://www.php.net/manual/en/', type: 'documentation' },
  ],
  swift: [
    { name: 'Official Swift Documentation – Apple', url: 'https://developer.apple.com/documentation/swift', type: 'documentation' },
    { name: 'Swift Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=8Xg7E9shq0U', type: 'video' },
    { name: 'Hacking with Swift (Free)', url: 'https://www.hackingwithswift.com/', type: 'tutorial' },
  ],
  kotlin: [
    { name: 'Official Kotlin Documentation', url: 'https://kotlinlang.org/docs/home.html', type: 'documentation' },
    { name: 'Kotlin Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=F9UC9DY-vIU', type: 'video' },
    { name: 'Kotlin by JetBrains – Interactive Koans', url: 'https://play.kotlinlang.org/koans/overview', type: 'tutorial' },
  ],
  r: [
    { name: 'R for Data Science (Free Book)', url: 'https://r4ds.had.co.nz/', type: 'tutorial' },
    { name: 'CRAN R Manuals', url: 'https://cran.r-project.org/manuals.html', type: 'documentation' },
    { name: 'R Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=_V8eKsto3Ug', type: 'video' },
  ],
  scala: [
    { name: 'Official Scala Documentation', url: 'https://docs.scala-lang.org/', type: 'documentation' },
    { name: 'Scala Exercises (Interactive)', url: 'https://www.scala-exercises.org/', type: 'tutorial' },
  ],

  // ── Web / Frontend ──────────────────────────────────────────────────────────
  html: [
    { name: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', type: 'documentation' },
    { name: 'HTML Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=pQN-pnXPaVg', type: 'video' },
    { name: 'W3Schools HTML Tutorial', url: 'https://www.w3schools.com/html/', type: 'tutorial' },
  ],
  css: [
    { name: 'MDN CSS Reference', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', type: 'documentation' },
    { name: 'CSS Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=OXGznpKZ_sA', type: 'video' },
    { name: 'CSS-Tricks', url: 'https://css-tricks.com/', type: 'tutorial' },
  ],
  react: [
    { name: 'Official React Documentation', url: 'https://react.dev/', type: 'documentation' },
    { name: 'React Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', type: 'video' },
    { name: 'Scrimba – Learn React (Interactive)', url: 'https://scrimba.com/learn/learnreact', type: 'course' },
  ],
  'react.js': [
    { name: 'Official React Documentation', url: 'https://react.dev/', type: 'documentation' },
    { name: 'React Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=bMknfKXIFA8', type: 'video' },
  ],
  vue: [
    { name: 'Official Vue.js Documentation', url: 'https://vuejs.org/guide/introduction.html', type: 'documentation' },
    { name: 'Vue.js Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=FXpIoQ_rT_c', type: 'video' },
  ],
  'vue.js': [
    { name: 'Official Vue.js Documentation', url: 'https://vuejs.org/guide/introduction.html', type: 'documentation' },
    { name: 'Vue.js Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=FXpIoQ_rT_c', type: 'video' },
  ],
  angular: [
    { name: 'Official Angular Documentation', url: 'https://angular.dev/', type: 'documentation' },
    { name: 'Angular Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=3dHNOWTI7H8', type: 'video' },
  ],
  'next.js': [
    { name: 'Official Next.js Documentation', url: 'https://nextjs.org/docs', type: 'documentation' },
    { name: 'Next.js Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=wm5gMKuwSYk', type: 'video' },
    { name: 'Next.js Learn – Interactive Course', url: 'https://nextjs.org/learn', type: 'course' },
  ],
  nextjs: [
    { name: 'Official Next.js Documentation', url: 'https://nextjs.org/docs', type: 'documentation' },
    { name: 'Next.js Learn – Interactive Course', url: 'https://nextjs.org/learn', type: 'course' },
  ],
  svelte: [
    { name: 'Official Svelte Documentation', url: 'https://svelte.dev/docs', type: 'documentation' },
    { name: 'Svelte Tutorial (Interactive)', url: 'https://learn.svelte.dev/', type: 'tutorial' },
  ],
  tailwind: [
    { name: 'Official Tailwind CSS Documentation', url: 'https://tailwindcss.com/docs', type: 'documentation' },
    { name: 'Tailwind CSS Full Course (YouTube)', url: 'https://www.youtube.com/watch?v=UBOj6rqRUME', type: 'video' },
  ],
  'tailwind css': [
    { name: 'Official Tailwind CSS Documentation', url: 'https://tailwindcss.com/docs', type: 'documentation' },
    { name: 'Tailwind CSS Full Course (YouTube)', url: 'https://www.youtube.com/watch?v=UBOj6rqRUME', type: 'video' },
  ],

  // ── Backend / Frameworks ────────────────────────────────────────────────────
  'node.js': [
    { name: 'Official Node.js Documentation', url: 'https://nodejs.org/en/docs', type: 'documentation' },
    { name: 'Node.js Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', type: 'video' },
    { name: 'The Odin Project – NodeJS Path', url: 'https://www.theodinproject.com/paths/full-stack-javascript/courses/nodejs', type: 'tutorial' },
  ],
  nodejs: [
    { name: 'Official Node.js Documentation', url: 'https://nodejs.org/en/docs', type: 'documentation' },
    { name: 'Node.js Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Oe421EPjeBE', type: 'video' },
  ],
  express: [
    { name: 'Official Express.js Documentation', url: 'https://expressjs.com/en/guide/routing.html', type: 'documentation' },
    { name: 'Express.js Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=SccSCuHhOw0', type: 'video' },
  ],
  'express.js': [
    { name: 'Official Express.js Documentation', url: 'https://expressjs.com/', type: 'documentation' },
    { name: 'Express.js Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=SccSCuHhOw0', type: 'video' },
  ],
  django: [
    { name: 'Official Django Documentation', url: 'https://docs.djangoproject.com/en/stable/', type: 'documentation' },
    { name: 'Django Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=F5mRW0jo-U4', type: 'video' },
    { name: 'Django Girls Tutorial (Beginner)', url: 'https://tutorial.djangogirls.org/', type: 'tutorial' },
  ],
  flask: [
    { name: 'Official Flask Documentation', url: 'https://flask.palletsprojects.com/en/stable/', type: 'documentation' },
    { name: 'Flask Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Qr4QMBUPxWo', type: 'video' },
  ],
  fastapi: [
    { name: 'Official FastAPI Documentation', url: 'https://fastapi.tiangolo.com/', type: 'documentation' },
    { name: 'FastAPI Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=0sOvCWFmrtA', type: 'video' },
  ],
  'spring boot': [
    { name: 'Official Spring Boot Documentation', url: 'https://docs.spring.io/spring-boot/docs/current/reference/html/', type: 'documentation' },
    { name: 'Spring Boot Full Course – Amigoscode (YouTube)', url: 'https://www.youtube.com/watch?v=9SGDpanrc8U', type: 'video' },
  ],
  laravel: [
    { name: 'Official Laravel Documentation', url: 'https://laravel.com/docs', type: 'documentation' },
    { name: 'Laravel Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=ImtZ5yENzgE', type: 'video' },
  ],
  graphql: [
    { name: 'Official GraphQL Documentation', url: 'https://graphql.org/learn/', type: 'documentation' },
    { name: 'GraphQL Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=ed8SzALpx1Q', type: 'video' },
  ],

  // ── Databases ──────────────────────────────────────────────────────────────
  sql: [
    { name: 'W3Schools SQL Tutorial', url: 'https://www.w3schools.com/sql/', type: 'tutorial' },
    { name: 'SQL Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', type: 'video' },
    { name: 'Mode SQL Tutorial', url: 'https://mode.com/sql-tutorial/', type: 'tutorial' },
  ],
  mysql: [
    { name: 'Official MySQL Documentation', url: 'https://dev.mysql.com/doc/', type: 'documentation' },
    { name: 'MySQL Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=7S_tz1z_5bA', type: 'video' },
  ],
  postgresql: [
    { name: 'Official PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/', type: 'documentation' },
    { name: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com/', type: 'tutorial' },
    { name: 'PostgreSQL Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=qw--VYLpxG4', type: 'video' },
  ],
  mongodb: [
    { name: 'Official MongoDB Documentation', url: 'https://www.mongodb.com/docs/', type: 'documentation' },
    { name: 'MongoDB University (Free Courses)', url: 'https://learn.mongodb.com/', type: 'course' },
    { name: 'MongoDB Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=-56x56UppqQ', type: 'video' },
  ],
  redis: [
    { name: 'Official Redis Documentation', url: 'https://redis.io/docs/', type: 'documentation' },
    { name: 'Redis University (Free)', url: 'https://university.redis.com/', type: 'course' },
    { name: 'Redis Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=jgpVdJB2sKQ', type: 'video' },
  ],
  elasticsearch: [
    { name: 'Official Elasticsearch Documentation', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html', type: 'documentation' },
    { name: 'Elasticsearch Crash Course (YouTube)', url: 'https://www.youtube.com/watch?v=C3tlMqaNSaI', type: 'video' },
  ],
  firebase: [
    { name: 'Official Firebase Documentation', url: 'https://firebase.google.com/docs', type: 'documentation' },
    { name: 'Firebase Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=9bEd7LYQ3wI', type: 'video' },
  ],

  // ── DevOps / Cloud ─────────────────────────────────────────────────────────
  git: [
    { name: 'Official Git Documentation', url: 'https://git-scm.com/doc', type: 'documentation' },
    { name: 'Pro Git Book (Free)', url: 'https://git-scm.com/book/en/v2', type: 'tutorial' },
    { name: 'Git & GitHub Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=SWYqp7iY_Tc', type: 'video' },
  ],
  docker: [
    { name: 'Official Docker Documentation', url: 'https://docs.docker.com/', type: 'documentation' },
    { name: 'Docker Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo', type: 'video' },
    { name: 'Play with Docker (Interactive Lab)', url: 'https://labs.play-with-docker.com/', type: 'tutorial' },
  ],
  kubernetes: [
    { name: 'Official Kubernetes Documentation', url: 'https://kubernetes.io/docs/home/', type: 'documentation' },
    { name: 'Kubernetes Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=X48VuDVv0do', type: 'video' },
    { name: 'Kubernetes Interactive Tutorial', url: 'https://kubernetes.io/docs/tutorials/', type: 'tutorial' },
  ],
  aws: [
    { name: 'AWS Documentation', url: 'https://docs.aws.amazon.com/', type: 'documentation' },
    { name: 'AWS Skill Builder (Free Training)', url: 'https://skillbuilder.aws/', type: 'course' },
    { name: 'AWS Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=a9__D53WsMs', type: 'video' },
  ],
  azure: [
    { name: 'Official Azure Documentation – Microsoft', url: 'https://learn.microsoft.com/en-us/azure/', type: 'documentation' },
    { name: 'Microsoft Learn – Azure (Free)', url: 'https://learn.microsoft.com/en-us/training/azure/', type: 'course' },
    { name: 'Azure Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=NKEFWyqJ5XA', type: 'video' },
  ],
  gcp: [
    { name: 'Official GCP Documentation – Google', url: 'https://cloud.google.com/docs', type: 'documentation' },
    { name: 'Google Cloud Skills Boost (Free)', url: 'https://www.cloudskillsboost.google/', type: 'course' },
  ],
  'google cloud': [
    { name: 'Official GCP Documentation – Google', url: 'https://cloud.google.com/docs', type: 'documentation' },
    { name: 'Google Cloud Skills Boost (Free)', url: 'https://www.cloudskillsboost.google/', type: 'course' },
  ],
  terraform: [
    { name: 'Official Terraform Documentation', url: 'https://developer.hashicorp.com/terraform/docs', type: 'documentation' },
    { name: 'Terraform Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=SLB_c_ayRMo', type: 'video' },
  ],
  'ci/cd': [
    { name: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions', type: 'documentation' },
    { name: 'CI/CD Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=R8_veQiYBjI', type: 'video' },
  ],
  jenkins: [
    { name: 'Official Jenkins Documentation', url: 'https://www.jenkins.io/doc/', type: 'documentation' },
    { name: 'Jenkins Full Course – Simplilearn (YouTube)', url: 'https://www.youtube.com/watch?v=FX322RVNGj4', type: 'video' },
  ],
  linux: [
    { name: 'The Linux Command Line Book (Free)', url: 'https://linuxcommand.org/tlcl.php', type: 'tutorial' },
    { name: 'Linux Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=sWbUDq4S6Y8', type: 'video' },
    { name: 'OverTheWire: Bandit (Learn Linux by Playing)', url: 'https://overthewire.org/wargames/bandit/', type: 'tutorial' },
  ],
  bash: [
    { name: 'Bash Reference Manual – GNU', url: 'https://www.gnu.org/software/bash/manual/bash.html', type: 'documentation' },
    { name: 'Bash Scripting Full Course – Joe Collins (YouTube)', url: 'https://www.youtube.com/watch?v=e7BufAVwDiM', type: 'video' },
    { name: 'The Shell Scripting Tutorial', url: 'https://www.shellscript.sh/', type: 'tutorial' },
  ],

  // ── AI / ML / Data Science ─────────────────────────────────────────────────
  'machine learning': [
    { name: 'Google ML Crash Course (Free)', url: 'https://developers.google.com/machine-learning/crash-course', type: 'course' },
    { name: 'Machine Learning – Andrew Ng (Coursera)', url: 'https://www.coursera.org/learn/machine-learning', type: 'course' },
    { name: 'Scikit-Learn Documentation', url: 'https://scikit-learn.org/stable/user_guide.html', type: 'documentation' },
    { name: 'Machine Learning Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=NWONeJKn6kc', type: 'video' },
  ],
  'deep learning': [
    { name: 'Deep Learning Specialization – Andrew Ng (Coursera)', url: 'https://www.coursera.org/specializations/deep-learning', type: 'course' },
    { name: 'fast.ai – Practical Deep Learning for Coders (Free)', url: 'https://course.fast.ai/', type: 'course' },
    { name: 'Deep Learning Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=VyWAvY2CF9c', type: 'video' },
  ],
  tensorflow: [
    { name: 'Official TensorFlow Documentation', url: 'https://www.tensorflow.org/learn', type: 'documentation' },
    { name: 'TensorFlow Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=tPYj3fFJGjk', type: 'video' },
    { name: 'TensorFlow Tutorials', url: 'https://www.tensorflow.org/tutorials', type: 'tutorial' },
  ],
  pytorch: [
    { name: 'Official PyTorch Documentation', url: 'https://pytorch.org/docs/stable/index.html', type: 'documentation' },
    { name: 'PyTorch Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=V_xro1bcAuA', type: 'video' },
    { name: 'PyTorch Tutorials (Official)', url: 'https://pytorch.org/tutorials/', type: 'tutorial' },
  ],
  'scikit-learn': [
    { name: 'Official Scikit-Learn Documentation', url: 'https://scikit-learn.org/stable/user_guide.html', type: 'documentation' },
    { name: 'Scikit-Learn Tutorials', url: 'https://scikit-learn.org/stable/tutorial/index.html', type: 'tutorial' },
  ],
  pandas: [
    { name: 'Official Pandas Documentation', url: 'https://pandas.pydata.org/docs/', type: 'documentation' },
    { name: 'Pandas Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=vmEHCJofslg', type: 'video' },
    { name: 'Pandas User Guide', url: 'https://pandas.pydata.org/docs/user_guide/index.html', type: 'tutorial' },
  ],
  numpy: [
    { name: 'Official NumPy Documentation', url: 'https://numpy.org/doc/stable/', type: 'documentation' },
    { name: 'NumPy Crash Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=QUT1VHiLmmI', type: 'video' },
  ],
  matplotlib: [
    { name: 'Official Matplotlib Documentation', url: 'https://matplotlib.org/stable/users/index', type: 'documentation' },
    { name: 'Matplotlib Tutorial – Corey Schafer (YouTube)', url: 'https://www.youtube.com/watch?v=UO98lJQ3QGI', type: 'video' },
  ],
  nlp: [
    { name: 'Hugging Face NLP Course (Free)', url: 'https://huggingface.co/learn/nlp-course/chapter1/1', type: 'course' },
    { name: 'spaCy Documentation', url: 'https://spacy.io/usage', type: 'documentation' },
    { name: 'NLP Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=X2vAabgKiuM', type: 'video' },
  ],
  spacy: [
    { name: 'Official spaCy Documentation', url: 'https://spacy.io/usage', type: 'documentation' },
    { name: 'Advanced NLP with spaCy (Free Interactive Course)', url: 'https://course.spacy.io/en/', type: 'course' },
  ],
  'data science': [
    { name: 'Kaggle Learn (Free)', url: 'https://www.kaggle.com/learn', type: 'course' },
    { name: 'Data Science Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=ua-CiDNNj30', type: 'video' },
    { name: 'IBM Data Science – Coursera (Audit Free)', url: 'https://www.coursera.org/professional-certificates/ibm-data-science', type: 'course' },
  ],

  // ── Security ────────────────────────────────────────────────────────────────
  cybersecurity: [
    { name: 'TryHackMe – Learn Cybersecurity (Free)', url: 'https://tryhackme.com/', type: 'course' },
    { name: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', type: 'documentation' },
    { name: 'Cybersecurity Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=hXSFdwIOfnE', type: 'video' },
  ],

  // ── System Design ──────────────────────────────────────────────────────────
  'system design': [
    { name: 'System Design Primer (GitHub)', url: 'https://github.com/donnemartin/system-design-primer', type: 'tutorial' },
    { name: 'System Design Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=m8Icp_Cid5o', type: 'video' },
  ],

  // ── APIs ───────────────────────────────────────────────────────────────────
  'rest api': [
    { name: 'RESTful API Design Best Practices', url: 'https://restfulapi.net/', type: 'tutorial' },
    { name: 'REST API Tutorial – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=Q-BpqyOT3a8', type: 'video' },
  ],
  'api design': [
    { name: 'RESTful API Design Best Practices', url: 'https://restfulapi.net/', type: 'tutorial' },
    { name: 'API Design Guide – Google Cloud', url: 'https://cloud.google.com/apis/design', type: 'documentation' },
  ],

  // ── Testing ────────────────────────────────────────────────────────────────
  jest: [
    { name: 'Official Jest Documentation', url: 'https://jestjs.io/docs/getting-started', type: 'documentation' },
    { name: 'Jest Crash Course – Traversy Media (YouTube)', url: 'https://www.youtube.com/watch?v=7r4xVDI2vho', type: 'video' },
  ],
  testing: [
    { name: 'The Odin Project – Testing (JavaScript)', url: 'https://www.theodinproject.com/lessons/node-path-javascript-testing-basics', type: 'tutorial' },
    { name: 'Software Testing Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=u6QfIXgjwGQ', type: 'video' },
  ],

  // ── Mobile ─────────────────────────────────────────────────────────────────
  'react native': [
    { name: 'Official React Native Documentation', url: 'https://reactnative.dev/docs/getting-started', type: 'documentation' },
    { name: 'React Native Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=0-S5a0eXPoc', type: 'video' },
  ],
  flutter: [
    { name: 'Official Flutter Documentation', url: 'https://docs.flutter.dev/', type: 'documentation' },
    { name: 'Flutter Full Course – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=VPvVD8t02U8', type: 'video' },
    { name: 'Flutter Codelabs', url: 'https://docs.flutter.dev/codelabs', type: 'tutorial' },
  ],

  // ── Soft/generic ───────────────────────────────────────────────────────────
  'problem solving': [
    { name: 'LeetCode (Practice Problems)', url: 'https://leetcode.com/problemset/all/', type: 'tutorial' },
    { name: 'HackerRank (Problem Solving Track)', url: 'https://www.hackerrank.com/domains/tutorials/10-days-of-javascript', type: 'tutorial' },
  ],
  algorithms: [
    { name: 'Algorithm Visualizer', url: 'https://algorithm-visualizer.org/', type: 'tutorial' },
    { name: 'Algorithms – Abdul Bari (YouTube)', url: 'https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O', type: 'video' },
    { name: 'LeetCode (Practice)', url: 'https://leetcode.com/', type: 'tutorial' },
  ],
  'data structures': [
    { name: 'Data Structures – freeCodeCamp (YouTube)', url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM', type: 'video' },
    { name: 'Visualgo – Data Structure Visualizer', url: 'https://visualgo.net/en', type: 'tutorial' },
  ],
};

// ─── Alias normalization (maps variants to a canonical key) ──────────────────
const ALIAS_MAP = {
  'node': 'node.js',
  'reactjs': 'react',
  'vuejs': 'vue',
  'pytorch': 'pytorch',
  'sklearn': 'scikit-learn',
  'postgres': 'postgresql',
  'pg': 'postgresql',
  'tf': 'tensorflow',
  'k8s': 'kubernetes',
  'gh actions': 'ci/cd',
  'github actions': 'ci/cd',
  'shell': 'bash',
  'shell scripting': 'bash',
  'ml': 'machine learning',
  'dl': 'deep learning',
  'ai': 'machine learning',
  'artificial intelligence': 'machine learning',
  'nlp': 'nlp',
  'natural language processing': 'nlp',
};

// ─── 3. Search URL fallback ──────────────────────────────────────────────────
function buildFallbackResources(skill) {
  const encoded = encodeURIComponent(skill);
  return [
    {
      name: `Learn ${skill} – YouTube Search`,
      url: `https://www.youtube.com/results?search_query=${encoded}+tutorial+for+beginners`,
      type: 'video',
    },
    {
      name: `${skill} Official Documentation – Google Search`,
      url: `https://www.google.com/search?q=${encoded}+official+documentation`,
      type: 'documentation',
    },
    {
      name: `${skill} Free Course – freeCodeCamp`,
      url: `https://www.freecodecamp.org/news/search/?query=${encoded}`,
      type: 'course',
    },
  ];
}

// ─── 2. Groq AI lookup ──────────────────────────────────────────────────────
async function fetchResourcesFromGemini(skill) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null; // No key configured → skip to fallback
  }

  try {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey });

    const prompt = `You are a helpful assistant. For learning the technical skill "${skill}", provide exactly 3 learning resources.
Return ONLY a valid JSON array (no extra text, no markdown, no explanation) in this format:
[
  { "name": "Resource Title", "url": "https://actual-url.com/page", "type": "documentation" },
  { "name": "Resource Title", "url": "https://actual-url.com/page", "type": "video" },
  { "name": "Resource Title", "url": "https://actual-url.com/page", "type": "course" }
]
Type must be one of: documentation, tutorial, video, course, article.
Only include URLs you are highly confident are real and publicly accessible (e.g., official docs, YouTube, Coursera, freeCodeCamp, MDN).`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    const text = completion.choices[0]?.message?.content?.trim() || '';

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate each resource has name, url, type
      return parsed.filter(r => r.name && r.url && r.type && r.url.startsWith('http'));
    }
    return null;
  } catch (err) {
    // Silently fail — will use fallback
    console.warn(`[ResourceEnrichment] Groq lookup failed for "${skill}":`, err.message);
    return null;
  }
}

// ─── Main export: getResourcesForSkill(skill) → Promise<Resource[]> ──────────
async function getResourcesForSkill(skill) {
  const key = skill.toLowerCase().trim();

  // Cache hit
  if (resourceCache.has(key)) {
    return resourceCache.get(key);
  }

  // Resolve alias
  const canonical = ALIAS_MAP[key] || key;

  // Layer 1 — Curated map
  if (CURATED_RESOURCES[canonical]) {
    const resources = CURATED_RESOURCES[canonical];
    resourceCache.set(key, resources);
    return resources;
  }

  // Layer 2 — Gemini AI
  const aiResources = await fetchResourcesFromGemini(skill);
  if (aiResources && aiResources.length > 0) {
    // Append fallback search links as extras (they always work)
    const fallback = buildFallbackResources(skill);
    const combined = [...aiResources, fallback[0]]; // keep AI results + a YouTube search
    resourceCache.set(key, combined);
    return combined;
  }

  // Layer 3 — Search URL fallback
  const fallback = buildFallbackResources(skill);
  resourceCache.set(key, fallback);
  return fallback;
}

module.exports = { getResourcesForSkill };
