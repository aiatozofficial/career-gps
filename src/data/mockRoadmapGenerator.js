import { parseRoadmap, roadmapSchema } from "../schemas/roadmapSchemas.js";
import { inferCollegeDegree } from "../utils/roadmapHelpers.js";

// ─────────────────────────────────────────────────────────
// Field-specific configuration
// Each field supplies the nouns, roles, courses, certs,
// internships, alternate paths, and skill-gap data that
// the goal-type builders interpolate into roadmap templates.
// ─────────────────────────────────────────────────────────

const FIELDS = {
  TECH: {
    label: "tech",
    primary: { tool: "Python", skill: "programming fundamentals" },
    secondary: { tool: "JavaScript & React", skill: "full-stack development" },
    portfolio: "a full-stack web application with live demo",
    roles: { entry: "Junior Developer", mid: "Software Developer", senior: "Senior Engineer or Tech Lead" },
    startup: { focus: "tech product or SaaS", example: "a productivity tool for students" },
    studies: { target: "M.Tech or MS in Computer Science", exams: "GATE, GRE, or university entrance tests" },
    courses: [
      { id: "course-1", name: "Data Structures & Algorithms", semester: "Next available semester", reason: "Core problem-solving skills tested in every tech interview.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Web Development Fundamentals", semester: "Within 2 semesters", reason: "Full-stack skills open the widest range of entry-level roles.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Cloud Computing Workshop", semester: "After core courses", reason: "Cloud deployment knowledge is expected in modern dev roles.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "freeCodeCamp Responsive Web Design", platform: "freeCodeCamp", cost: "Free", duration: "4-6 weeks", impact: "Proves front-end basics with a verifiable certificate.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "Meta Front-End Developer Certificate", platform: "Coursera", cost: "Paid subscription; financial aid available", duration: "4-6 months", impact: "Structured React path with portfolio-friendly capstone projects.", financialTiers: ["MEDIUM", "HIGH"] },
      { id: "cert-3", name: "AWS Cloud Practitioner", platform: "AWS Training", cost: "Paid exam; free study materials", duration: "6-8 weeks", impact: "Industry-recognized cloud credential for dev and DevOps roles.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "Web Development Intern", when: "Months 6-10", platforms: ["Internshala", "LinkedIn", "College placement cell"], stipendNote: "Prioritize stipend listings; many remote options available.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "Full-Stack Developer Intern", when: "Months 12-18", platforms: ["LinkedIn", "Wellfound", "Company career pages"], stipendNote: "Apply once you have 2+ projects in your portfolio.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Software Engineering Intern", when: "Year 2", platforms: ["LinkedIn", "Company career pages", "Referrals"], stipendNote: "Competitive roles; strong portfolios and DSA skills help.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Data Analyst", salaryRange: "INR 4-9 LPA entry to early career", skillOverlap: 72, pivotRequired: "Add SQL, statistics, and data visualization skills." },
      { id: "alt-2", title: "DevOps Engineer", salaryRange: "INR 5-12 LPA early career", skillOverlap: 65, pivotRequired: "Add Linux, CI/CD pipelines, and cloud infrastructure." },
      { id: "alt-3", title: "Product Manager", salaryRange: "INR 6-15 LPA early career", skillOverlap: 55, pivotRequired: "Add product thinking, metrics, user research, and stakeholder communication." },
    ],
    skillGap: {
      have: ["Basic coding", "Digital literacy", "Problem-solving interest"],
      need: [
        { skill: "Data structures", milestoneId: "st-m3" },
        { skill: "System design", milestoneId: "st-m6" },
        { skill: "Testing", milestoneId: "st-m9" },
        { skill: "Deployment", milestoneId: "st-m12" },
      ],
      bridgingSteps: ["Start with Python fundamentals and small scripts.", "Build 2-3 web projects with increasing complexity.", "Learn Git, deployment, and collaborative workflows."],
    },
  },

  SCIENCE: {
    label: "science",
    primary: { tool: "lab techniques", skill: "scientific method and observation" },
    secondary: { tool: "R or Python for data analysis", skill: "quantitative research" },
    portfolio: "a research summary or lab report with data visualizations",
    roles: { entry: "Research Assistant", mid: "Research Scientist", senior: "Senior Researcher or Lab Director" },
    startup: { focus: "biotech or science-services venture", example: "an affordable lab-testing service" },
    studies: { target: "MSc or PhD in your specialization", exams: "JAM, CSIR-NET, GRE, or university entrance tests" },
    courses: [
      { id: "course-1", name: "Biostatistics & Experimental Design", semester: "Next available semester", reason: "Statistical reasoning is essential for credible research work.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Research Methodology", semester: "Within 2 semesters", reason: "Strengthens literature review, hypothesis testing, and publication skills.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Computational Science Workshop", semester: "After core courses", reason: "Data-driven science roles increasingly require programming skills.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "Data Analysis with Python", platform: "NPTEL", cost: "Free to learn; optional paid exam", duration: "8 weeks", impact: "Adds quantitative analysis skills valued in research labs.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "Laboratory Safety & Compliance", platform: "Coursera", cost: "Paid subscription; financial aid available", duration: "4 weeks", impact: "Shows lab readiness to research supervisors and recruiters.", financialTiers: ["MEDIUM", "HIGH"] },
      { id: "cert-3", name: "Scientific Writing & Publishing", platform: "edX", cost: "Paid certificate; free audit", duration: "6 weeks", impact: "Strengthens your ability to publish and communicate results.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "Research Assistant - Data Collection", when: "Months 6-10", platforms: ["College department", "LinkedIn", "Internshala"], stipendNote: "Good first option; prioritize projects with real data exposure.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "Lab Technician Intern", when: "Months 12-18", platforms: ["Internshala", "Research labs", "University postings"], stipendNote: "Hands-on lab experience; check for stipend or travel support.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Research Intern at Industry Lab", when: "Year 2", platforms: ["LinkedIn", "Company R&D pages", "Professor referrals"], stipendNote: "More competitive; strong academic record and publications help.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Science Writer", salaryRange: "INR 3-7 LPA freelance to early career", skillOverlap: 70, pivotRequired: "Add science communication, blogging, and editorial skills." },
      { id: "alt-2", title: "Quality Analyst", salaryRange: "INR 3.5-8 LPA entry to early career", skillOverlap: 68, pivotRequired: "Add Six Sigma basics, process documentation, and compliance." },
      { id: "alt-3", title: "Biotech Analyst", salaryRange: "INR 4-10 LPA early career", skillOverlap: 75, pivotRequired: "Add bioinformatics tools, data pipelines, and industry context." },
    ],
    skillGap: {
      have: ["Lab basics", "Observation", "Scientific curiosity"],
      need: [
        { skill: "Advanced statistics", milestoneId: "st-m3" },
        { skill: "Publication skills", milestoneId: "st-m6" },
        { skill: "Data tools", milestoneId: "st-m9" },
      ],
      bridgingSteps: ["Learn to analyze experimental data with R or Python.", "Write one research summary from a public dataset.", "Practice presenting findings with charts and clear language."],
    },
  },

  COMMERCE: {
    label: "commerce",
    primary: { tool: "Excel and financial modeling", skill: "accounting and analysis fundamentals" },
    secondary: { tool: "Tally, Power BI, or SAP basics", skill: "business reporting and analytics" },
    portfolio: "a financial analysis report or business case study",
    roles: { entry: "Business Analyst Trainee", mid: "Business Analyst", senior: "Finance Manager or Strategy Lead" },
    startup: { focus: "a service business or fintech product", example: "a budgeting app for college students" },
    studies: { target: "MBA or CA qualification", exams: "CAT, XAT, CA Foundation, or CFA Level 1" },
    courses: [
      { id: "course-1", name: "Financial Accounting", semester: "Next available semester", reason: "Core skill for every commerce career path from CA to consulting.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Business Statistics", semester: "Within 2 semesters", reason: "Quantitative skills separate strong analysts from average ones.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Corporate Finance Workshop", semester: "After core courses", reason: "Adds valuation, investment analysis, and strategic decision context.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "Tally ERP Certification", platform: "Tally Education", cost: "Low-cost course", duration: "4-6 weeks", impact: "Proves accounting software competency for entry-level finance roles.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "Google Data Analytics Certificate", platform: "Coursera", cost: "Paid subscription; financial aid available", duration: "3-6 months", impact: "Structured analytics path relevant to business analyst roles.", financialTiers: ["MEDIUM", "HIGH"] },
      { id: "cert-3", name: "CFA Level 1 Preparation", platform: "CFA Institute", cost: "Paid registration and materials", duration: "6-12 months", impact: "Gold-standard credential for investment and finance careers.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "Accounts Intern", when: "Months 6-10", platforms: ["Internshala", "LinkedIn", "Local CA firms"], stipendNote: "Good first exposure; prioritize firms that let you work on real books.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "Market Research Intern", when: "Months 12-18", platforms: ["Internshala", "LinkedIn", "Consulting firms"], stipendNote: "Builds analytical and presentation skills for business roles.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Business Analyst Intern", when: "Year 2", platforms: ["LinkedIn", "Wellfound", "Company career pages"], stipendNote: "Apply with Excel projects, a case study, and a focused resume.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Chartered Accountant", salaryRange: "INR 5-12 LPA post-qualification", skillOverlap: 78, pivotRequired: "Add audit, tax law, and articleship experience." },
      { id: "alt-2", title: "Financial Analyst", salaryRange: "INR 4-10 LPA early career", skillOverlap: 72, pivotRequired: "Add financial modeling, valuation techniques, and Excel mastery." },
      { id: "alt-3", title: "Operations Manager", salaryRange: "INR 4-9 LPA early career", skillOverlap: 60, pivotRequired: "Add process improvement, supply chain basics, and ERP tools." },
    ],
    skillGap: {
      have: ["Basic math", "Spreadsheet awareness", "Business interest"],
      need: [
        { skill: "Financial modeling", milestoneId: "st-m3" },
        { skill: "ERP tools", milestoneId: "st-m6" },
        { skill: "Business analysis frameworks", milestoneId: "st-m9" },
      ],
      bridgingSteps: ["Master Excel with pivot tables, VLOOKUP, and charts.", "Build one financial analysis report from public company data.", "Learn a business intelligence tool like Power BI or Tableau."],
    },
  },

  ARTS: {
    label: "arts",
    primary: { tool: "writing and storytelling", skill: "content creation and communication" },
    secondary: { tool: "Canva, Adobe Suite, or video editing", skill: "visual and multimedia production" },
    portfolio: "a content portfolio with published articles or creative samples",
    roles: { entry: "Content Writer", mid: "Content Strategist", senior: "Creative Director or Editorial Lead" },
    startup: { focus: "creative agency or media business", example: "a regional storytelling platform" },
    studies: { target: "MA in English, Mass Communication, or Film Studies", exams: "University entrance tests or portfolio review" },
    courses: [
      { id: "course-1", name: "Media Studies & Communication", semester: "Next available semester", reason: "Foundational understanding of media, audiences, and storytelling.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Creative Writing Workshop", semester: "Within 2 semesters", reason: "Sharpens voice, structure, and editing skills across formats.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Digital Marketing Fundamentals", semester: "After core courses", reason: "Creative roles increasingly require SEO, analytics, and campaign knowledge.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "Google Digital Marketing & E-commerce", platform: "Coursera", cost: "Free to learn; paid certificate", duration: "6 months", impact: "Covers SEO, social, analytics, and e-commerce — high demand in creative roles.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "HubSpot Content Marketing", platform: "HubSpot Academy", cost: "Free", duration: "4-6 weeks", impact: "Teaches content strategy, blogging, and lead generation techniques.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-3", name: "Adobe Creative Suite Essentials", platform: "Adobe / Udemy", cost: "Paid subscription", duration: "8-10 weeks", impact: "Visual production skills that complement writing and strategy work.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "Content Writing Intern", when: "Months 6-10", platforms: ["Internshala", "LinkedIn", "Media companies"], stipendNote: "Great first exposure; prioritize byline opportunities for your portfolio.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "Social Media Intern", when: "Months 12-18", platforms: ["Internshala", "LinkedIn", "Startups"], stipendNote: "Builds campaign thinking, analytics awareness, and brand voice skills.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Editorial Intern", when: "Year 2", platforms: ["LinkedIn", "Publishing houses", "Digital media firms"], stipendNote: "More competitive; a strong writing portfolio is essential.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Journalist", salaryRange: "INR 3-8 LPA early career", skillOverlap: 75, pivotRequired: "Add investigative research, press ethics, and deadline-driven writing." },
      { id: "alt-2", title: "UX Writer", salaryRange: "INR 5-12 LPA early career", skillOverlap: 62, pivotRequired: "Add UX principles, microcopy, and user-research methodology." },
      { id: "alt-3", title: "Brand Strategist", salaryRange: "INR 4-10 LPA early career", skillOverlap: 68, pivotRequired: "Add brand positioning, campaign strategy, and market analysis." },
    ],
    skillGap: {
      have: ["Writing ability", "Creative thinking", "Storytelling instinct"],
      need: [
        { skill: "SEO", milestoneId: "st-m3" },
        { skill: "Analytics", milestoneId: "st-m6" },
        { skill: "Visual design", milestoneId: "st-m9" },
        { skill: "Content strategy", milestoneId: "st-m12" },
      ],
      bridgingSteps: ["Publish 5 articles or blog posts on a platform like Medium.", "Learn basic SEO and analytics with free Google tools.", "Create a portfolio site showcasing your best creative work."],
    },
  },

  LAW: {
    label: "law",
    primary: { tool: "legal research databases", skill: "case analysis and argumentation" },
    secondary: { tool: "legal drafting and documentation", skill: "contract review and compliance" },
    portfolio: "a moot court brief, legal opinion, or research paper",
    roles: { entry: "Junior Advocate or Legal Intern", mid: "Advocate or Legal Analyst", senior: "Senior Counsel or Legal Director" },
    startup: { focus: "legal tech or compliance services", example: "an affordable legal document automation tool" },
    studies: { target: "LLM or Judicial Services preparation", exams: "CLAT PG, university LLM entrance, or state judicial exams" },
    courses: [
      { id: "course-1", name: "Constitutional Law & Governance", semester: "Next available semester", reason: "Core knowledge for litigation, policy work, and judicial services.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Corporate Law & Compliance", semester: "Within 2 semesters", reason: "In-demand specialization for law firms, startups, and compliance roles.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Intellectual Property Rights Workshop", semester: "After core courses", reason: "High-growth area connecting law to tech, design, and creative industries.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "Cyber Law & Data Privacy Basics", platform: "NPTEL / SWAYAM", cost: "Free to learn; optional paid exam", duration: "8 weeks", impact: "Shows specialization in one of law's fastest-growing practice areas.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "Alternative Dispute Resolution", platform: "Coursera / NALSAR", cost: "Paid subscription; financial aid available", duration: "6-8 weeks", impact: "Mediation and arbitration skills valued in corporate and civil practice.", financialTiers: ["MEDIUM", "HIGH"] },
      { id: "cert-3", name: "Legal Tech & Contract Analytics", platform: "edX / Udemy", cost: "Paid course", duration: "4-6 weeks", impact: "Combines law knowledge with technology for modern practice.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "Legal Research Intern", when: "Months 6-10", platforms: ["Law firm websites", "LinkedIn", "College placement"], stipendNote: "Focus on firms that let you draft and research, not just photocopy.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "Court Clerk / Judicial Intern", when: "Months 12-18", platforms: ["District courts", "High court internships", "Judge chambers"], stipendNote: "Unpaid but invaluable; observe proceedings and assist with research.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Corporate Legal Intern", when: "Year 2", platforms: ["LinkedIn", "Corporate legal departments", "Big law firms"], stipendNote: "Competitive; moot court wins and published papers give an edge.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Compliance Officer", salaryRange: "INR 4-10 LPA early career", skillOverlap: 74, pivotRequired: "Add regulatory frameworks, audit procedures, and corporate governance." },
      { id: "alt-2", title: "Policy Researcher", salaryRange: "INR 3.5-8 LPA early career", skillOverlap: 70, pivotRequired: "Add policy drafting, public interest research, and stakeholder analysis." },
      { id: "alt-3", title: "Legal Tech Analyst", salaryRange: "INR 5-12 LPA early career", skillOverlap: 58, pivotRequired: "Add contract analytics tools, basic coding, and product thinking." },
    ],
    skillGap: {
      have: ["Case reading", "Argumentation", "Critical thinking"],
      need: [
        { skill: "Legal research tools", milestoneId: "st-m3" },
        { skill: "Drafting precision", milestoneId: "st-m6" },
        { skill: "Courtroom procedures", milestoneId: "st-m9" },
      ],
      bridgingSteps: ["Read and brief 10 landmark cases in your area of interest.", "Draft a moot court memorial or legal opinion from scratch.", "Attend court proceedings and note procedural patterns."],
    },
  },

  MEDICINE: {
    label: "medicine / healthcare",
    primary: { tool: "clinical assessment", skill: "patient evaluation and diagnosis basics" },
    secondary: { tool: "medical research methodology", skill: "evidence-based practice" },
    portfolio: "a clinical case study, public health report, or research summary",
    roles: { entry: "Intern Doctor or Healthcare Associate", mid: "Resident Doctor or Healthcare Professional", senior: "Specialist or Department Head" },
    startup: { focus: "health tech or clinical services", example: "an affordable telemedicine solution for rural areas" },
    studies: { target: "MD, MS, or MPH specialization", exams: "NEET PG, USMLE, or public health entrance tests" },
    courses: [
      { id: "course-1", name: "Community Medicine & Public Health", semester: "Next available semester", reason: "Connects clinical knowledge with real-world health challenges.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Clinical Research Methods", semester: "Within 2 semesters", reason: "Research literacy is essential for specialization and publication.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Healthcare Management Workshop", semester: "After core courses", reason: "Opens non-clinical career paths in hospital admin and health policy.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "Basic Life Support (BLS)", platform: "AHA / Indian Red Cross", cost: "Low-cost practical training", duration: "1-2 days", impact: "Essential clinical readiness credential for any healthcare role.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "Clinical Research Associate Certificate", platform: "Coursera / ICRI", cost: "Paid subscription; financial aid available", duration: "8-12 weeks", impact: "Opens doors to pharma research, CROs, and clinical trial careers.", financialTiers: ["MEDIUM", "HIGH"] },
      { id: "cert-3", name: "Public Health Certificate", platform: "edX / Johns Hopkins", cost: "Paid certificate; free audit", duration: "3-4 months", impact: "Strong credential for MPH applications and global health roles.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "Clinical Observation Intern", when: "Months 6-10", platforms: ["Teaching hospitals", "Community health centers", "College department"], stipendNote: "Focus on patient interaction, clinical notes, and learning protocols.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "Public Health Research Intern", when: "Months 12-18", platforms: ["NGOs", "WHO India programs", "Government health schemes"], stipendNote: "Builds research and fieldwork skills; some offer travel support.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Pharmaceutical Research Intern", when: "Year 2", platforms: ["Pharma company websites", "LinkedIn", "CRO listings"], stipendNote: "Competitive; published research or CRA certification helps.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Healthcare Administrator", salaryRange: "INR 4-10 LPA early career", skillOverlap: 65, pivotRequired: "Add hospital management, health informatics, and operations skills." },
      { id: "alt-2", title: "Medical Writer", salaryRange: "INR 3.5-9 LPA early career", skillOverlap: 72, pivotRequired: "Add scientific writing, regulatory documentation, and publication skills." },
      { id: "alt-3", title: "Biotech Researcher", salaryRange: "INR 4-11 LPA early career", skillOverlap: 70, pivotRequired: "Add molecular biology techniques, bioinformatics, and lab management." },
    ],
    skillGap: {
      have: ["Biology basics", "Empathy", "Observation skills"],
      need: [
        { skill: "Clinical skills", milestoneId: "st-m3" },
        { skill: "Research methodology", milestoneId: "st-m6" },
        { skill: "Specialization depth", milestoneId: "st-m9" },
      ],
      bridgingSteps: ["Complete a clinical observation rotation and keep detailed notes.", "Read and summarize 5 recent medical research papers in your interest area.", "Build a case study portfolio from clinical or public health experiences."],
    },
  },

  DESIGN: {
    label: "design",
    primary: { tool: "Figma", skill: "UI/UX design fundamentals" },
    secondary: { tool: "prototyping and user research", skill: "interaction design and usability testing" },
    portfolio: "a UX case study with user research, wireframes, and prototypes",
    roles: { entry: "Junior UX/UI Designer", mid: "Product Designer", senior: "Design Lead or Design Director" },
    startup: { focus: "design studio or design-led product", example: "a portfolio builder for creative students" },
    studies: { target: "MDes or Design Management program", exams: "CEED, NID entrance, or university portfolio reviews" },
    courses: [
      { id: "course-1", name: "Interaction Design Principles", semester: "Next available semester", reason: "Core framework for structuring user experiences and interfaces.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Visual Communication & Typography", semester: "Within 2 semesters", reason: "Strong visual language separates polished designers from beginners.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Design Thinking Workshop", semester: "After core courses", reason: "Problem-framing and empathy methods used in top product teams.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "Google UX Design Certificate", platform: "Coursera", cost: "Paid subscription; financial aid available", duration: "3-6 months", impact: "Structured UX path with portfolio-ready case studies and research projects.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "Interaction Design Foundation Membership", platform: "IxDF", cost: "Annual subscription", duration: "Ongoing", impact: "Deep courses on UX, UI, and cognitive psychology for designers.", financialTiers: ["MEDIUM", "HIGH"] },
      { id: "cert-3", name: "Figma UI Design Masterclass", platform: "Udemy / Designlab", cost: "Paid course", duration: "6-8 weeks", impact: "Hands-on Figma skills with component systems and design tokens.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "UI Design Intern", when: "Months 6-10", platforms: ["Internshala", "LinkedIn", "Design studios"], stipendNote: "Focus on building real project experience; get feedback from senior designers.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "UX Research Intern", when: "Months 12-18", platforms: ["LinkedIn", "Wellfound", "Product companies"], stipendNote: "User research experience strengthens every design portfolio.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Product Design Intern", when: "Year 2", platforms: ["LinkedIn", "Company career pages", "Dribbble jobs"], stipendNote: "Competitive; 3+ case studies with clear process documentation help.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Motion Designer", salaryRange: "INR 4-10 LPA early career", skillOverlap: 65, pivotRequired: "Add After Effects, Lottie animations, and interaction motion principles." },
      { id: "alt-2", title: "Design Researcher", salaryRange: "INR 4-9 LPA early career", skillOverlap: 78, pivotRequired: "Add qualitative research methods, survey design, and insight synthesis." },
      { id: "alt-3", title: "Front-End Developer (Design Focus)", salaryRange: "INR 5-12 LPA early career", skillOverlap: 55, pivotRequired: "Add HTML, CSS, JavaScript, and a front-end framework like React." },
    ],
    skillGap: {
      have: ["Visual sense", "Sketching ability", "Creative interest"],
      need: [
        { skill: "Figma proficiency", milestoneId: "st-m3" },
        { skill: "User research", milestoneId: "st-m6" },
        { skill: "Interaction patterns", milestoneId: "st-m9" },
        { skill: "Design systems", milestoneId: "st-m12" },
      ],
      bridgingSteps: ["Complete 3 Figma projects from wireframe to high-fidelity prototype.", "Run a usability test on one of your designs and document findings.", "Study 10 well-designed apps and analyze their UX patterns."],
    },
  },

  OTHER: {
    label: "your chosen field",
    primary: { tool: "foundational tools in your area", skill: "core concepts and terminology" },
    secondary: { tool: "digital tools relevant to your direction", skill: "applied practice and communication" },
    portfolio: "a project or portfolio showcasing your abilities",
    roles: { entry: "Entry-Level Professional", mid: "Specialist or Analyst", senior: "Senior Professional or Manager" },
    startup: { focus: "a venture in your area of interest", example: "a service or product solving a local problem" },
    studies: { target: "a postgraduate program in your field", exams: "relevant entrance tests or portfolio reviews" },
    courses: [
      { id: "course-1", name: "Critical Thinking & Problem Solving", semester: "Next available semester", reason: "Transferable reasoning skills valued across every professional domain.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Professional Communication", semester: "Within 2 semesters", reason: "Clear communication accelerates career growth in any direction.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-3", name: "Project Management Basics", semester: "After core courses", reason: "Planning and execution skills that apply to any career or venture.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    certs: [
      { id: "cert-1", name: "Google Digital Marketing & E-commerce", platform: "Coursera", cost: "Free to learn; paid certificate", duration: "6 months", impact: "Widely applicable digital skills for any career or business.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "LinkedIn Learning Skill Path", platform: "LinkedIn Learning", cost: "Paid subscription; free trial available", duration: "4-8 weeks", impact: "Flexible skill-building in your chosen direction with LinkedIn visibility.", financialTiers: ["MEDIUM", "HIGH"] },
      { id: "cert-3", name: "Project Management Professional Prep", platform: "Coursera / PMI", cost: "Paid course and exam", duration: "3-6 months", impact: "Gold-standard credential for organizing and leading professional work.", financialTiers: ["HIGH"] },
    ],
    internships: [
      { id: "intern-1", role: "General Intern / Trainee", when: "Months 6-10", platforms: ["Internshala", "LinkedIn", "Local organizations"], stipendNote: "Prioritize learning exposure; any professional environment helps early on.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-2", role: "Project Coordination Intern", when: "Months 12-18", platforms: ["Internshala", "LinkedIn", "NGOs"], stipendNote: "Builds organizational and communication skills for any career path.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "intern-3", role: "Domain-Specific Intern", when: "Year 2", platforms: ["LinkedIn", "Company career pages", "Professional networks"], stipendNote: "Target roles aligned with your narrowed career direction.", financialTiers: ["MEDIUM", "HIGH"] },
    ],
    altPaths: [
      { id: "alt-1", title: "Freelance Consultant", salaryRange: "INR 3-8 LPA early career", skillOverlap: 70, pivotRequired: "Add client management, proposal writing, and self-marketing skills." },
      { id: "alt-2", title: "Project Coordinator", salaryRange: "INR 3.5-7 LPA entry", skillOverlap: 65, pivotRequired: "Add planning tools, stakeholder communication, and documentation." },
      { id: "alt-3", title: "Digital Content Creator", salaryRange: "INR 2-8 LPA freelance to early career", skillOverlap: 55, pivotRequired: "Add content strategy, video/audio production, and audience growth." },
    ],
    skillGap: {
      have: ["Curiosity", "Basic communication", "Willingness to learn"],
      need: [
        { skill: "Domain-specific knowledge", milestoneId: "st-m3" },
        { skill: "Professional tools", milestoneId: "st-m6" },
        { skill: "Portfolio evidence", milestoneId: "st-m9" },
      ],
      bridgingSteps: ["Identify the top 3 skills required for roles you are curious about.", "Complete one introductory online course in your target area.", "Build a small project or write-up that demonstrates applied learning."],
    },
  },
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getFieldConfig(profile) {
  const type = profile.field.type;
  const config = FIELDS[type] || FIELDS.OTHER;
  if (type === "OTHER" && profile.field.customValue) {
    return { ...config, label: profile.field.customValue.toLowerCase() };
  }
  return config;
}

function goalLabel(profile) {
  return profile.goal.description || "your chosen direction";
}

// ─────────────────────────────────────────────────────────
// Builder: JOB_ROLE
// ─────────────────────────────────────────────────────────

function buildJobRoleRoadmap(profile, f) {
  const goal = goalLabel(profile);

  const shortTermGoals = {
    description: `Build a strong 18-month foundation toward becoming a ${goal} in ${f.label}.`,
    months: [
      { month: 1, milestones: [{ id: "st-m1", title: "Set up your career baseline", detail: `Write your current stage, top 3 strengths, weak areas, budget tier, weekly study hours, and your target direction — ${goal} — in a simple tracker.`, phase: "shortTerm" }] },
      { month: 3, milestones: [{ id: "st-m3", title: `Build ${f.primary.tool} confidence`, detail: `Practice ${f.primary.skill} through beginner exercises and small projects. Finish one mini-report or project demonstrating your progress.`, phase: "shortTerm" }] },
      { month: 6, milestones: [{ id: "st-m6", title: `Complete ${f.secondary.skill} fundamentals`, detail: `Finish an introductory course in ${f.secondary.tool}, solve practical exercises, and publish two write-ups explaining your thinking clearly.`, phase: "shortTerm" }] },
      { month: 9, milestones: [{ id: "st-m9", title: "Add complementary skills", detail: `Combine ${f.primary.tool} and ${f.secondary.tool} in a small integrated project. Practice with 3 scenarios and save your process notes.`, phase: "shortTerm" }] },
      { month: 12, milestones: [{ id: "st-m12", title: "Publish your first portfolio project", detail: `Create ${f.portfolio}. Write a short case study with screenshots, insights, and your decision-making process.`, phase: "shortTerm" }] },
      { month: 15, milestones: [{ id: "st-m15", title: "Prepare for interviews and outreach", detail: `Write 6 short stories about projects, mistakes, learning moments, teamwork, and problem-solving. Tailor them toward ${goal} interviews.`, phase: "shortTerm" }] },
      { month: 18, milestones: [{ id: "st-m18", title: `Apply for ${f.roles.entry} positions`, detail: `Prepare a one-page resume, portfolio link, and short outreach message. Apply to 20 ${goal}-related roles and track responses weekly.`, phase: "internships" }] },
    ],
  };

  const longTermGoals = {
    description: `Move from fundamentals to employable ${f.label} experience as a ${goal} over 2-5 years.`,
    years: [
      { year: "Year 2", milestones: [{ id: "lt-y2", title: "Complete one real-world internship", detail: `Prioritize ${f.roles.entry} roles that include hands-on work, stakeholder interaction, and a measurable outcome you can describe in interviews.`, phase: "internships" }] },
      { year: "Year 3", milestones: [{ id: "lt-y3", title: `Target ${f.roles.entry} roles`, detail: `Apply with portfolio projects, one internship case study, clear resume bullets, and interview stories around problem-solving as a ${goal}.`, phase: "longTerm" }] },
      { year: "Year 4", milestones: [{ id: "lt-y4", title: "Own larger projects", detail: `Lead one cross-functional project, mentor juniors, and learn how teams use your work to make decisions in ${f.label}.`, phase: "longTerm" }] },
      { year: "Year 5+", milestones: [{ id: "lt-y5", title: `Grow toward ${f.roles.senior}`, detail: `Deepen your specialization, build domain expertise, take on leadership responsibilities, and position yourself for ${f.roles.senior} opportunities.`, phase: "longTerm" }] },
    ],
  };

  const decisionTree = buildTreeFromGoals(goal, shortTermGoals, longTermGoals, f);

  return {
    shortTermGoals,
    longTermGoals,
    collegeCourses: f.courses,
    internships: f.internships,
    certifications: f.certs,
    alternatePaths: f.altPaths,
    decisionTree,
    skillGap: f.skillGap,
  };
}

// ─────────────────────────────────────────────────────────
// Builder: STARTUP
// ─────────────────────────────────────────────────────────

function buildStartupRoadmap(profile, f) {
  const goal = goalLabel(profile);

  const shortTermGoals = {
    description: `Validate and build "${goal}" as a ${f.startup.focus} in 18 months.`,
    months: [
      { month: 1, milestones: [{ id: "st-m1", title: "Research the problem space", detail: `Talk to 10 potential users about the problem "${goal}" solves. Document pain points, existing solutions, and gaps you could fill.`, phase: "shortTerm" }] },
      { month: 3, milestones: [{ id: "st-m3", title: "Validate with real people", detail: `Create a landing page or one-pager for "${goal}" and get 20+ sign-ups or expressions of interest. Test your core assumption.`, phase: "shortTerm" }] },
      { month: 6, milestones: [{ id: "st-m6", title: "Build a minimum viable product", detail: `Ship the simplest version of "${goal}" that solves the core problem. Use ${f.primary.tool} and free tools to keep costs low.`, phase: "shortTerm" }] },
      { month: 9, milestones: [{ id: "st-m9", title: "Get your first users", detail: `Onboard 10-50 early users and collect structured feedback. Track what they actually use versus what you expected.`, phase: "shortTerm" }] },
      { month: 12, milestones: [{ id: "st-m12", title: "Iterate based on feedback", detail: `Rebuild the weakest parts of your MVP based on real user data. Focus on the one feature that drives retention.`, phase: "shortTerm" }] },
      { month: 15, milestones: [{ id: "st-m15", title: "Build a sustainable model", detail: `Identify your revenue model — subscriptions, services, or freemium. Run a small pricing experiment with existing users.`, phase: "shortTerm" }] },
      { month: 18, milestones: [{ id: "st-m18", title: "Seek partnerships or funding", detail: `Prepare a pitch deck with traction data, user stories, and unit economics. Apply to 5 incubators or pitch to 10 potential partners.`, phase: "shortTerm" }] },
    ],
  };

  const longTermGoals = {
    description: `Grow "${goal}" from MVP to a viable ${f.startup.focus} over 2-5 years.`,
    years: [
      { year: "Year 2", milestones: [{ id: "lt-y2", title: "Reach product-market fit", detail: `Achieve consistent user growth, reduce churn, and validate that people pay for or deeply use "${goal}" regularly.`, phase: "longTerm" }] },
      { year: "Year 3", milestones: [{ id: "lt-y3", title: "Build a small team", detail: "Hire or partner with 1-2 people who complement your skills. Focus on operations, marketing, or technical depth.", phase: "longTerm" }] },
      { year: "Year 4", milestones: [{ id: "lt-y4", title: "Scale operations", detail: "Systematize your processes, expand to new user segments, and build repeatable marketing and sales channels.", phase: "longTerm" }] },
      { year: "Year 5+", milestones: [{ id: "lt-y5", title: "Establish market position", detail: `Position "${goal}" as a recognized solution in your niche. Explore expansion, acquisition, or sustainable profitability.`, phase: "longTerm" }] },
    ],
  };

  const decisionTree = buildTreeFromGoals(goal, shortTermGoals, longTermGoals, f);

  return {
    shortTermGoals,
    longTermGoals,
    collegeCourses: f.courses,
    internships: f.internships,
    certifications: f.certs,
    alternatePaths: f.altPaths,
    decisionTree,
    skillGap: f.skillGap,
  };
}

// ─────────────────────────────────────────────────────────
// Builder: HIGHER_STUDIES
// ─────────────────────────────────────────────────────────

function buildHigherStudiesRoadmap(profile, f) {
  const goal = goalLabel(profile);

  const shortTermGoals = {
    description: `Prepare for ${goal} with a structured 18-month academic and application plan.`,
    months: [
      { month: 1, milestones: [{ id: "st-m1", title: "Research programs and requirements", detail: `List 10 programs related to "${goal}". Note eligibility criteria, deadlines, fees, scholarships, and exam requirements (${f.studies.exams}).`, phase: "shortTerm" }] },
      { month: 3, milestones: [{ id: "st-m3", title: "Begin entrance exam preparation", detail: `Start a structured study plan for ${f.studies.exams}. Use free resources first, then add paid materials if budget allows.`, phase: "shortTerm" }] },
      { month: 6, milestones: [{ id: "st-m6", title: "Complete mock tests and self-evaluation", detail: `Take 5+ full-length mock exams. Identify weak areas, adjust your study plan, and target a specific score range.`, phase: "shortTerm" }] },
      { month: 9, milestones: [{ id: "st-m9", title: "Build your academic profile", detail: `Strengthen your application with ${f.portfolio}, relevant projects, and any publications or research experience.`, phase: "shortTerm" }] },
      { month: 12, milestones: [{ id: "st-m12", title: "Prepare applications and essays", detail: `Write your statement of purpose, get 2-3 recommendation letters, and tailor each application to the program's strengths.`, phase: "shortTerm" }] },
      { month: 15, milestones: [{ id: "st-m15", title: "Submit applications and take exams", detail: `Submit applications to your shortlisted programs. Take ${f.studies.exams} on scheduled dates. Track all deadlines carefully.`, phase: "shortTerm" }] },
      { month: 18, milestones: [{ id: "st-m18", title: "Finalize admission and prepare", detail: `Accept your offer, arrange finances and scholarships, and begin pre-program preparation in ${f.label}.`, phase: "shortTerm" }] },
    ],
  };

  const longTermGoals = {
    description: `Complete ${goal} and transition into a professional career in ${f.label} over 2-5 years.`,
    years: [
      { year: "Year 2", milestones: [{ id: "lt-y2", title: `Excel in ${f.studies.target} coursework`, detail: "Focus on core subjects, build relationships with professors, and identify research or specialization interests early.", phase: "longTerm" }] },
      { year: "Year 3", milestones: [{ id: "lt-y3", title: "Complete thesis or capstone project", detail: `Produce original work in ${f.label} that demonstrates depth, research ability, and practical application.`, phase: "longTerm" }] },
      { year: "Year 4", milestones: [{ id: "lt-y4", title: "Pursue research or industry placement", detail: `Secure a teaching assistantship, research position, or industry internship aligned with your specialization.`, phase: "longTerm" }] },
      { year: "Year 5+", milestones: [{ id: "lt-y5", title: `Launch your career as a ${f.label} specialist`, detail: `Apply for ${f.roles.mid} roles or continue into doctoral research. Use your academic credentials and project portfolio.`, phase: "longTerm" }] },
    ],
  };

  const decisionTree = {
    id: "root-now", label: "You are here", type: "decision", month: "Now",
    detail: `Start preparing for ${goal} from your current academic position.`,
    financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "in_progress",
    children: [
      {
        id: "st-m3", label: "Exam preparation", type: "milestone", month: "Month 3",
        detail: `Start structured study for ${f.studies.exams}.`,
        financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "not_started",
        children: [
          {
            financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "not_started", children: [],
          },
        ],
      },
      {
        id: "tree-paid-prep", label: "Paid coaching path", type: "alternate", month: "Month 6",
        detail: "Join a structured coaching program if budget permits and self-study gaps persist.",
        financialTiers: ["HIGH"], status: "not_started",
        children: [
          {
            id: "cert-2", label: `${f.certs[1].name.split(" ").slice(0, 3).join(" ")}`, type: "milestone", month: "Month 12",
            detail: f.certs[1].impact,
            financialTiers: ["MEDIUM", "HIGH"], status: "not_started", children: [],
          },
        ],
      },
    ],
  };

  return {
    shortTermGoals,
    longTermGoals,
    collegeCourses: f.courses,
    internships: f.internships,
    certifications: f.certs,
    alternatePaths: f.altPaths,
    decisionTree,
    skillGap: f.skillGap,
  };
}

// ─────────────────────────────────────────────────────────
// Builder: NOT_SURE (exploratory)
// ─────────────────────────────────────────────────────────

function buildExploratoryRoadmap(profile, f) {
  const goal = goalLabel(profile);

  const shortTermGoals = {
    description: `Explore career directions in ${f.label} through structured experimentation over 18 months.`,
    months: [
      { month: 1, milestones: [{ id: "st-m1", title: "Assess your current skills and interests", detail: `Map your strengths, weaknesses, interests, and constraints. List 5 roles in ${f.label} that sound appealing and research what each requires.`, phase: "shortTerm" }] },
      { month: 3, milestones: [{ id: "st-m3", title: "Try 3 different career activities", detail: `Spend 2-3 weeks each on ${f.primary.skill}, ${f.secondary.skill}, and one wildcard activity. Keep a journal of what energizes you.`, phase: "shortTerm" }] },
      { month: 6, milestones: [{ id: "st-m6", title: "Narrow to 2 promising directions", detail: `Based on your experiments, pick 2 directions: one safe (${f.roles.entry}) and one ambitious. Build a small sample project for each.`, phase: "shortTerm" }] },
      { month: 9, milestones: [{ id: "st-m9", title: "Build a sample project in your top choice", detail: `Choose your stronger direction and create ${f.portfolio}. Document your process and what you learned.`, phase: "shortTerm" }] },
      { month: 12, milestones: [{ id: "st-m12", title: "Choose your primary direction", detail: `Commit to one path based on your experiments, projects, and energy levels. Write a short career statement explaining your decision.`, phase: "shortTerm" }] },
      { month: 15, milestones: [{ id: "st-m15", title: "Build a focused portfolio", detail: `Create 2-3 more projects in your chosen direction. Add a portfolio site or document that tells your career story.`, phase: "shortTerm" }] },
      { month: 18, milestones: [{ id: "st-m18", title: "Start applying or learning deeper", detail: `Apply for entry-level roles, internships, or further study in your chosen direction. Use your portfolio and experiments as proof of commitment.`, phase: "internships" }] },
    ],
  };

  const longTermGoals = {
    description: `Transition from exploration into a focused career path in ${f.label} over 2-5 years.`,
    years: [
      { year: "Year 2", milestones: [{ id: "lt-y2", title: "Complete your first professional experience", detail: `Secure an internship or entry role in your chosen direction. Focus on learning how the industry works day-to-day.`, phase: "internships" }] },
      { year: "Year 3", milestones: [{ id: "lt-y3", title: "Establish yourself in the chosen path", detail: `Build depth in your specialization, grow your professional network, and take on projects with increasing responsibility.`, phase: "longTerm" }] },
      { year: "Year 4", milestones: [{ id: "lt-y4", title: "Develop advanced skills", detail: `Learn ${f.secondary.tool} at a deeper level, mentor newcomers, and contribute to larger projects or team goals.`, phase: "longTerm" }] },
      { year: "Year 5+", milestones: [{ id: "lt-y5", title: `Grow toward ${f.roles.senior}`, detail: `Leverage your diverse exploration background as a strength. Your breadth of experience is valuable for leadership and cross-functional work.`, phase: "longTerm" }] },
    ],
  };

  const decisionTree = buildTreeFromGoals("Discover your direction", shortTermGoals, longTermGoals, f);

  return {
    shortTermGoals,
    longTermGoals,
    collegeCourses: f.courses,
    internships: f.internships,
    certifications: f.certs,
    alternatePaths: f.altPaths,
    decisionTree,
    skillGap: f.skillGap,
  };
}

// ─────────────────────────────────────────────────────────
// Tree Builder Helper
// ─────────────────────────────────────────────────────────

function buildTreeFromGoals(goalText, shortTermGoals, longTermGoals, f) {
  const shortMilestones = [];
  shortTermGoals.months.forEach((m) => {
    m.milestones.forEach((ms) => {
      shortMilestones.push({
        id: ms.id,
        label: ms.title,
        type: "milestone",
        month: `Month ${m.month}`,
        detail: ms.detail,
        financialTiers: ["LOW", "MEDIUM", "HIGH"],
        status: "not_started",
        children: [],
      });
    });
  });

  const longMilestones = [];
  longTermGoals.years.forEach((y) => {
    y.milestones.forEach((ms) => {
      longMilestones.push({
        id: ms.id,
        label: ms.title,
        type: "goal",
        month: y.year,
        detail: ms.detail,
        financialTiers: ["LOW", "MEDIUM", "HIGH"],
        status: "not_started",
        children: [],
      });
    });
  });

  // Attach a few certifications or alternate paths to short term branch
  if (shortMilestones.length > 2 && f.certs[0]) {
    shortMilestones[2].children.push({
      id: "cert-1", label: f.certs[0].name.split(" ").slice(0, 4).join(" "), type: "milestone", month: shortMilestones[2].month,
      detail: f.certs[0].impact, financialTiers: f.certs[0].financialTiers, status: "not_started", children: [],
    });
  }
  if (shortMilestones.length > 4 && f.altPaths[0]) {
    shortMilestones[4].children.push({
      id: "tree-alt-1", label: `Alternate: ${f.altPaths[0].title}`, type: "alternate", month: shortMilestones[4].month,
      detail: f.altPaths[0].pivotRequired, financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "not_started", children: [],
    });
  }
  if (shortMilestones.length > 5 && f.certs[1]) {
    shortMilestones[5].children.push({
      id: "cert-2", label: f.certs[1].name.split(" ").slice(0, 4).join(" "), type: "milestone", month: shortMilestones[5].month,
      detail: f.certs[1].impact, financialTiers: f.certs[1].financialTiers, status: "not_started", children: [],
    });
  }

  // Create deep copies to break references before linking
  const clonedShortMilestones = shortMilestones.map(ms => JSON.parse(JSON.stringify(ms)));
  const clonedLongMilestones = longMilestones.map(ms => JSON.parse(JSON.stringify(ms)));

  // Link short term milestones linearly
  for (let i = 0; i < clonedShortMilestones.length - 1; i++) {
    clonedShortMilestones[i].children.push(clonedShortMilestones[i + 1]);
  }

  // Link long term milestones linearly
  for (let i = 0; i < clonedLongMilestones.length - 1; i++) {
    clonedLongMilestones[i].children.push(clonedLongMilestones[i + 1]);
  }

  // Create sub-roots for clarity
  const shortRoot = {
    id: "st-root", label: "Short-Term Path", type: "decision", month: "0-18 Months",
    detail: "Focus on these immediate steps to build your foundation.",
    financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "not_started",
    children: clonedShortMilestones.length > 0 ? [clonedShortMilestones[0]] : [],
  };

  const longRoot = {
    id: "lt-root", label: "Long-Term Path", type: "decision", month: "2-5 Years",
    detail: "Focus on these goals to advance your career long-term.",
    financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "not_started",
    children: clonedLongMilestones.length > 0 ? [clonedLongMilestones[0]] : [],
  };

  return {
    id: "root-now", label: "You are here", type: "decision", month: "Now",
    detail: `Start from your current stage toward: ${goalText}`,
    financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "in_progress",
    children: [shortRoot, longRoot],
  };
}

// ─────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────

export function generateMockRoadmap(profile) {
  const fieldConfig = getFieldConfig(profile);
  const phase = profile.onboardingPhase || 1;
  const field = fieldConfig.label || "your chosen field";

  const prefixMilestones = (list, prefix) => {
    return list.map((ms) => ({
      ...ms,
      id: `${prefix}${ms.id}`,
      prerequisites: (ms.prerequisites || []).map((pre) => ({
        ...pre,
        id: `${prefix}${pre.id}`,
      })),
    }));
  };

  // 1. Define Phase 1 Milestones Template
  // 1. Define Phase 1 Milestones Template
  const getPhase1Milestones = () => {
    const isChef = (profile.goal?.description || "").toLowerCase().includes("chef") ||
                   (profile.goal?.description || "").toLowerCase().includes("culinary") ||
                   (profile.goal?.description || "").toLowerCase().includes("cook") ||
                   (profile.goal?.description || "").toLowerCase().includes("hotel") ||
                   (profile.goal?.description || "").toLowerCase().includes("bakery") ||
                   (profile.goal?.description || "").toLowerCase().includes("food") ||
                   (profile.goal?.description || "").toLowerCase().includes("restaurant") ||
                   (profile.field?.customValue || "").toLowerCase().includes("chef") ||
                   (profile.field?.customValue || "").toLowerCase().includes("culinary");

    if (isChef) {
      return [
        {
          id: "goal-1",
          title: "Explore Cooking Curiosity & Flavor Basics",
          detail: "Start exploring taste profiles and helper tasks in home cooking under adult supervision. Prioritize sports and family dinners.",
          timeframe: "Month 3",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-1-1", title: "Flavor experiments", detail: "Practice mixing basic sweet, sour, salty, and savory ingredients.", phase: "goalsToAchieve", timeframe: "Month 3", prerequisites: [] },
            { id: "pre-1-2", title: "Sports & Hobbies", detail: "Play with friends and spend time outdoors daily.", phase: "goalsToAchieve", timeframe: "Month 3", prerequisites: [] }
          ]
        },
        {
          id: "goal-2",
          title: "Build Kitchen Safety & Measurement Basics",
          detail: "Learn stove safety, washing knives under adult guidance, and convert measurement metrics for simple family recipes.",
          timeframe: "Month 6",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-2-1", title: "Kitchen safety", detail: "Practice safe handling of hot containers and kitchen sanitation.", phase: "goalsToAchieve", timeframe: "Month 6", prerequisites: [] },
            { id: "pre-2-2", title: "Recipe scaling", detail: "Convert recipe cups to grams and halve or double ingredient proportions.", phase: "goalsToAchieve", timeframe: "Month 6", prerequisites: [] }
          ]
        },
        {
          id: "goal-3",
          title: "Deepen Food Science & Biology Concepts",
          detail: "Explore interesting cooking chemistry (fermentation, emulsification). Balance school curriculum and maintain active personal life.",
          timeframe: "Month 12",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-3-1", title: "Subject mastery", detail: "Master basic chemical reactions and biology units in school syllabus.", phase: "goalsToAchieve", timeframe: "Month 12", prerequisites: [] },
            { id: "pre-3-2", title: "First complete dish", detail: "Cook a basic 3-ingredient dish entirely by yourself under supervision.", phase: "goalsToAchieve", timeframe: "Month 12", prerequisites: [] }
          ]
        },
        {
          id: "goal-4",
          title: "10th Board Preparation & Stream Guidance",
          detail: "Prepare thoroughly for Class 10 school board examinations. Research vocational courses or Intermediate stream choices.",
          timeframe: "Year 2 (10th Grade)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-4-1", title: "Board mock tests", detail: "Complete 3 full board mock papers to build confidence.", phase: "goalsToAchieve", timeframe: "Year 2 (10th Grade)", prerequisites: [] },
            { id: "pre-4-2", title: "Culinary Stream Survey", detail: "Compare hotel management or culinary diplomas and discuss with parents.", phase: "goalsToAchieve", timeframe: "Year 2 (10th Grade)", prerequisites: [] }
          ]
        }
      ];
    }

    return [
      {
        id: "goal-1",
        title: "Explore Curiosity & Hobby Logic",
        detail: "Start exploring visual logic games and Scratch. Focus on building creative problem-solving skills (1-2 hours/week maximum). Prioritize sports and family dinners.",
        timeframe: "Month 3",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-1-1", title: "Logical puzzles", detail: "Solve 5 basic logical games or visual puzzles.", phase: "goalsToAchieve", timeframe: "Month 3", prerequisites: [] },
          { id: "pre-1-2", title: "Sports & Hobbies", detail: "Play with friends and spend time outdoors daily.", phase: "goalsToAchieve", timeframe: "Month 3", prerequisites: [] }
        ]
      },
      {
        id: "goal-2",
        title: "Build Digital Literacy Basics",
        detail: "Learn basic internet research, how word processors/spreadsheets work, and keep up with standard school academics and homework.",
        timeframe: "Month 6",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-2-1", title: "Keyboard confidence", detail: "Practice typing daily and learn search shortcuts.", phase: "goalsToAchieve", timeframe: "Month 6", prerequisites: [] },
          { id: "pre-2-2", title: "Scratch Project", detail: "Build a very simple mini-game using Scratch block coding.", phase: "goalsToAchieve", timeframe: "Month 6", prerequisites: [] }
        ]
      },
      {
        id: "goal-3",
        title: "Deepen Logic & Basic Science Concepts",
        detail: "Explore interesting math and science topics. Keep learning light, balance school syllabus, and maintain a healthy, active personal life.",
        timeframe: "Month 12",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-3-1", title: "Subject mastery", detail: "Master basic arithmetic and physics/commerce units in school.", phase: "goalsToAchieve", timeframe: "Month 12", prerequisites: [] },
          { id: "pre-3-2", title: "Create simple webpage", detail: "Code a very basic HTML/CSS page with a custom header.", phase: "goalsToAchieve", timeframe: "Month 12", prerequisites: [] }
        ]
      },
      {
        id: "goal-4",
        title: "10th Board Preparation & Stream Guidance",
        detail: "Prepare thoroughly for Class 10 school board examinations. Research CBSE, State Intermediate, and Polytechnic stream choices for next year.",
        timeframe: "Year 2 (10th Grade)",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-4-1", title: "Board mock tests", detail: "Complete 3 full board mock papers to build confidence.", phase: "goalsToAchieve", timeframe: "Year 2 (10th Grade)", prerequisites: [] },
          { id: "pre-4-2", title: "Stream Selection Survey", detail: "Compare courses and discuss with parent/adviser.", phase: "goalsToAchieve", timeframe: "Year 2 (10th Grade)", prerequisites: [] }
        ]
      }
    ];
  };

  // 2. Define Phase 2 Milestones Template
  const getPhase2Milestones = () => {
    const stream = profile.tenthPath || "CBSE";
    const electives = profile.streamElectives || "General MPC";
    const prep = profile.prepStyle || "Self-study";
    const isDiploma = stream === "DIPLOMA";

    if (isDiploma) {
      return [
        {
          id: "goal-1",
          title: "Transition to Polytechnic Diploma Stream",
          detail: `Adapt to the rigorous practical polytechnic syllabus. Build standard foundations in core engineering and branch subjects, and establish a solid daily routine.`,
          timeframe: "Month 3 (Stream Start)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-1-1", title: "Syllabus mapping", detail: `Obtain official branch textbook and lab manuals.`, phase: "goalsToAchieve", timeframe: "Month 3 (Stream Start)", prerequisites: [] },
            { id: "pre-1-2", title: "Lab preparation", detail: "Familiarize yourself with laboratory safety protocols and basic equipment.", phase: "goalsToAchieve", timeframe: "Month 3 (Stream Start)", prerequisites: [] }
          ]
        },
        {
          id: "goal-2",
          title: "Academic Routine & Foundations",
          detail: `Strengthen core theory subjects and practical labs using the ${prep} style. Maintain a healthy study-life balance.`,
          timeframe: "Month 6 (Study Habits)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-2-1", title: "Core unit test", detail: "Solve branch exercises and prepare active lab records.", phase: "goalsToAchieve", timeframe: "Month 6 (Study Habits)", prerequisites: [] },
            { id: "pre-2-2", title: "Intro to field tools", detail: `Learn basic software utilities or tools related to ${field}.`, phase: "goalsToAchieve", timeframe: "Month 6 (Study Habits)", prerequisites: [] }
          ]
        },
        {
          id: "goal-3",
          title: "Diploma Year 1 Exam Preparation",
          detail: `Focus heavily on scoring top marks in your Polytechnic 1st year examinations. Balance study with physical health.`,
          timeframe: "Month 12 (Diploma Year 1)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-3-1", title: "Board syllabus mock", detail: "Complete 3 full-length terminal mock tests based on past board exams.", phase: "goalsToAchieve", timeframe: "Month 12 (Diploma Year 1)", prerequisites: [] },
            { id: "pre-3-2", title: "Mini branch project", detail: `Create a small functional hardware/software prototype.`, phase: "goalsToAchieve", timeframe: "Month 12 (Diploma Year 1)", prerequisites: [] }
          ]
        },
        {
          id: "goal-4",
          title: "Diploma Year 2 & Lateral Entry Prep",
          detail: `Commence Year 2 syllabus and start competitive entrance foundations for lateral B.Tech entry.`,
          timeframe: "Year 2 (Diploma Year 2)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-4-1", title: "Lateral entry mocks", detail: "Subscribe to and write 5 mock lateral-entry entrance exams.", phase: "goalsToAchieve", timeframe: "Year 2 (Diploma Year 2)", prerequisites: [] },
            { id: "pre-4-2", title: "Industry certifications", detail: "Enroll in a relevant industry-aligned tool certification program.", phase: "goalsToAchieve", timeframe: "Year 2 (Diploma Year 2)", prerequisites: [] }
          ]
        },
        {
          id: "goal-5",
          title: "Final Diploma Exams & lateral B.Tech Counseling",
          detail: `Prepare extensively to clear final diploma boards with top scores and secure lateral engineering admission.`,
          timeframe: "Year 3 (Final Board / Diploma Year 3)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-5-1", title: "Complete board series", detail: "Solve 10 previous years' final polytechnic papers.", phase: "goalsToAchieve", timeframe: "Year 3 (Final Board / Diploma Year 3)", prerequisites: [] },
            { id: "pre-5-2", title: "Counseling review", detail: "Draft target engineering colleges, lateral-entry cutoffs, and counseling choices.", phase: "goalsToAchieve", timeframe: "Year 3 (Final Board / Diploma Year 3)", prerequisites: [] }
          ]
        }
      ];
    } else {
      return [
        {
          id: "goal-1",
          title: "Transition to Higher Secondary Stream",
          detail: `Adapt to the rigorous ${stream} syllabus. Build standard foundations in ${electives} subjects and establish a solid daily study routine.`,
          timeframe: "Month 3 (Stream Start)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-1-1", title: "Syllabus mapping", detail: `Obtain official textbook guides for ${electives}.`, phase: "goalsToAchieve", timeframe: "Month 3 (Stream Start)", prerequisites: [] },
            { id: "pre-1-2", title: "Time blocking", detail: "Allocate 2-3 hours/week of self-study outside of school hours.", phase: "goalsToAchieve", timeframe: "Month 3 (Stream Start)", prerequisites: [] }
          ]
        },
        {
          id: "goal-2",
          title: "Academic Routine & Foundations",
          detail: `Strengthen core subjects in ${electives} and start competitive exam preparation using the ${prep} style. Maintain a healthy sleep cycle.`,
          timeframe: "Month 6 (Study Habits)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-2-1", title: "Core unit test", detail: "Solve chapter-wise exercises for initial math/science units.", phase: "goalsToAchieve", timeframe: "Month 6 (Study Habits)", prerequisites: [] },
            { id: "pre-2-2", title: "Intro to field tools", detail: `Learn basic scripting or business excel related to ${field}.`, phase: "goalsToAchieve", timeframe: "Month 6 (Study Habits)", prerequisites: [] }
          ]
        },
        {
          id: "goal-3",
          title: "Board / Year 1 Exam Preparation",
          detail: `Focus heavily on scoring top marks in 11th standard / Inter Year 1 examinations. Balance mock tests with family support.`,
          timeframe: "Month 12 (Board / Exam Focus)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-3-1", title: "Board syllabus mock", detail: "Complete 3 full-length terminal mock tests.", phase: "goalsToAchieve", timeframe: "Month 12 (Board / Exam Focus)", prerequisites: [] },
            { id: "pre-3-2", title: "Mini analytical project", detail: `Create a small visual data summary or business model project.`, phase: "goalsToAchieve", timeframe: "Month 12 (Board / Exam Focus)", prerequisites: [] }
          ]
        },
        {
          id: "goal-4",
          title: "12th Board / Final Exams & College Entrance",
          detail: `Prepare extensively to clear final 12th board / Inter Year 2 exams. Complete university applications and mock entrance tests using the ${prep} style.`,
          timeframe: "Year 2 (Final Board & College Entrance)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-4-1", title: "Board mock tests", detail: "Solve 10 previous years' board papers and mock entrance exams.", phase: "goalsToAchieve", timeframe: "Year 2 (Final Board & College Entrance)", prerequisites: [] },
            { id: "pre-4-2", title: "College counseling review", detail: "Draft target colleges, cutoffs, and counseling choices.", phase: "goalsToAchieve", timeframe: "Year 2 (Final Board & College Entrance)", prerequisites: [] }
          ]
        }
      ];
    }
  };

  // 3. Define Phase 3 Milestones Template
  const getPhase3Milestones = () => {
    const degree = inferCollegeDegree(profile);
    const collegeEnv = profile.collegeEnvironment || "Regional College";
    const collegeFocus = profile.collegeFocus || "Campus Placements";
    const longTerm = profile.enableLongTerm !== false;

    const collegeMilestones = [
      {
        id: "goal-1",
        title: "Focus Strictly on College Academics",
        detail: `Adapt to the university curriculum in ${degree}. Focus entirely on building academic foundations, maintaining a high GPA, and joining college clubs. No internships or heavy work required.`,
        timeframe: "Undergrad Sem 1-2",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-1-1", title: "Maintain high GPA", detail: `Focus on score optimization in core foundational modules of your ${degree} program.`, phase: "goalsToAchieve", timeframe: "Undergrad Sem 1-2", prerequisites: [] },
          { id: "pre-1-2", title: "Campus assimilation", detail: "Join 1 field-related student branch or academic/hobby club.", phase: "goalsToAchieve", timeframe: "Undergrad Sem 1-2", prerequisites: [] }
        ]
      },
      {
        id: "goal-2",
        title: "Build Portfolio & Apply for Internships",
        detail: `Commence skill specialized learning in ${field}. Create hands-on projects and apply for your first paid internship via Internshala or LinkedIn.`,
        timeframe: "Undergrad Sem 3-4",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-2-1", title: "Professional Cert", detail: `Earn a professional certification like ${fieldConfig.certs[0]?.name || 'a relevant domain credential'} from ${fieldConfig.certs[0]?.platform || 'a recognized provider'}.`, phase: "goalsToAchieve", timeframe: "Undergrad Sem 3-4", prerequisites: [] },
          { id: "pre-2-2", title: "Internship search", detail: `Apply to 10+ stipend-based roles in ${field} on Internshala or target platforms.`, phase: "goalsToAchieve", timeframe: "Undergrad Sem 3-4", prerequisites: [] }
        ]
      },
      {
        id: "goal-3",
        title: "Placement Preparation & Advanced Projects",
        detail: `Deepen your expertise in ${field}. Conduct mock interviews, study field-specific case studies, and complete an advanced capstone project.`,
        timeframe: "Undergrad Sem 5-6",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-3-1", title: "Advanced Capstone", detail: `Complete a capstone project such as ${fieldConfig.portfolio || 'a comprehensive portfolio project'}.`, phase: "goalsToAchieve", timeframe: "Undergrad Sem 5-6", prerequisites: [] },
          { id: "pre-3-2", title: "Study common scenarios", detail: `Review core terminology, methodologies, case studies, or operational scenarios in ${field}.`, phase: "goalsToAchieve", timeframe: "Undergrad Sem 5-6", prerequisites: [] }
        ]
      },
      {
        id: "goal-4",
        title: "Final Placements & University Graduation",
        detail: `Apply for direct jobs or sit for campus placement drives (${collegeFocus}). Successfully graduate from university and prepare for professional operatorship.`,
        timeframe: "Undergrad Sem 7-8",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-4-1", title: "Placement drives", detail: "Apply to at least 15 entry-level positions.", phase: "goalsToAchieve", timeframe: "Undergrad Sem 7-8", prerequisites: [] },
          { id: "pre-4-2", title: "Clear university exams", detail: "Successfully complete university degree requirements.", phase: "goalsToAchieve", timeframe: "Undergrad Sem 7-8", prerequisites: [] }
        ]
      }
    ];

    const professionalMilestones = [
      {
        id: "goal-5",
        title: "Launch Junior Operator Role",
        detail: `Begin work as a junior professional. Adapt to industry workflows, build a robust professional network, and learn team dynamics.`,
        timeframe: "Year 5 (Junior Role)",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-5-1", title: "Master onboarding procedures", detail: "Study standard operating procedures, workflows, or tools at your workplace.", phase: "goalsToAchieve", timeframe: "Year 5 (Junior Role)", prerequisites: [] },
          { id: "pre-5-2", title: "Network on LinkedIn", detail: "Connect with 50+ practitioners in similar roles.", phase: "goalsToAchieve", timeframe: "Year 5 (Junior Role)", prerequisites: [] }
        ]
      },
      {
        id: "goal-6",
        title: "Transition to Mid-Level Specialist",
        detail: "Deepen domain expertise, take end-to-end ownership of project units, and mentor junior colleagues in standard workflows.",
        timeframe: "Year 6-7 (Mid-Level Role)",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-6-1", title: "Own operational unit", detail: "Successfully manage one key operational unit, task, or analysis in your domain.", phase: "goalsToAchieve", timeframe: "Year 6-7 (Mid-Level Role)", prerequisites: [] },
          { id: "pre-6-2", title: "Mentor junior", detail: "Guide 1 new hire or intern through onboarding.", phase: "goalsToAchieve", timeframe: "Year 6-7 (Mid-Level Role)", prerequisites: [] }
        ]
      },
      {
        id: "goal-7",
        title: "Attain Senior Professional Operatorship",
        detail: `Lead high-impact decisions and strategy in ${field}. Align key deliverables and pursue advanced strategic leadership.`,
        timeframe: "Year 8-9 (Senior Role)",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-7-1", title: "Process optimization", detail: "Optimize a major process or system in your domain to increase efficiency.", phase: "goalsToAchieve", timeframe: "Year 8-9 (Senior Role)", prerequisites: [] },
          { id: "pre-7-2", title: "Industry certification", detail: "Secure a globally recognized expert-level certification.", phase: "goalsToAchieve", timeframe: "Year 8-9 (Senior Role)", prerequisites: [] }
        ]
      },
      {
        id: "goal-8",
        title: "Establish Senior Leadership & Strategy",
        detail: "Mentor next-generation professionals/managers. Formulate high-level department strategies and influence corporate vision.",
        timeframe: "Year 10+ (Lead / Specialist)",
        phase: "goalsToAchieve",
        prerequisites: [
          { id: "pre-8-1", title: "Deliver key strategy", detail: "Formulate next-generation strategy or business vision.", phase: "goalsToAchieve", timeframe: "Year 10+ (Lead / Specialist)", prerequisites: [] },
          { id: "pre-8-2", title: "Speaking / Publishing", detail: "Speak at 1 industry event or publish a case paper.", phase: "goalsToAchieve", timeframe: "Year 10+ (Lead / Specialist)", prerequisites: [] }
        ]
      }
    ];

    return longTerm ? [...collegeMilestones, ...professionalMilestones] : collegeMilestones;
  };

  const getPhase4Milestones = () => {
    const postChoice = profile.postCollegeChoice || "FIND_JOB";
    const field = fieldConfig.label || "your chosen field";
    
    if (postChoice === "MASTERS") {
      return [
        {
          id: "goal-1",
          title: "PG Entrance & Preparation",
          detail: `Prepare extensively for target postgraduate entrance exams (like GATE, CAT, GRE, or university specific tests). Master advanced concepts in ${field}.`,
          timeframe: "Month 3 (Post-College)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-1-1", title: "Study materials", detail: "Procure previous year papers and mock test series.", phase: "goalsToAchieve", timeframe: "Month 3 (Post-College)", prerequisites: [] },
            { id: "pre-1-2", title: "Daily test practice", detail: "Solve 1 quantitative and 1 domain mock exercise daily.", phase: "goalsToAchieve", timeframe: "Month 3 (Post-College)", prerequisites: [] }
          ]
        },
        {
          id: "goal-2",
          title: "PG Admissions & Research Outline",
          detail: "Complete PG applications and outline your target research area. Secure letters of recommendation from college professors.",
          timeframe: "Month 6 (Initial Steps)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-2-1", title: "Draft SOP", detail: "Prepare Statement of Purpose and research proposals.", phase: "goalsToAchieve", timeframe: "Month 6 (Initial Steps)", prerequisites: [] },
            { id: "pre-2-2", title: "Admissions interview", detail: "Attend online counseling and college admissions interview rounds.", phase: "goalsToAchieve", timeframe: "Month 6 (Initial Steps)", prerequisites: [] }
          ]
        },
        {
          id: "goal-3",
          title: "Establish PG Academic Rhythm",
          detail: "Excel in your first semester of Master's study. Engage in deep specialization coursework and research seminars.",
          timeframe: "Month 12 (Core Growth)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-3-1", title: "Literature survey", detail: "Read 10 high-impact research publications in your niche.", phase: "goalsToAchieve", timeframe: "Month 12 (Core Growth)", prerequisites: [] },
            { id: "pre-3-2", title: "Master baseline tools", detail: "Master advanced modeling, statistics, or custom industry tools.", phase: "goalsToAchieve", timeframe: "Month 12 (Core Growth)", prerequisites: [] }
          ]
        },
        {
          id: "goal-4",
          title: "PG Thesis & Final Placements",
          detail: "Commence your Master's thesis/project work and participate in advanced campus placement drives or Ph.D. applications.",
          timeframe: "Year 2 (Advanced Level)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-4-1", title: "Thesis draft", detail: "Draft the first three chapters of your postgraduate thesis.", phase: "goalsToAchieve", timeframe: "Year 2 (Advanced Level)", prerequisites: [] },
            { id: "pre-4-2", title: "Supervisor review", detail: "Present progress reports to your supervisor and refine thesis details.", phase: "goalsToAchieve", timeframe: "Year 2 (Advanced Level)", prerequisites: [] }
          ]
        }
      ];
    } else if (postChoice === "ENTREPRENEURSHIP") {
      return [
        {
          id: "goal-1",
          title: "Ideation & MVP Validation",
          detail: `Validate your startup hypothesis. Build a minimal viable product (MVP) in the ${field} sector and release to 20 early users.`,
          timeframe: "Month 3 (Post-College)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-1-1", title: "User interviews", detail: "Interview 15 prospective customers about their pain points.", phase: "goalsToAchieve", timeframe: "Month 3 (Post-College)", prerequisites: [] },
            { id: "pre-1-2", title: "MVP Prototype", detail: "Create a simple landing page or block-mockup of the product.", phase: "goalsToAchieve", timeframe: "Month 3 (Post-College)", prerequisites: [] }
          ]
        },
        {
          id: "goal-2",
          title: "Refinement & Incorporation",
          detail: "Incorporate customer feedback to refine your product. Draft a detailed business plan, select co-founders, and register the company.",
          timeframe: "Month 6 (Initial Steps)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-2-1", title: "Product pivoting", detail: "Re-architect features that users found confusing or low value.", phase: "goalsToAchieve", timeframe: "Month 6 (Initial Steps)", prerequisites: [] },
            { id: "pre-2-2", title: "Legal registration", detail: "Setup partnership, LLP or private limited company parameters.", phase: "goalsToAchieve", timeframe: "Month 6 (Initial Steps)", prerequisites: [] }
          ]
        },
        {
          id: "goal-3",
          title: "Pitch Deck & Seed Funding Prep",
          detail: "Develop a compelling investor pitch deck. Identify target angel investors or startup incubators, and practice presentations.",
          timeframe: "Month 12 (Core Growth)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-3-1", title: "Financial modeling", detail: "Draft a 3-year cash flow and operational budget forecast.", phase: "goalsToAchieve", timeframe: "Month 12 (Core Growth)", prerequisites: [] },
            { id: "pre-3-2", title: "Apply to incubators", detail: "Submit applications to 3 regional startup accelerators.", phase: "goalsToAchieve", timeframe: "Month 12 (Core Growth)", prerequisites: [] }
          ]
        },
        {
          id: "goal-4",
          title: "Commercial Launch & Growth",
          detail: "Deploy product version 1.0. Initiate digital marketing campaigns to secure your first 100 paying customers.",
          timeframe: "Year 2 (Advanced Level)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-4-1", title: "Release v1.0", detail: "Launch your product officially on product sites and social media.", phase: "goalsToAchieve", timeframe: "Year 2 (Advanced Level)", prerequisites: [] },
            { id: "pre-4-2", title: "Customer acquisition", detail: "Run hyper-targeted ad campaigns to scale monthly recurring revenue.", phase: "goalsToAchieve", timeframe: "Year 2 (Advanced Level)", prerequisites: [] }
          ]
        }
      ];
    } else {
      return [
        {
          id: "goal-1",
          title: "Structured Job Search & Placement",
          detail: `Actively prepare for entry-level positions in ${field}. Complete 10 mock interviews and submit 15 targeted applications.`,
          timeframe: "Month 3 (Post-College)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-1-1", title: "Optimize profiles", detail: "Revamp LinkedIn and resume to match industry roles.", phase: "goalsToAchieve", timeframe: "Month 3 (Post-College)", prerequisites: [] },
            { id: "pre-1-2", title: "Submit applications", detail: "Submit applications to 15 companies hiring junior operators.", phase: "goalsToAchieve", timeframe: "Month 3 (Post-College)", prerequisites: [] }
          ]
        },
        {
          id: "goal-2",
          title: "Onboarding & Junior Performance",
          detail: "Excel in your first 3 months as a junior operator. Build strong rapport with teammates and adapt to the company codebase/process.",
          timeframe: "Month 6 (Initial Steps)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-2-1", title: "Company code alignment", detail: "Complete initial training modules and code/reporting conventions.", phase: "goalsToAchieve", timeframe: "Month 6 (Initial Steps)", prerequisites: [] },
            { id: "pre-2-2", title: "Team presentation", detail: "Deliver your first project demo or monthly team update.", phase: "goalsToAchieve", timeframe: "Month 6 (Initial Steps)", prerequisites: [] }
          ]
        },
        {
          id: "goal-3",
          title: "Independence & Key Contributions",
          detail: "Transition into an independent owner of tasks. Lead a feature release or manage major deliverables with minimal supervision.",
          timeframe: "Month 12 (Core Growth)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-3-1", title: "Complete own feature", detail: "Own, design, and deliver a standalone client feature/module.", phase: "goalsToAchieve", timeframe: "Month 12 (Core Growth)", prerequisites: [] },
            { id: "pre-3-2", title: "Mentorship onboarding", detail: "Help onboard a newer junior operator or intern in the team.", phase: "goalsToAchieve", timeframe: "Month 12 (Core Growth)", prerequisites: [] }
          ]
        },
        {
          id: "goal-4",
          title: "Scale to Mid-Level / Promotion Focus",
          detail: "Demonstrate senior potential. Prepare your performance logs and target a formal promotion or lateral transition.",
          timeframe: "Year 2 (Advanced Level)",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-4-1", title: "Performance audit log", detail: "Document your metrics, code reviews, and positive impacts.", phase: "goalsToAchieve", timeframe: "Year 2 (Advanced Level)", prerequisites: [] },
            { id: "pre-4-2", title: "Promotion review request", detail: "Schedule a formal career planning discussion with your manager.", phase: "goalsToAchieve", timeframe: "Year 2 (Advanced Level)", prerequisites: [] }
          ]
        }
      ];
    }
  };

  const startStage = profile.startStage || (profile.startedInPhase1 ? "CLASS_7_8" : (profile.startedInPhase2 ? "CLASS_9_10" : "UNDERGRADUATE"));
  let milestones = [];
  let description = "";

  if (startStage === "CLASS_7_8") {
    if (phase === 1) {
      description = `A gentle Phase 1 school-appropriate exploration path in ${field} up to Class 10 Board Exams.`;
      milestones = getPhase1Milestones();
    } else if (phase === 2) {
      const stream = profile.tenthPath || "CBSE";
      const electives = profile.streamElectives || "General MPC";
      description = `A customized Phase 2 higher secondary path for the ${stream} stream (${electives}) focusing on boards and entrance preparation.`;
      milestones = getPhase2Milestones();
    } else if (phase === 3) {
      const degree = inferCollegeDegree(profile);
      const collegeEnv = profile.collegeEnvironment || "Regional College";
      description = `A comprehensive Phase 3 roadmap pursuing ${degree} at a ${collegeEnv}, focusing strictly on college academics in Year 1.`;
      milestones = getPhase3Milestones();
    } else {
      const postChoice = profile.postCollegeChoice || "FIND_JOB";
      const postLabel = postChoice === "MASTERS" ? "Pursue Master's studies" : (postChoice === "ENTREPRENEURSHIP" ? "Start a Venture" : "Find a Job");
      description = `A targeted Phase 4 post-college roadmap focusing on "${postLabel}" in the field of ${field}.`;
      milestones = getPhase4Milestones();
    }
  } else if (startStage === "CLASS_9_10") {
    if (phase === 1) {
      description = `A gentle Phase 1 school-appropriate exploration path in ${field} up to Class 10 Board Exams.`;
      milestones = getPhase1Milestones();
    } else if (phase === 2) {
      const degree = inferCollegeDegree(profile);
      const collegeEnv = profile.collegeEnvironment || "Regional College";
      description = `A comprehensive Phase 2 roadmap pursuing ${degree} at a ${collegeEnv}, focusing strictly on college academics in Year 1.`;
      milestones = getPhase3Milestones();
    } else {
      const postChoice = profile.postCollegeChoice || "FIND_JOB";
      const postLabel = postChoice === "MASTERS" ? "Pursue Master's studies" : (postChoice === "ENTREPRENEURSHIP" ? "Start a Venture" : "Find a Job");
      description = `A targeted Phase 3 post-college roadmap focusing on "${postLabel}" in the field of ${field}.`;
      milestones = getPhase4Milestones();
    }
  } else if (startStage === "CLASS_11_12") {
    if (phase === 1) {
      const degree = inferCollegeDegree(profile);
      const collegeEnv = profile.collegeEnvironment || "Regional College";
      description = `A comprehensive Phase 1 roadmap pursuing ${degree} at a ${collegeEnv}, focusing strictly on college academics in Year 1.`;
      milestones = getPhase3Milestones();
    } else {
      const postChoice = profile.postCollegeChoice || "FIND_JOB";
      const postLabel = postChoice === "MASTERS" ? "Pursue Master's studies" : (postChoice === "ENTREPRENEURSHIP" ? "Start a Venture" : "Find a Job");
      description = `A targeted Phase 2 post-college roadmap focusing on "${postLabel}" in the field of ${field}.`;
      milestones = getPhase4Milestones();
    }
  } else if (startStage === "UNDERGRADUATE") {
    if (phase === 1) {
      const degree = inferCollegeDegree(profile);
      const collegeEnv = profile.collegeEnvironment || "Regional College";
      description = `A comprehensive Phase 1 roadmap pursuing ${degree} at a ${collegeEnv}, focusing strictly on college academics in Year 1.`;
      milestones = getPhase3Milestones();
    } else {
      let postChoice = profile.postCollegeChoice;
      if (!postChoice) {
        if (profile.mastersPreference && profile.mastersPreference !== "NONE") {
          postChoice = "MASTERS";
        } else if (profile.goal?.type === "STARTUP") {
          postChoice = "ENTREPRENEURSHIP";
        } else {
          postChoice = "FIND_JOB";
        }
      }
      const postLabel = postChoice === "MASTERS" ? "Pursue Master's studies" : (postChoice === "ENTREPRENEURSHIP" ? "Start a Venture" : "Find a Job");
      description = `A targeted Phase 2 post-college roadmap focusing on "${postLabel}" in the field of ${field}.`;
      milestones = getPhase4Milestones();
    }
  } else {
    // startStage === "POSTGRADUATE", "WORKING"
    let postChoice = profile.postCollegeChoice;
    if (!postChoice) {
      if (profile.mastersPreference && profile.mastersPreference !== "NONE") {
        postChoice = "MASTERS";
      } else if (profile.goal?.type === "STARTUP") {
        postChoice = "ENTREPRENEURSHIP";
      } else {
        postChoice = "FIND_JOB";
      }
    }
    const postLabel = postChoice === "MASTERS" ? "Pursue Master's studies" : (postChoice === "ENTREPRENEURSHIP" ? "Start a Venture" : "Find a Job");
    description = `A targeted Phase 1 post-college roadmap focusing on "${postLabel}" in the field of ${field}.`;
    milestones = getPhase4Milestones();
  }

  // Filter certifications / internships based on phase and budget
  const isSchool = 
    (startStage === "CLASS_7_8" && (phase === 1 || phase === 2)) ||
    (startStage === "CLASS_9_10" && phase === 1);
  const filteredCerts = isSchool ? [] : fieldConfig.certs;
  const filteredInternships = isSchool ? [] : fieldConfig.internships;

  // Re-build decisionTree cleanly from unified goals
  const decisionTreeMilestones = milestones.map((ms) => ({
    id: ms.id,
    label: ms.title,
    type: ms.timeframe.toLowerCase().includes("month") ? "milestone" : "goal",
    month: ms.timeframe,
    detail: ms.detail,
    financialTiers: ["LOW", "MEDIUM", "HIGH"],
    status: "not_started",
    children: []
  }));

  // Attach first cert if applicable
  if (fieldConfig.certs[0] && phase === 3) {
    const collegeYear2Ms = decisionTreeMilestones.find(ms => ms.id === "goal-2");
    if (collegeYear2Ms) {
      collegeYear2Ms.children.push({
        id: "cert-1",
        label: fieldConfig.certs[0].name.split(" ").slice(0, 4).join(" "),
        type: "milestone",
        month: collegeYear2Ms.month,
        detail: fieldConfig.certs[0].impact,
        financialTiers: fieldConfig.certs[0].financialTiers || ["LOW", "MEDIUM", "HIGH"],
        status: "not_started",
        children: [],
      });
    }
  }

  // Link milestones linearly
  for (let i = 0; i < decisionTreeMilestones.length - 1; i++) {
    decisionTreeMilestones[i].children.push(decisionTreeMilestones[i + 1]);
  }

  const roadmap = {
    goalsToAchieve: {
      description,
      milestones
    },
    collegeCourses: phase === 3 ? fieldConfig.courses : [],
    internships: filteredInternships,
    certifications: filteredCerts,
    alternatePaths: fieldConfig.altPaths,
    decisionTree: {
      id: "root-now",
      label: "You are here",
      type: "decision",
      month: "Now",
      detail: `Start from your current stage toward: ${goalLabel(profile)}`,
      financialTiers: ["LOW", "MEDIUM", "HIGH"],
      status: "in_progress",
      children: [
        {
          id: "goals-root",
          label: "Goals Path",
          type: "decision",
          month: "Chronological Path",
          detail: "Follow these immediate and long-term milestones sequentially.",
          financialTiers: ["LOW", "MEDIUM", "HIGH"],
          status: "not_started",
          children: decisionTreeMilestones.length > 0 ? [decisionTreeMilestones[0]] : [],
        }
      ],
    },
    skillGap: {
      have: fieldConfig.skillGap.have,
      need: fieldConfig.skillGap.need.map((n, idx) => {
        // Map to valid milestone IDs
        const mId = milestones[idx % milestones.length]?.id || "goal-1";
        return {
          skill: n.skill,
          milestoneId: mId
        };
      }),
      bridgingSteps: fieldConfig.skillGap.bridgingSteps
    }
  };

  const result = roadmapSchema.safeParse(roadmap);
  if (!result.success) {
    console.error("Mock roadmap validation failed:", result.error);
    // Return raw data so the app can still function
    return roadmap;
  }
  return result.data;
}
