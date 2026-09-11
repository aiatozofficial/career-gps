/**
 * Hover-tooltip descriptions for every option shown during onboarding.
 * Each key maps to a category of options; each value maps an option key
 * to { icon, title, brief, bullets }.
 */

export const descriptions = {
  /* ─── Education / Work Stage ─── */
  stages: {
    CLASS_7_8: {
      icon: "📚",
      title: "Class 7–8",
      brief:
        "You're in middle school — the perfect time to explore what excites you before locking in a stream.",
      bullets: [
        "Discover your interests through hobby projects & clubs",
        "Build a strong foundation in Maths, Science & English",
        "No pressure to pick a career — exploration is the goal",
        "Great age to start basic coding, art, or writing",
      ],
    },
    CLASS_9_10: {
      icon: "🎒",
      title: "Class 9–10",
      brief:
        "Board exams are approaching. Decisions you make here set the stage for 11th-grade streams or diploma paths.",
      bullets: [
        "Choose between CBSE, Inter, or Polytechnic Diploma next",
        "Start thinking about which stream suits you (MPC, BiPC, CEC…)",
        "Competitive exam foundations (NTSE, Olympiads) begin here",
        "Extracurriculars now become resume-worthy later",
      ],
    },
    CLASS_11_12: {
      icon: "🧪",
      title: "Class 11–12",
      brief:
        "You've picked a stream and are preparing for boards + entrance exams. Career direction starts taking shape.",
      bullets: [
        "Board scores + entrance exams decide college options",
        "JEE, NEET, CLAT, NID — this is the prep window",
        "Internships & mini-projects add early differentiation",
        "Your stream narrows possible undergraduate paths",
      ],
    },
    UNDERGRADUATE: {
      icon: "🎓",
      title: "Undergraduate",
      brief:
        "You're in college pursuing a degree. This is where skills, internships, and real-world projects matter most.",
      bullets: [
        "Internships are the #1 differentiator for placements",
        "Build a portfolio or GitHub profile in your field",
        "Campus placements, hackathons & competitions open doors",
        "Decide if you want a job right after or a Master's degree",
      ],
    },
    POSTGRADUATE: {
      icon: "🔬",
      title: "Postgraduate",
      brief:
        "You're pursuing advanced studies — an M.Tech, MBA, MSc, or similar program for specialization.",
      bullets: [
        "Deep specialization in a niche domain",
        "Research papers & thesis work boost credibility",
        "Campus placements often target mid-level roles directly",
        "Strong network-building opportunities with peers & faculty",
      ],
    },
    WORKING: {
      icon: "💼",
      title: "Working Professional",
      brief:
        "You're already in the workforce and looking to upskill, pivot, or accelerate your career growth.",
      bullets: [
        "Upskilling through certifications (cloud, PMP, analytics…)",
        "Career pivots are possible with the right bridge skills",
        "Industry experience gives you an edge in applications",
        "Mentorship & leadership growth become key focus areas",
      ],
    },
  },

  /* ─── Interest Fields ─── */
  fields: {
    TECH: {
      icon: "💻",
      title: "Technology",
      brief:
        "Build software, apps, websites, AI systems, and digital products. Tech is the backbone of every modern industry.",
      bullets: [
        "Roles: Software Engineer, Data Analyst, DevOps, AI/ML Engineer",
        "Key skills: Python, JavaScript, SQL, Cloud, Git",
        "High demand with strong salaries even at entry level",
        "Remote-friendly with global opportunities",
      ],
    },
    SCIENCE: {
      icon: "🔬",
      title: "Science",
      brief:
        "Explore the natural world through research, experiments, and discovery in physics, chemistry, biology, and more.",
      bullets: [
        "Roles: Research Scientist, Lab Analyst, Environmental Consultant",
        "Key skills: Lab techniques, data analysis, scientific writing",
        "Paths lead to R&D, pharma, biotech, or academia",
        "CSIR-NET, GATE, and fellowships open research careers",
      ],
    },
    COMMERCE: {
      icon: "📊",
      title: "Commerce",
      brief:
        "Understand money, markets, and business. Commerce opens doors to finance, accounting, banking, and entrepreneurship.",
      bullets: [
        "Roles: Chartered Accountant, Financial Analyst, Auditor",
        "Key skills: Accounting, Tally, Excel, taxation, analysis",
        "CA, CS, CMA are high-prestige professional certifications",
        "Strong job stability in banking, insurance & consulting",
      ],
    },
    ARTS: {
      icon: "🎨",
      title: "Arts & Humanities",
      brief:
        "Express ideas through writing, media, history, languages, and social sciences. Arts power communication and culture.",
      bullets: [
        "Roles: Content Writer, Journalist, Sociologist, Historian",
        "Key skills: Writing, research, critical thinking, storytelling",
        "Growing demand in content marketing, UX writing, policy",
        "Paths into civil services (UPSC), media, and education",
      ],
    },
    LAW: {
      icon: "⚖️",
      title: "Law",
      brief:
        "Defend rights, draft policies, and argue cases. Law is a prestigious field combining logic, language, and ethics.",
      bullets: [
        "Roles: Advocate, Corporate Lawyer, Legal Researcher, Judge",
        "Key skills: Legal drafting, argumentation, case analysis",
        "CLAT, AILET, LSAT are top entrance exams",
        "Corporate law & IP law offer high-paying specializations",
      ],
    },
    MEDICINE: {
      icon: "🩺",
      title: "Medicine & Healthcare",
      brief:
        "Heal, research, and care for people. Medicine is one of the most respected and in-demand career paths.",
      bullets: [
        "Roles: Doctor, Surgeon, Pharmacist, Public Health Analyst",
        "Key skills: Biology, Chemistry, patient empathy, precision",
        "NEET is the gateway exam for MBBS/BDS in India",
        "Long training (5.5+ years) but immense job security & impact",
      ],
    },
    DESIGN: {
      icon: "✏️",
      title: "Design",
      brief:
        "Shape how things look, feel, and work — from apps and websites to products and spaces.",
      bullets: [
        "Roles: UX Designer, Graphic Designer, Product Designer",
        "Key skills: Figma, prototyping, color theory, user research",
        "NID, NIFT, UCEED are top design entrance exams in India",
        "Booming demand in tech startups and digital agencies",
      ],
    },
    OTHER: {
      icon: "🌍",
      title: "Other / Exploring",
      brief:
        "Not sure where you fit? That's perfectly fine — many successful people explored before choosing their path.",
      bullets: [
        "Career GPS will generate a broad exploratory roadmap",
        "You'll discover fields through skill-building activities",
        "No wrong answer — exploration is a valid strategy",
        "You can always come back and refine your field later",
      ],
    },
  },

  /* ─── 10th-Grade Path ─── */
  tenthPaths: {
    CBSE: {
      icon: "📖",
      title: "CBSE (11th & 12th)",
      brief:
        "Continue in the CBSE board with a traditional 11th–12th pathway before entering undergraduate studies.",
      bullets: [
        "Choose MPC, BiPC, CEC, or Humanities streams",
        "Gives access to JEE, NEET, CLAT and other national exams",
        "Most common route for engineering & medical aspirants",
        "2-year program with board exams at the end",
      ],
    },
    INTER: {
      icon: "🏫",
      title: "Intermediate Junior College",
      brief:
        "Join a state-board Intermediate college (common in AP, Telangana, etc.) for a focused 2-year program.",
      bullets: [
        "State board syllabus aligned with EAMCET, TS-POLYCET, etc.",
        "Strong coaching ecosystem for competitive exams",
        "Popular in Southern & Eastern Indian states",
        "Same 2-year duration, different board & exam ecosystem",
      ],
    },
    DIPLOMA: {
      icon: "🔧",
      title: "Polytechnic Diploma (3 Years)",
      brief:
        "A hands-on, skill-focused 3-year program that leads directly to jobs or lateral entry into engineering.",
      bullets: [
        "Learn practical, industry-ready technical skills",
        "Can enter B.Tech directly in 2nd year (lateral entry)",
        "Great for students who prefer learning by doing",
        "Shorter path to employment compared to 11th + 12th + degree",
      ],
    },
  },
  
  /* ─── 11th/12th-Grade Stream Electives ─── */
  streamElectives: {
    MPC: {
      icon: "📐",
      title: "MPC (Maths, Physics, Chemistry)",
      brief: "The classic Science stream — perfect for students aiming for Engineering, Physics, Computer Science, or Mathematics.",
      bullets: [
        "Prepares you for JEE Main & Advanced, BITSAT, and state engineering tests",
        "Essential for careers in Software, Robotics, Civil, or Aeronautical Engineering",
        "Builds strong logical reasoning and quantitative analysis skills",
        "Highly versatile foundation for future technical specializations",
      ],
    },
    BiPC: {
      icon: "🧬",
      title: "BiPC (Biology, Physics, Chemistry)",
      brief: "The Medicine/Life Sciences stream — essential for students aiming to become Doctors, Dentists, Pharmacists, or Biologists.",
      bullets: [
        "Prepares you for NEET, pharmacy admissions, and biotechnology tracks",
        "Essential for MBBS, BDS, Nursing, B.Pharm, or Genetics degrees",
        "Deep study of human anatomy, plant physiology, and organic chemistry",
        "Requires strong memory and genuine dedication to helping others",
      ],
    },
    "MEC / CEC": {
      icon: "💼",
      title: "MEC / CEC",
      brief: "The Commerce and Business stream — perfect for students aiming for Finance, Business Admin, Chartered Accountancy, or Economics.",
      bullets: [
        "Combines Mathematics or Civics with Economics and Commerce",
        "Great foundation for CA, CS, B.Com, BBA, and economics honors degrees",
        "Prepares you for corporate, banking, auditing, and marketing domains",
        "Excellent analytical mindset for investments, budgeting, and startups",
      ],
    },
    "HEC / Humanities": {
      icon: "⚖️",
      title: "HEC / Humanities",
      brief: "The Arts and Humanities stream — perfect for students aiming for Law, Public Policy, Journalism, Design, or Civil Services.",
      bullets: [
        "Combines History, Economics, and Civics/Political Science",
        "Excellent preparation for CLAT (Law) and UPSC Civil Services exam",
        "Builds critical writing, case analysis, and argumentation skills",
        "Prepares you for media, diplomacy, social sciences, and design careers",
      ],
    },
  },

  /* ─── Master's Preference ─── */
  mastersPreference: {
    MS_MTECH: {
      icon: "🔩",
      title: "MS / M.Tech",
      brief:
        "A research-oriented or engineering Master's degree — ideal for deepening technical expertise.",
      bullets: [
        "GATE score is the primary route for M.Tech in IITs/NITs",
        "MS abroad (US, Germany, Canada) requires GRE + TOEFL/IELTS",
        "Opens R&D, AI, robotics, VLSI, and core engineering roles",
        "Thesis-based programs build strong research credentials",
      ],
    },
    MBA: {
      icon: "📈",
      title: "MBA",
      brief:
        "A management degree that opens doors to leadership, consulting, finance, and product management roles.",
      bullets: [
        "CAT, XAT, GMAT are key entrance exams",
        "IIMs, ISB, XLRI are top Indian B-schools",
        "Average starting salary at top schools: ₹20-30 LPA",
        "Best after 2-3 years of work experience",
      ],
    },
    MCA: {
      icon: "🖥️",
      title: "MCA",
      brief:
        "Master of Computer Applications — a pathway into software development if your undergrad wasn't in CS.",
      bullets: [
        "Bridge degree for non-CS graduates entering tech",
        "Covers programming, databases, networking, software engineering",
        "Many NIT/university MCA programs offer good placements",
        "Duration: 2 years (post NIMCET or university entrance)",
      ],
    },
    MSC_MA: {
      icon: "📝",
      title: "M.Sc / M.A.",
      brief:
        "A pure science or arts Master's for academic depth, research careers, or competitive exam prep.",
      bullets: [
        "Ideal for those passionate about a specific subject",
        "Gateway to PhD, UGC-NET, and academic positions",
        "M.Sc in Data Science, Biotech, or Physics are in high demand",
        "M.A. in Economics, Psychology, English have diverse applications",
      ],
    },
    NONE: {
      icon: "🚀",
      title: "No Master's — Direct Jobs",
      brief:
        "Skip postgrad and enter the workforce directly. Many successful professionals never pursued a Master's.",
      bullets: [
        "Save 2-3 years and start earning immediately",
        "Industry experience often outweighs a Master's degree",
        "Certifications (AWS, Google, PMP) can substitute",
        "You can always do a part-time or executive Master's later",
      ],
    },
  },

  /* ─── Goal Types ─── */
  goalTypes: {
    JOB_ROLE: {
      icon: "🏢",
      title: "Target a Job Role",
      brief:
        "You have a specific career role in mind — Career GPS will build a step-by-step path to land that job.",
      bullets: [
        "We'll map skills, certifications & experience you need",
        "Internship → entry-level → mid-level progression",
        "Platform-specific advice (Naukri, Internshala, LinkedIn)",
        "Best for students with a clear career direction",
      ],
    },
    STARTUP: {
      icon: "🚀",
      title: "Build a Startup",
      brief:
        "You want to create something of your own — a product, service, or venture. Entrepreneurial path unlocked.",
      bullets: [
        "We'll cover ideation, MVP building, and launch strategy",
        "Financial planning & bootstrapping guidance",
        "Skill gaps you'll need to fill (marketing, finance, tech)",
        "Best for self-driven students with a problem to solve",
      ],
    },
    HIGHER_STUDIES: {
      icon: "🎓",
      title: "Pursue Higher Studies",
      brief:
        "You want to study further — a Master's, PhD, or professional degree. We'll map the admission journey.",
      bullets: [
        "Entrance exams, application timelines & deadlines",
        "College shortlisting based on your profile",
        "Scholarship & funding opportunities",
        "Best for students wanting academic depth or research",
      ],
    },
    NOT_SURE: {
      icon: "🧭",
      title: "Not Sure Yet",
      brief:
        "That's completely okay. Career GPS will generate an exploratory roadmap to help you discover your direction.",
      bullets: [
        "You'll get a broad skill-building roadmap",
        "Exposure activities to help you discover your interests",
        "No commitments — you can refine your path later",
        "Many successful people started without a clear goal",
      ],
    },
  },

  /* ─── Financial Tiers ─── */
  financialTiers: {
    HIGH: {
      icon: "💎",
      title: "Self-funded",
      brief:
        "You can invest in paid courses, certifications, bootcamps, and premium tools to accelerate your growth.",
      bullets: [
        "Access to premium platforms (Coursera, Udemy, paid certs)",
        "Paid bootcamps & coaching for competitive exams",
        "Ability to attend conferences, workshops & networking events",
        "Roadmap will include both free and paid resources",
      ],
    },
    MEDIUM: {
      icon: "🪙",
      title: "Affordable",
      brief:
        "You prefer a mix of free resources and low-cost courses. Budget-friendly but still investing in growth.",
      bullets: [
        "Affordable Udemy/Coursera courses (₹400-₹2000 range)",
        "Free + freemium tools (GitHub Student Pack, Figma free tier)",
        "Government-subsidized programs (NPTEL, SWAYAM)",
        "Roadmap will prioritize high-value, low-cost options",
      ],
    },
    LOW: {
      icon: "🆓",
      title: "Free Only",
      brief:
        "You rely entirely on free resources and scholarships. Career GPS will focus on zero-cost, high-impact paths.",
      bullets: [
        "100% free platforms: NPTEL, Khan Academy, freeCodeCamp",
        "Scholarship-eligible programs and government schemes",
        "Open-source tools and community-driven learning",
        "Stipend-paying internships via Internshala/Naukri prioritized",
      ],
    },
  },

  /* ─── Preferences / Constraints ─── */
  preferences: {
    "Prefer online": {
      icon: "🌐",
      title: "Prefer Online",
      brief:
        "You learn best through online courses, virtual workshops, and remote internships.",
      bullets: [
        "Roadmap will favor online platforms & remote opportunities",
        "Flexibility to learn at your own pace",
        "Access to global courses from Indian & international institutions",
        "Ideal if you're in a smaller city with limited local options",
      ],
    },
    "Prefer local": {
      icon: "📍",
      title: "Prefer Local",
      brief:
        "You'd rather attend physical classes, local workshops, and in-person internships near your city.",
      bullets: [
        "Roadmap will prioritize local institutions & workshops",
        "Face-to-face mentorship and networking",
        "Hands-on lab/studio access for practical fields",
        "Best if you have strong local educational infrastructure",
      ],
    },
    "Open to relocation": {
      icon: "✈️",
      title: "Open to Relocation",
      brief:
        "You're willing to move to another city or state for better opportunities — college, internships, or jobs.",
      bullets: [
        "Unlocks top-tier colleges and companies across India",
        "Metro cities (Bangalore, Hyderabad, Delhi) offer more roles",
        "Hostel/PG costs will be factored into recommendations",
        "Significantly widens your opportunity pool",
      ],
    },
    "Scholarship required": {
      icon: "🎖️",
      title: "Scholarship Required",
      brief:
        "You need financial aid or scholarships to pursue your education or career goals.",
      bullets: [
        "Government scholarships (post-matric, merit-based, SC/ST/OBC)",
        "College-specific fee waivers and assistantships",
        "Private foundation scholarships (Tata, Azim Premji, etc.)",
        "Roadmap will flag every scholarship-eligible step",
      ],
    },
  },

  /* ─── Skills (shared + field-specific) ─── */
  skills: {
    // Shared skills
    "None yet": {
      icon: "🌱",
      title: "None Yet",
      brief: "No worries — everyone starts somewhere. Career GPS will build your roadmap from scratch.",
      bullets: ["Your roadmap will include beginner-friendly skill-building steps", "No prerequisites needed to get started"],
    },
    Documentation: {
      icon: "📄",
      title: "Documentation",
      brief: "Ability to write clear reports, notes, and records — essential in every career.",
      bullets: ["Used in project reports, SOPs, and professional emails", "A transferable skill valued across all industries"],
    },
    Communication: {
      icon: "🗣️",
      title: "Communication",
      brief: "Expressing ideas clearly through speaking and writing — the #1 soft skill employers look for.",
      bullets: ["Critical for interviews, presentations, and teamwork", "Improves leadership potential and collaboration"],
    },
    Research: {
      icon: "🔍",
      title: "Research",
      brief: "Finding, analyzing, and synthesizing information to solve problems or create new knowledge.",
      bullets: ["Core skill for academics, policy, science, and journalism", "Google Scholar, JSTOR, and library skills are a great start"],
    },
    Teamwork: {
      icon: "🤝",
      title: "Teamwork",
      brief: "Working effectively with others towards a common goal — crucial in every professional setting.",
      bullets: ["Demonstrated through group projects, clubs, and sports", "Employers test for this in interviews and group discussions"],
    },
    "Public speaking": {
      icon: "🎤",
      title: "Public Speaking",
      brief: "Confidently presenting ideas to an audience — from classrooms to boardrooms.",
      bullets: ["Builds confidence and leadership presence", "Debate clubs, MUNs, and presentations are great practice"],
    },
    Presentation: {
      icon: "📊",
      title: "Presentation",
      brief: "Creating and delivering slide decks, pitches, and visual explanations of ideas.",
      bullets: ["PowerPoint, Google Slides, and Canva are key tools", "A must-have for business, design, and academic roles"],
    },
    // Tech skills
    Python: {
      icon: "🐍",
      title: "Python",
      brief: "The most beginner-friendly and versatile programming language — used in data science, AI, web dev, and automation.",
      bullets: ["#1 language for data analysis and machine learning", "Easy syntax, massive community, tons of free resources"],
    },
    JavaScript: {
      icon: "⚡",
      title: "JavaScript",
      brief: "The language of the web — powers every website, web app, and increasingly backend systems.",
      bullets: ["Essential for frontend (React, Vue) and backend (Node.js)", "Highest number of job postings globally"],
    },
    Excel: {
      icon: "📗",
      title: "Excel",
      brief: "The universal business tool for data organization, calculations, and reporting.",
      bullets: ["Required in finance, operations, analytics, and admin", "Pivot tables, VLOOKUP, and charts are must-know features"],
    },
    SQL: {
      icon: "🗃️",
      title: "SQL",
      brief: "The language for querying databases — every company with data needs SQL-literate people.",
      bullets: ["Used by analysts, engineers, and product managers daily", "SELECT, JOIN, GROUP BY — basics you can learn in a week"],
    },
    "Problem solving": {
      icon: "🧩",
      title: "Problem Solving",
      brief: "Breaking down complex challenges into manageable steps — the core of engineering and analytical thinking.",
      bullets: ["Tested in coding interviews and aptitude exams", "Developed through practice (LeetCode, HackerRank, puzzles)"],
    },
    Git: {
      icon: "🔀",
      title: "Git",
      brief: "Version control system that tracks code changes — essential for any developer or data professional.",
      bullets: ["GitHub profile acts as a portfolio for tech roles", "Collaboration standard for all software teams worldwide"],
    },
    // Science skills
    "Lab basics": {
      icon: "🧫",
      title: "Lab Basics",
      brief: "Hands-on skills in laboratory procedures, safety protocols, and equipment handling.",
      bullets: ["Foundation for any science or medical career", "Includes titration, microscopy, and measurement techniques"],
    },
    Observation: {
      icon: "👁️",
      title: "Observation",
      brief: "Carefully noticing details, patterns, and anomalies — the scientist's superpower.",
      bullets: ["Critical for experiments, diagnostics, and research", "Strengthened through practice and structured note-taking"],
    },
    "Data recording": {
      icon: "📋",
      title: "Data Recording",
      brief: "Systematically capturing experimental data with accuracy and consistency.",
      bullets: ["Ensures reproducibility and reliability of results", "Used in lab journals, field studies, and clinical trials"],
    },
    Math: {
      icon: "🔢",
      title: "Mathematics",
      brief: "The universal language of logic and quantitative reasoning — foundational for science, tech, and commerce.",
      bullets: ["Required for competitive exams, engineering, and analytics", "Statistics and probability are especially in-demand"],
    },
    "Scientific writing": {
      icon: "✍️",
      title: "Scientific Writing",
      brief: "Writing research papers, lab reports, and proposals in clear, structured academic format.",
      bullets: ["Essential for publishing, grants, and academic advancement", "Follows IMRaD format (Introduction, Methods, Results, Discussion)"],
    },
    "Experiment design": {
      icon: "🧪",
      title: "Experiment Design",
      brief: "Planning controlled experiments to test hypotheses with valid, reproducible methodology.",
      bullets: ["Core of the scientific method", "Includes variables, controls, sample sizes, and protocols"],
    },
    // Commerce skills
    "Accounting basics": {
      icon: "📒",
      title: "Accounting Basics",
      brief: "Understanding debits, credits, ledgers, and financial statements — the backbone of commerce.",
      bullets: ["Foundation for CA, CS, and CMA career paths", "Tally and QuickBooks are key software tools"],
    },
    "Market research": {
      icon: "📉",
      title: "Market Research",
      brief: "Analyzing markets, competitors, and consumer behavior to inform business decisions.",
      bullets: ["Used in marketing, product management, and consulting", "Surveys, focus groups, and data analysis are core methods"],
    },
    Budgeting: {
      icon: "💰",
      title: "Budgeting",
      brief: "Planning and managing finances — personal or organizational — to meet goals within constraints.",
      bullets: ["Essential for financial analysts, project managers, and entrepreneurs", "Excel and budgeting apps are primary tools"],
    },
    "Business analysis": {
      icon: "📌",
      title: "Business Analysis",
      brief: "Identifying business needs and recommending solutions to improve processes and outcomes.",
      bullets: ["Growing role in IT, consulting, and operations", "Combines data skills with business domain knowledge"],
    },
    "Data entry": {
      icon: "⌨️",
      title: "Data Entry",
      brief: "Accurately inputting and organizing data into systems — a solid entry-level skill.",
      bullets: ["Teaches attention to detail and database basics", "Stepping stone into analytics, operations, and admin roles"],
    },
    // Arts skills
    Writing: {
      icon: "✒️",
      title: "Writing",
      brief: "Crafting compelling text — from essays and blogs to scripts and copy. The foundation of arts & humanities.",
      bullets: ["Opens doors to content writing, journalism, and publishing", "Strong writers are needed in every industry for communication"],
    },
    Sketching: {
      icon: "✏️",
      title: "Sketching",
      brief: "Quick visual ideation on paper — used in design, architecture, and creative brainstorming.",
      bullets: ["Foundation for graphic design, UI/UX, and illustration", "No expensive tools needed — just a pencil and paper"],
    },
    "Creative thinking": {
      icon: "💡",
      title: "Creative Thinking",
      brief: "Generating innovative ideas and approaching problems from unexpected angles.",
      bullets: ["Valued in advertising, design, startups, and product roles", "Can be developed through brainstorming and creative exercises"],
    },
    Storytelling: {
      icon: "📖",
      title: "Storytelling",
      brief: "Crafting compelling narratives that engage and persuade — used in media, marketing, and education.",
      bullets: ["Core of content marketing, branding, and journalism", "Powerful for presentations, pitches, and leadership"],
    },
    "Visual analysis": {
      icon: "🖼️",
      title: "Visual Analysis",
      brief: "Interpreting and critiquing visual content — images, art, design, and media.",
      bullets: ["Used in art criticism, design review, and media studies", "Develops aesthetic judgment and attention to composition"],
    },
    "Content planning": {
      icon: "🗓️",
      title: "Content Planning",
      brief: "Strategically organizing what content to create, when, and for which audience.",
      bullets: ["Essential for social media, blogging, and marketing careers", "Tools: Notion, Trello, Google Calendar, content calendars"],
    },
    // Law skills
    "Reading cases": {
      icon: "📕",
      title: "Reading Cases",
      brief: "Analyzing legal judgments and case law — the bread and butter of legal education and practice.",
      bullets: ["Develops legal reasoning and analytical thinking", "Indian Kanoon and SCC Online are key resources"],
    },
    Argumentation: {
      icon: "⚔️",
      title: "Argumentation",
      brief: "Building logical, evidence-based arguments — core to advocacy, debate, and legal proceedings.",
      bullets: ["Tested in moot courts, debates, and courtroom practice", "Combines logic, research, and persuasive communication"],
    },
    "Legal research": {
      icon: "📚",
      title: "Legal Research",
      brief: "Finding relevant statutes, precedents, and legal commentary to support arguments or opinions.",
      bullets: ["Uses databases like Manupatra, SCC Online, Indian Kanoon", "Foundation for every legal professional's daily work"],
    },
    Drafting: {
      icon: "📝",
      title: "Drafting",
      brief: "Writing legal documents — contracts, petitions, opinions, and memoranda with precision.",
      bullets: ["Required for corporate law, litigation, and compliance", "Accuracy and clarity are paramount in legal drafting"],
    },
    Debate: {
      icon: "🎙️",
      title: "Debate",
      brief: "Structured argumentation and counter-argumentation — builds confidence and analytical sharpness.",
      bullets: ["Moot courts and parliamentary debates are key practice grounds", "Directly applicable to courtroom advocacy"],
    },
    "Critical thinking": {
      icon: "🧠",
      title: "Critical Thinking",
      brief: "Evaluating information objectively, spotting biases, and making reasoned judgments.",
      bullets: ["Foundation for law, research, journalism, and policy", "Developed through reading, debate, and case analysis"],
    },
    // Medicine skills
    "Biology basics": {
      icon: "🧬",
      title: "Biology Basics",
      brief: "Understanding living organisms — cells, genetics, anatomy, and physiology. The foundation of medicine.",
      bullets: ["NEET biology carries the highest weightage", "Covers human body systems, genetics, ecology, and evolution"],
    },
    "Chemistry basics": {
      icon: "⚗️",
      title: "Chemistry Basics",
      brief: "Understanding chemical reactions, compounds, and molecular structures — essential for medicine and pharma.",
      bullets: ["Organic chemistry is critical for pharmacology", "Required for NEET, pharmacy, and biotech paths"],
    },
    "First aid awareness": {
      icon: "🩹",
      title: "First Aid Awareness",
      brief: "Basic emergency response skills — CPR, wound care, and stabilization techniques.",
      bullets: ["Life-saving skill everyone should have", "Demonstrates healthcare interest on applications"],
    },
    Memorization: {
      icon: "🧠",
      title: "Memorization",
      brief: "Retaining large volumes of information — essential for medical studies with vast syllabi.",
      bullets: ["Active recall and spaced repetition are proven techniques", "Anki flashcards and mind maps are popular tools"],
    },
    "Patient empathy": {
      icon: "❤️",
      title: "Patient Empathy",
      brief: "Understanding and sharing patient feelings — the human core of healthcare beyond technical knowledge.",
      bullets: ["Improves patient outcomes and trust", "Increasingly assessed in medical admissions and training"],
    },
    // Design skills
    Figma: {
      icon: "🎨",
      title: "Figma",
      brief: "The industry-standard tool for UI/UX design — used by designers at Google, Apple, and startups alike.",
      bullets: ["Free for students and individual use", "Covers wireframing, prototyping, and design systems"],
    },
    "Color theory": {
      icon: "🎨",
      title: "Color Theory",
      brief: "Understanding how colors interact, evoke emotions, and create visual harmony in designs.",
      bullets: ["Essential for branding, UI design, and visual arts", "Covers hue, saturation, complementary colors, and accessibility"],
    },
    "User research": {
      icon: "🔎",
      title: "User Research",
      brief: "Understanding user needs, behaviors, and pain points to inform design decisions.",
      bullets: ["Core of UX design and product management", "Methods: interviews, surveys, usability testing, persona creation"],
    },
    "Visual design": {
      icon: "🖌️",
      title: "Visual Design",
      brief: "Creating aesthetically pleasing and functional visual layouts — typography, spacing, and composition.",
      bullets: ["Combines art and function for digital products", "Covers grids, typography, iconography, and visual hierarchy"],
    },
    Prototyping: {
      icon: "🔄",
      title: "Prototyping",
      brief: "Building interactive mockups of apps and websites before development — to test and iterate quickly.",
      bullets: ["Tools: Figma, Adobe XD, InVision, Principle", "Saves development time by catching issues early"],
    },
  },
};

/**
 * Look up a description by category and key.
 * Returns null if no description exists.
 */
export function getDescription(category, key) {
  return descriptions[category]?.[key] ?? null;
}
