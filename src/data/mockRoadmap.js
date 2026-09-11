import { parseRoadmap } from "../schemas/roadmapSchemas.js";

const mockRoadmap = {
  goalsToAchieve: {
    description: "Build a strong 18-month foundation for a student moving toward data analytics.",
    milestones: [
      {
        id: "goal-1",
        title: "Set up your career baseline",
        detail: "Write your current stage, top 3 strengths, weak areas, budget tier, weekly study hours, and one preferred career direction in a simple tracker.",
        timeframe: "Month 1",
        phase: "goalsToAchieve",
        prerequisites: [
          {
            id: "pre-1-1",
            title: "Baseline Setup",
            detail: "Establish strengths, weaknesses and study commitment logs.",
            phase: "goalsToAchieve",
            timeframe: "Month 1",
            prerequisites: []
          }
        ]
      },
      {
        id: "goal-2",
        title: "Build spreadsheet confidence",
        detail: "Practice formulas, lookup functions, pivot tables, charts, and cleaning messy data. Finish one mini-report using a public dataset.",
        timeframe: "Month 3",
        phase: "goalsToAchieve",
        prerequisites: []
      },
      {
        id: "goal-3",
        title: "Complete Python fundamentals",
        detail: "Finish a beginner Python course, solve 30 small exercises, and publish two notebooks that explain your thinking clearly.",
        timeframe: "Month 6",
        phase: "goalsToAchieve",
        prerequisites: []
      },
      {
        id: "goal-4",
        title: "Add SQL and structured practice",
        detail: "Learn SELECT, JOIN, GROUP BY, filtering, and subqueries. Practice with 3 small datasets and save your query notes.",
        timeframe: "Month 9",
        phase: "goalsToAchieve",
        prerequisites: []
      },
      {
        id: "goal-5",
        title: "Publish first portfolio project",
        detail: "Create a dashboard using a public Indian dataset, write a short case study, and add screenshots, insights, and next-step recommendations.",
        timeframe: "Month 12",
        phase: "goalsToAchieve",
        prerequisites: []
      },
      {
        id: "goal-6",
        title: "Prepare for interviews and outreach",
        detail: "Write 6 short stories about projects, mistakes, learning moments, teamwork, and problem-solving. Use them for internship interviews.",
        timeframe: "Month 15",
        phase: "goalsToAchieve",
        prerequisites: []
      },
      {
        id: "goal-7",
        title: "Apply for focused internships",
        detail: "Prepare a one-page resume, portfolio link, and short outreach message. Apply to 20 roles and track responses weekly.",
        timeframe: "Month 18",
        phase: "goalsToAchieve",
        prerequisites: []
      }
    ]
  },
  collegeCourses: [
    {
      id: "course-stats",
      name: "Statistics for Data Science",
      semester: "Next available semester",
      reason: "Core probability and inference concepts help with analytics interviews.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"]
    },
    {
      id: "course-dbms",
      name: "Database Management Systems",
      semester: "Within 2 semesters",
      reason: "SQL and data modeling are must-have data analyst skills.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"]
    },
    {
      id: "course-product",
      name: "Product Analytics Workshop",
      semester: "After Python basics",
      reason: "Adds practical business context and metrics thinking.",
      financialTiers: ["MEDIUM", "HIGH"]
    }
  ],
  internships: [
    {
      id: "intern-research",
      role: "Research Assistant - Data Collection",
      when: "Months 6-10",
      platforms: ["College department", "LinkedIn", "Internshala"],
      stipendNote: "Good first option; prioritize stipend listings if financial tier is LOW.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"]
    },
    {
      id: "intern-dashboard",
      role: "Dashboard Intern",
      when: "Months 12-18",
      platforms: ["Internshala", "LinkedIn", "Wellfound"],
      stipendNote: "Aim for stipend-first roles once one portfolio dashboard is ready.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"]
    },
    {
      id: "intern-product",
      role: "Product Analytics Intern",
      when: "Year 2",
      platforms: ["LinkedIn", "Wellfound", "Company career pages"],
      stipendNote: "More competitive; strong for students who can spend time on advanced projects.",
      financialTiers: ["MEDIUM", "HIGH"]
    }
  ],
  certifications: [
    {
      id: "cert-nptel-python",
      name: "Programming, Data Structures and Algorithms using Python",
      platform: "NPTEL",
      cost: "Free to learn; optional paid exam",
      duration: "8 weeks",
      impact: "Builds credible Python fundamentals on a low-cost path.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"]
    },
    {
      id: "cert-google-da",
      name: "Google Data Analytics Certificate",
      platform: "Coursera",
      cost: "Paid subscription; financial aid available",
      duration: "3-6 months",
      impact: "Useful structured path with portfolio-friendly assignments.",
      financialTiers: ["MEDIUM", "HIGH"]
    },
    {
      id: "cert-powerbi",
      name: "Power BI Data Analyst",
      platform: "Microsoft Learn",
      cost: "Free learning path; paid exam optional",
      duration: "4-6 weeks",
      impact: "Shows dashboarding ability for internship and entry-level roles.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"]
    }
  ],
  alternatePaths: [
    {
      id: "alt-bi",
      title: "Business Intelligence Analyst",
      salaryRange: "INR 4-9 LPA entry to early career",
      skillOverlap: 82,
      pivotRequired: "Add Power BI, SQL depth, and dashboard storytelling."
    },
    {
      id: "alt-product",
      title: "Product Analyst",
      salaryRange: "INR 5-12 LPA early career",
      skillOverlap: 68,
      pivotRequired: "Add metrics, funnels, experimentation, and product sense."
    },
    {
      id: "alt-ops",
      title: "Operations Analyst",
      salaryRange: "INR 3.5-8 LPA entry to early career",
      skillOverlap: 74,
      pivotRequired: "Add process mapping, Excel modeling, and stakeholder reporting."
    }
  ],
  decisionTree: {
    id: "root-now",
    label: "You are here",
    type: "decision",
    month: "Now",
    detail: "Start from your current education stage, skills, and financial context.",
    financialTiers: ["LOW", "MEDIUM", "HIGH"],
    status: "in_progress",
    children: [
      {
        id: "goal-1",
        label: "Set up baseline",
        type: "milestone",
        month: "Month 1",
        detail: "Create baseline tracker.",
        financialTiers: ["LOW", "MEDIUM", "HIGH"],
        status: "not_started",
        children: []
      }
    ]
  },
  skillGap: {
    have: ["Basic digital literacy", "Curiosity", "Presentation basics"],
    need: [
      { skill: "Python", milestoneId: "goal-3" },
      { skill: "SQL", milestoneId: "goal-4" },
      { skill: "Statistics", milestoneId: "goal-2" },
      { skill: "Dashboarding", milestoneId: "goal-5" }
    ],
    bridgingSteps: [
      "Learn spreadsheet analysis first.",
      "Move into Python notebooks.",
      "Add SQL and one public dashboard project."
    ]
  }
};

export const validatedMockRoadmap = parseRoadmap(mockRoadmap);
