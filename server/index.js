import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import pdfParse from "pdf-parse";
import { z } from "zod";

// Sanitization Utility
function sanitizeInput(val, maxLength = 500) {
  if (typeof val !== "string") return val;
  // Remove null bytes and control characters (allowing spaces, newlines, typical punctuation)
  let clean = val.replace(/\0/g, "");
  clean = clean.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  
  // Strip backticks, curly braces, and markdown code blocks
  clean = clean.replace(/```[a-z]*\s*/gi, "");
  clean = clean.replace(/`|{|}/g, "");
  
  // Escape/strip prompt engineering delimiters and instruction markers
  clean = clean.replace(/(?:###|---|===|System:|User:|Assistant:|Developer:|Instruction:)/gi, "");
  
  // Limit length
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean.trim();
}

function sanitizeProfile(profile) {
  if (!profile) return profile;
  const sanitized = { ...profile };
  
  if (sanitized.name) {
    sanitized.name = sanitizeInput(sanitized.name, 100);
  }
  if (sanitized.goal) {
    const goal = typeof sanitized.goal === "object" ? { ...sanitized.goal } : {};
    if (goal.description) {
      goal.description = sanitizeInput(goal.description, 500);
    }
    if (goal.type) {
      goal.type = sanitizeInput(goal.type, 100);
    }
    sanitized.goal = goal;
  }
  if (sanitized.field) {
    const field = typeof sanitized.field === "object" ? { ...sanitized.field } : {};
    if (field.customValue) {
      field.customValue = sanitizeInput(field.customValue, 200);
    }
    if (field.type) {
      field.type = sanitizeInput(field.type, 100);
    }
    sanitized.field = field;
  }
  if (Array.isArray(sanitized.skills)) {
    sanitized.skills = sanitized.skills.map(skill => sanitizeInput(skill, 50));
  }
  if (Array.isArray(sanitized.preferences)) {
    sanitized.preferences = sanitized.preferences.map(pref => sanitizeInput(pref, 100));
  }
  
  const textFields = [
    "academicFocus", "timeCommitment", "tenthPath", "streamElectives", "prepStyle",
    "collegeDegree", "collegeEnvironment", "collegeFocus", "postCollegeChoice",
    "mastersPreference", "startStage", "stage"
  ];
  
  for (const fieldName of textFields) {
    if (sanitized[fieldName] !== undefined) {
      sanitized[fieldName] = sanitizeInput(sanitized[fieldName], 100);
    }
  }
  
  return sanitized;
}

// Zod Validation Schemas
const profileSchema = z.object({
  name: z.string().trim().min(1, "Profile name is required"),
  stage: z.string().trim().min(1, "Profile stage is required"),
  goal: z.object({
    type: z.string().trim().min(1, "Goal type is required"),
    description: z.string().trim().min(1, "Goal description is required")
  }).passthrough()
}).passthrough();

const generateDeepQuestionsSchema = z.object({
  profile: profileSchema,
  roadmap: z.object({}).passthrough()
}).passthrough();

const generateDeepRoadmapSchema = z.object({
  profile: profileSchema,
  roadmap: z.object({}).passthrough(),
  answers: z.array(z.object({
    questionId: z.string().trim().optional(),
    questionText: z.string().trim().min(1, "questionText is required"),
    answerText: z.string().trim().min(1, "answerText is required")
  }).passthrough()).min(1, "At least one answer is required")
}).passthrough();

const nodeContentSchema = z.object({
  profile: profileSchema,
  nodeType: z.string().trim().min(1, "nodeType is required"),
  nodeId: z.string().trim().min(1, "nodeId is required"),
  nodeLabel: z.string().trim().min(1, "nodeLabel is required"),
  parentNodeLabel: z.string().trim().optional(),
  completedMilestones: z.array(z.string()).optional(),
  userSelections: z.object({}).passthrough().optional(),
  allCompletedGoals: z.array(z.string()).optional()
}).passthrough();

const checkpointSchema = z.object({
  profile: profileSchema,
  checkpointLabel: z.string().trim().min(1, "checkpointLabel is required"),
  completedGoals: z.array(z.string()).optional(),
  completedSkills: z.array(z.string()).optional(),
  completedCerts: z.array(z.string()).optional(),
  completedInternships: z.array(z.string()).optional()
}).passthrough();

const careerChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "model", "system"]),
    content: z.string().trim().min(1, "Message content is required")
  })).min(1, "At least one message is required"),
  profile: profileSchema,
  roadmap: z.object({}).passthrough().nullable().optional(),
  resumeAnalysis: z.object({}).passthrough().nullable().optional()
}).passthrough();

const marketIntelligenceSchema = z.object({
  jobTitle: z.string().trim().min(1, "jobTitle is required"),
  field: z.string().trim().optional(),
  location: z.string().trim().optional()
}).passthrough();

const suggestSkillsSchema = z.object({
  fieldType: z.string().trim().min(1, "fieldType is required"),
  customFieldValue: z.string().trim().optional()
}).passthrough();

const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
    return res.status(400).json({ error: `Invalid input data: ${details}` });
  }
  next();
};

function cleanGeminiJsonResponse(text) {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

// ESM equivalent of __filename / __dirname (module-scoped so all routes can use them)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// override:true so values in .env take precedence over any stale shell/system
// environment variables (e.g. an old OPENAI_API_KEY exported globally).
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported for resume analysis."), false);
    }
  }
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CONFIGURED = Boolean(OPENAI_API_KEY) && OPENAI_API_KEY !== "YOUR_ACTUAL_OPENAI_API_KEY";
if (!OPENAI_CONFIGURED) {
  console.warn(
    "[Backend] OPENAI_API_KEY is not configured. Server starting in local fallback (mock) mode. " +
    "Set OPENAI_API_KEY in your .env file to enable live AI generation."
  );
}
// Model used for all generation. Override via OPENAI_MODEL in .env.
// Good options: gpt-4o-mini (fast, cheap, native JSON mode), gpt-4o (higher quality).
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Thin adapter that preserves the previous provider's call shape
// (getGenerativeModel(...).generateContent(prompt) -> { response: { text() } }),
// so all existing route handlers work unchanged. Every prompt requests a JSON
// object, so we always ask OpenAI for JSON via response_format.
function createAIClient(apiKey) {
  const client = new OpenAI({ apiKey });
  return {
    getGenerativeModel({ model }) {
      return {
        async generateContent(prompt) {
          const completion = await client.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.2
          });
          const text = completion.choices?.[0]?.message?.content ?? "";
          return { response: { text: () => text } };
        }
      };
    }
  };
}

// When no key is configured, genAI stays null so every route falls back to local mock data.
const genAI = OPENAI_CONFIGURED ? createAIClient(OPENAI_API_KEY) : null;

// Programmatically build the decision tree nodes linearly from milestones to ensure absolute Zod compliance
function buildTreeFromGoals(goalText, goalsToAchieve, collegeCourses, internships, certifications, alternatePaths) {
  const milestones = [];
  goalsToAchieve.milestones.forEach((ms) => {
    milestones.push({
      id: ms.id,
      label: ms.title,
      type: ms.timeframe.toLowerCase().includes("month") ? "milestone" : "goal",
      month: ms.timeframe,
      detail: ms.detail,
      financialTiers: ["LOW", "MEDIUM", "HIGH"],
      status: "not_started",
      children: [],
    });
  });

  // Attach a few certifications or alternate paths to goalsToAchieve branch
  if (milestones.length > 2 && certifications[0]) {
    milestones[2].children.push({
      id: "cert-1",
      label: certifications[0].name.split(" ").slice(0, 4).join(" "),
      type: "milestone",
      month: milestones[2].month,
      detail: certifications[0].impact,
      financialTiers: certifications[0].financialTiers || ["LOW", "MEDIUM", "HIGH"],
      status: "not_started",
      children: [],
    });
  }
  if (milestones.length > 4 && alternatePaths[0]) {
    milestones[4].children.push({
      id: "tree-alt-1",
      label: `Alternate: ${alternatePaths[0].title}`,
      type: "alternate",
      month: milestones[4].month,
      detail: alternatePaths[0].pivotRequired,
      financialTiers: ["LOW", "MEDIUM", "HIGH"],
      status: "not_started",
      children: [],
    });
  }
  if (milestones.length > 5 && certifications[1]) {
    milestones[5].children.push({
      id: "cert-2",
      label: certifications[1].name.split(" ").slice(0, 4).join(" "),
      type: "milestone",
      month: milestones[5].month,
      detail: certifications[1].impact,
      financialTiers: certifications[1].financialTiers || ["LOW", "MEDIUM", "HIGH"],
      status: "not_started",
      children: [],
    });
  }

  // Link milestones linearly
  for (let i = 0; i < milestones.length - 1; i++) {
    milestones[i].children.push(milestones[i + 1]);
  }

  const rootPath = {
    id: "goals-root",
    label: "Goals Path",
    type: "decision",
    month: "Chronological Path",
    detail: "Follow these immediate and long-term milestones sequentially.",
    financialTiers: ["LOW", "MEDIUM", "HIGH"],
    status: "not_started",
    children: milestones.length > 0 ? [milestones[0]] : [],
  };

  return {
    id: "root-now",
    label: "You are here",
    type: "decision",
    month: "Now",
    detail: `Start from your current stage toward: ${goalText}`,
    financialTiers: ["LOW", "MEDIUM", "HIGH"],
    status: "in_progress",
    children: [rootPath],
  };
}

function inferCollegeDegree(profile) {
  if (profile.collegeDegree && profile.collegeDegree.trim()) {
    return profile.collegeDegree.trim();
  }

  const fieldType = profile.field?.type;
  const customField = (profile.field?.customValue || "").toLowerCase();
  const goalDesc = (profile.goal?.description || "").toLowerCase();

  if (
    customField.includes("chef") || customField.includes("culinary") || customField.includes("cook") || 
    customField.includes("bakery") || customField.includes("pastry") || customField.includes("hotel") || 
    customField.includes("restaurant") || customField.includes("hospitality") || customField.includes("catering") ||
    goalDesc.includes("chef") || goalDesc.includes("culinary") || goalDesc.includes("cook") || 
    goalDesc.includes("bakery") || goalDesc.includes("pastry") || goalDesc.includes("hotel") || 
    goalDesc.includes("restaurant") || goalDesc.includes("hospitality") || goalDesc.includes("catering")
  ) {
    return "Bachelor's in Culinary Arts / Culinary Science";
  }

  if (fieldType === "TECH") {
    if (goalDesc.includes("data analyst") || goalDesc.includes("analytics")) {
      return "B.Sc in Data Science / BCA";
    }
    return "B.Tech Computer Science / Information Technology";
  }
  if (fieldType === "SCIENCE") {
    return "B.Sc (Bachelor of Science)";
  }
  if (fieldType === "COMMERCE") {
    if (goalDesc.includes("chartered accountant") || goalDesc.includes("audit") || goalDesc.includes("finance")) {
      return "B.Com / B.B.A. Finance";
    }
    return "B.Com (Bachelor of Commerce)";
  }
  if (fieldType === "ARTS") {
    return "Bachelor of Arts (B.A.)";
  }
  if (fieldType === "LAW") {
    return "B.A. LL.B. (Integrated Law)";
  }
  if (fieldType === "MEDICINE") {
    return "M.B.B.S. (Bachelor of Medicine, Bachelor of Surgery)";
  }
  if (fieldType === "DESIGN") {
    return "B.Des (Bachelor of Design)";
  }

  return "Bachelor's Degree Program";
}

// Generate the prompt to send to OpenAI
function constructPrompt(profile) {
  const fieldLabel = profile.field.type === "OTHER" ? profile.field.customValue : profile.field.type;
  const degree = inferCollegeDegree(profile);
  const collegeEnv = profile.collegeEnvironment || "College";
  const collegeFocus = profile.collegeFocus || "Campus Placements";
  const timeCommit = profile.timeCommitment || "Balanced";
  const longTerm = profile.enableLongTerm !== false;

  let extraContext = "";
  let stageRulesPrompt = "";
  let goalsToAchieveInstructions = "";

  let guardrailsPrompt = `
### STRICT DOMAIN & LOCALIZATION GUARDRAILS:

1. **Prerequisite Chronology Rule**: You MUST schedule basic foundations before advanced frameworks. For example, "Foundations" (e.g., Statistics, Mathematics, Basic Excel, programming syntax) MUST always be placed in an earlier milestone bucket than "Advanced Frameworks & Tools" (e.g., Pandas, NumPy, Power BI, SQL databases, advanced frameworks) which belong in subsequent buckets.
2. **Regional Platform Standardization**: To keep suggestions practical and localized for the Indian educational ecosystem:
   - For **College Courses/Classes**: Suggest and prioritize **NPTEL** or **SWAYAM** for online credits and courses.
   - For **Internships & Jobs search**: Suggest and prioritize **Internshala** or **Naukri** as platforms.
   - For **Certifications**: Suggest and prioritize **NASSCOM**, **FutureSkills Prime**, or **SWAYAM** certifications rather than expensive Western platforms.
3. **Current Skill Adaptation**: Analyze the user's "Current Skills". If they already possess foundational skills, DO NOT repeat them in the first milestones; instead, start their roadmap at an appropriately advanced level.
`;

  if (profile.financialTier === "LOW") {
    guardrailsPrompt += `
3. **Strict Low-Budget Stipend Rule**: The user has selected a LOW financial budget tier. You MUST NOT suggest any unpaid, volunteer, or open-ended portfolio roles. Every recommended internship role MUST be immediately actionable and guaranteed to pay a monthly stipend. Prioritize internship listings found directly on **Internshala** or **Naukri** that pay a guaranteed stipend.
`;
  } else {
    guardrailsPrompt += `
3. **Stipend Guidance**: Ensure suggested internships have realistic budget context (e.g. paid vs stipend-based platform options) matching their budget tier: ${profile.financialTier}.
`;
  }

  // 1. Determine timeline phases based on user's current stage
  let milestoneTimeframes = [];
  
  if (profile.stage === "CLASS_7_8") {
    milestoneTimeframes = [
      "Grade 8 (Months 1-6)",
      "Grade 8 (Months 7-12)",
      "Grade 9 (Year 2)",
      "Grade 10 (Year 3 - Board Exams)",
      "Grade 11 (Year 4 - Stream Start)",
      "Grade 12 (Year 5 - Final Boards)",
      "College Year 1",
      "College Year 2",
      "College Year 3",
      "College Year 4",
      "Year 5 (Junior Role)",
      "Year 6-7 (Mid-Level Role)",
      "Year 8-9 (Senior Role)",
      "Year 10+ (Lead / Specialist)"
    ];
    stageRulesPrompt = `
### STAGE-SPECIFIC INSTRUCTIONS FOR CLASS_7_8 (Middle School):
- You are starting from Middle School (Grade 8). You must generate milestones for every academic year from Grade 8 all the way to college graduation and career progression.
- For Grade 8 and 9, focus purely on school academics, visual/block coding (Scratch), basic logic, math games, hobbies, physical activity, and family dinners. Keep study load under 1-2 hours/week. Do NOT assign advanced subjects or cloud/framework tools.
- For Grade 10, focus on Board Exams preparation and stream/track choices.
- For Grade 11 and 12, focus on stream adaptation (PCM, PCB, Commerce, or Humanities) and college entrance exam preparation.
- For College Years 1-4, focus on academics in Year 1, upskilling and internships in Years 2-3, and placements/graduation in Year 4.
- For Years 5+, focus on job onboarding, mid-level progression, and senior leadership.
`;
  } else if (profile.stage === "CLASS_9_10") {
    milestoneTimeframes = [
      "Grade 9 (Months 1-12)",
      "Grade 10 (Year 2 - Board Exams)",
      "Grade 11 (Year 3 - Stream Start)",
      "Grade 12 (Year 4 - Final Boards)",
      "College Year 1",
      "College Year 2",
      "College Year 3",
      "College Year 4",
      "Year 5 (Junior Role)",
      "Year 6-7 (Mid-Level Role)",
      "Year 8-9 (Senior Role)",
      "Year 10+ (Lead / Specialist)"
    ];
    stageRulesPrompt = `
### STAGE-SPECIFIC INSTRUCTIONS FOR CLASS_9_10 (High School):
- You are starting from High School (Grade 9). You must generate milestones for every academic year from Grade 9 all the way to college graduation and career progression.
- For Grade 9, focus on coding basics, mathematics, science, hobbies, and sports.
- For Grade 10, focus on 10th Board Exams and stream selection (CBSE, State Board, or Polytechnic Diploma).
- For Grade 11 and 12, focus on stream adaptation, boards, and entrance exams.
- For College Years 1-4, focus on academics in Year 1, upskilling and internships in Years 2-3, and placements/graduation in Year 4.
- For Years 5+, focus on job onboarding, mid-level progression, and senior leadership.
`;
  } else if (profile.stage === "CLASS_11_12") {
    milestoneTimeframes = [
      "Grade 11 (Stream Start)",
      "Grade 12 (Final Boards)",
      "College Year 1",
      "College Year 2",
      "College Year 3",
      "College Year 4",
      "Year 5 (Junior Role)",
      "Year 6-7 (Mid-Level Role)",
      "Year 8-9 (Senior Role)",
      "Year 10+ (Lead / Specialist)"
    ];
    stageRulesPrompt = `
### STAGE-SPECIFIC INSTRUCTIONS FOR CLASS_11_12 (Higher Secondary):
- You are starting from Higher Secondary (Grade 11). You must generate milestones for every academic year from Grade 11 all the way to college graduation and career progression.
- For Grade 11, focus on stream adaptation and academic study habits.
- For Grade 12, focus on 12th Board Exams and college entrance exams.
- For College Years 1-4, focus on academics in Year 1, upskilling and internships in Years 2-3, and placements/graduation in Year 4.
- For Years 5+, focus on job onboarding, mid-level progression, and senior leadership.
`;
  } else if (profile.stage === "UNDERGRADUATE") {
    milestoneTimeframes = [
      "College Year 1",
      "College Year 2",
      "College Year 3",
      "College Year 4",
      "Year 5 (Junior Role)",
      "Year 6-7 (Mid-Level Role)",
      "Year 8-9 (Senior Role)",
      "Year 10+ (Lead / Specialist)"
    ];
    stageRulesPrompt = `
### STAGE-SPECIFIC INSTRUCTIONS FOR UNDERGRADUATE (College):
- You are starting from College. You must generate milestones for every year of college and career progression.
- For College Year 1, focus purely on academics, GPA, and campus clubs. Do NOT recommend internships or heavy job hunt.
- For College Years 2-3, recommend certifications, mini-projects, and stipend-based internships.
- For College Year 4, focus on capstone projects, placement drives, and graduation.
- For Years 5+, focus on job onboarding, mid-level progression, and senior leadership.
`;
  } else if (profile.stage === "POSTGRADUATE") {
    milestoneTimeframes = [
      "Postgrad Year 1",
      "Postgrad Year 2",
      "Year 3 (Junior Role)",
      "Year 4-5 (Mid-Level Role)",
      "Year 6-7 (Senior Role)",
      "Year 8+ (Lead / Specialist)"
    ];
    stageRulesPrompt = `
### STAGE-SPECIFIC INSTRUCTIONS FOR POSTGRADUATE (Masters):
- You are starting from Postgraduate studies. You must generate milestones for Postgraduate Year 1, Year 2, and career progression.
- For Year 1, focus on advanced specialization coursework, research methodologies, and specialized certifications.
- For Year 2, focus on thesis/project, internships, and placements.
- For Years 3+, focus on career progression from junior to senior lead roles.
`;
  } else {
    // WORKING
    milestoneTimeframes = [
      "Working Year 1",
      "Working Year 2",
      "Year 3 (Junior Role)",
      "Year 4-5 (Mid-Level Role)",
      "Year 6-7 (Senior Role)",
      "Year 8+ (Lead / Specialist)"
    ];
    stageRulesPrompt = `
### STAGE-SPECIFIC INSTRUCTIONS FOR WORKING (Professional):
- You are starting from a Working position. You must generate milestones for Working Year 1, Year 2, and career progression.
- For Year 1, focus on intensive upskilling, mastering core tools, and earning professional certifications to build career credibility.
- For Year 2, focus on portfolio building, lateral transitions, or owning larger projects.
- For Years 3+, focus on career progression from junior to senior lead roles.
`;
  }

  extraContext += `\n- **College Degree & Branch**: ${degree}`;
  extraContext += `\n- **College Environment**: ${collegeEnv}`;
  extraContext += `\n- **Graduation Focus**: ${collegeFocus}`;
  extraContext += `\n- **Spare Time Commitment**: ${timeCommit}`;
  extraContext += `\n- **Enable Long-Term Career Path**: ${longTerm ? "Yes" : "No"}`;

  goalsToAchieveInstructions = `
- **description**: A comprehensive chronological pathway mapped to your career objectives.
- **milestones**: A chronological array of exactly ${milestoneTimeframes.length} sequential milestone objects. You MUST include exactly the following timeframe markers sequentially:
  ${milestoneTimeframes.map((tf, i) => `${i + 1}. "${tf}"`).join("\n  ")}

  CRITICAL TIMEFRAME RULE: The "timeframe" field of each milestone MUST be copied character-for-character from the list above. Do NOT paraphrase, abbreviate, or reword the timeframe strings. Each milestone's title and detail MUST describe activities ONLY appropriate for that SPECIFIC year/stage (e.g., Grade 8 activities must not mention internships or certifications; College Year 1 must not mention Grade 11 board exams).

  - Each milestone has:
    - **id**: string (e.g. "goal-1", "goal-2", ..., "goal-${milestoneTimeframes.length}")
    - **title**: string (Highly specific title relevant ONLY to that specific year/stage and target goal — never mix content from a different stage)
    - **detail**: string (Detailed action items relevant ONLY to that specific year/stage — must be age/stage-appropriate)
    - **timeframe**: string (MUST be copied exactly from the timeframe list above — do not modify it)
    - **phase**: always the literal string "goalsToAchieve"
    - **prerequisites**: An array of 2-3 sub-task objects. Each sub-task has: id (string), title (string), detail (string), phase ("goalsToAchieve"), timeframe (same as parent), prerequisites (empty array []).
`;

  const promptText = `You are an expert career consultant and academic advisor specializing in school/college education systems, polytechnic diplomas, and postgraduate pathways. Create a highly customized, realistic, and detailed career roadmap for a student/professional with the following profile:

- **Name**: ${profile.name}
- **Stage**: ${profile.stage} (options: CLASS_7_8, CLASS_9_10, CLASS_11_12, UNDERGRADUATE, POSTGRADUATE, WORKING)${extraContext}
- **Age**: ${profile.age} years old
- **Field/Discipline**: ${fieldLabel}
- **Current Skills**: ${profile.skills.join(", ")}
- **Career Goal Type**: ${profile.goal.type} (options: JOB_ROLE, STARTUP, HIGHER_STUDIES, NOT_SURE)
- **Career Goal Description**: "${profile.goal.description}"
- **Financial Status/Budget Tier**: ${profile.financialTier} (options: LOW - requires free resources, MEDIUM - moderate budget, HIGH - can afford premium bootcamps/exams)
- **Personal Preferences**: ${profile.preferences.join(", ") || "None specified"}${stageRulesPrompt}${guardrailsPrompt}

Your output must be a single, raw, valid JSON object that adheres PRECISELY to the structure described below. Do not wrap the JSON in markdown code blocks like \`\`\`json. Return only the JSON object.

### JSON Structure Requirements:

1. **goalsToAchieve**: A unified, chronological career and academic progression path.
${goalsToAchieveInstructions}

2. **collegeCourses**: An array of 3 recommended college courses or classes to take.
   - Each course object has:
     - **id**: string (e.g. "course-1", "course-2", "course-3")
     - **name**: string (name of course)
     - **semester**: string (e.g. "Next available semester" or "Within 2 semesters")
     - **reason**: string (why this is relevant based on their profile)
     - **financialTiers**: array of strings, containing at least one of ["LOW", "MEDIUM", "HIGH"] (who this is suitable for financially)

3. **internships**: An array of 3 recommended internship targets or roles.
   - Each internship object has:
     - **id**: string (e.g. "intern-1", "intern-2", "intern-3")
     - **role**: string (intern role title)
     - **when**: string (e.g. "Months 6-10" or "Year 2")
     - **platforms**: array of strings (where to look, e.g. ["LinkedIn", "Internshala", "Glassdoor"])
     - **stipendNote**: string (practical financial/compensation context)
     - **financialTiers**: array of strings, containing at least one of ["LOW", "MEDIUM", "HIGH"]

4. **certifications**: An array of 4 industry-recognized certifications.
   - Each certification object has:
     - **id**: string (e.g. "cert-1", "cert-2", "cert-3", "cert-4")
     - **name**: string (certification name)
     - **platform**: string (provider, e.g. "Coursera", "AWS", "Google")
     - **cost**: string (e.g. "Free", "$150", or "Paid subscription")
     - **duration**: string (e.g. "4-6 weeks")
     - **impact**: string (how it advances their resume/career)
     - **financialTiers**: array of strings, containing at least one of ["LOW", "MEDIUM", "HIGH"]

5. **alternatePaths**: An array of 3 alternative career paths if they pivot.
   - Each alternatePath object has:
     - **id**: string (e.g. "alt-1", "alt-2", "alt-3")
     - **title**: string (alternative career title, e.g. "Data Engineer")
     - **salaryRange**: string (estimated salary range)
     - **skillOverlap**: number (integer percentage between 0 and 100 representing overlap with current skills)
     - **pivotRequired**: string (what skills or qualifications they would need to add to pivot)

6. **skillGap**:
   - **have**: array of strings (skills they already possess, extracted and verified from their profile)
   - **need**: array of objects, mapping skills they lack to a milestone. Each object has:
     - **skill**: string (the skill they need to learn, e.g. "SQL" or "Cloud infrastructure")
     - **milestoneId**: string (must correspond to one of the goalsToAchieve milestones 'id' they will learn it at, e.g. "goal-1" or "goal-2")
   - **bridgingSteps**: array of 3 strings (actionable steps they can take starting today to bridge their skill gaps)

Crucial Rule: All JSON key names must match the exact casing specified above. Do not include a "decisionTree" key in your JSON, as the system will build it programmatically from your milestones. Ensure the milestones in skillGap.need list a milestoneId that matches one of the ids in goalsToAchieve.milestones.`;

  // Return both the prompt text AND the canonical timeframe list.
  // The endpoint uses milestoneTimeframes to forcibly re-stamp each milestone's
  // timeframe by its index position, fixing OpenAI hallucinating wrong timeframes.
  return { prompt: promptText, milestoneTimeframes };
}

function normalizeRoadmapData(data, expectedTimeframes = []) {
  if (!data) return data;


  if (data.goalsToAchieve) {
    if (!data.goalsToAchieve.description || typeof data.goalsToAchieve.description !== 'string' || !data.goalsToAchieve.description.trim()) {
      data.goalsToAchieve.description = "A customized pathway mapped to your career objectives.";
    }
  } else {
    data.goalsToAchieve = {
      description: "A customized pathway mapped to your career objectives.",
      milestones: []
    };
  }

  if (Array.isArray(data.goalsToAchieve.milestones)) {
    data.goalsToAchieve.milestones = data.goalsToAchieve.milestones.map((ms, index) => {
      // CRITICAL FIX: Force the canonical timeframe by index position.
      // OpenAI sometimes ignores our timeframe instructions and generates month-based
      // strings like "Month 12 (Board / Exam Focus)" instead of "Grade 12 (Final Boards)".
      // By re-stamping from our expectedTimeframes list, we guarantee correct classification.
      const canonicalTimeframe = (expectedTimeframes.length > index)
        ? expectedTimeframes[index]
        : (ms.timeframe || "Goal");

      let pre = [];
      if (Array.isArray(ms.prerequisites)) {
        pre = ms.prerequisites.map((p, pIdx) => ({
          id: p.id || `pre-${index + 1}-${pIdx + 1}`,
          title: p.title || "Prerequisite Step",
          detail: p.detail || "Build foundational/intermediate skills.",
          phase: "goalsToAchieve",
          timeframe: canonicalTimeframe, // prerequisites share the parent's canonical timeframe
          prerequisites: []
        }));
      }
      return {
        ...ms,
        id: ms.id || `goal-${index + 1}`,
        title: ms.title || "Career Goal Milestone",
        detail: ms.detail || "Work toward your career aspirations.",
        phase: "goalsToAchieve",
        timeframe: canonicalTimeframe, // ← always use the canonical timeframe
        prerequisites: pre
      };
    });
  }

  // Clean up alternatePaths
  if (Array.isArray(data.alternatePaths)) {
    data.alternatePaths = data.alternatePaths.map((p, index) => {
      const cleaned = {
        id: p.id || `alt-${index + 1}`,
        title: p.title || "Alternative Path",
        salaryRange: p.salaryRange || "Competitive",
        skillOverlap: p.skillOverlap || 50,
        pivotRequired: p.pivotRequired || "Learn specialized skills."
      };
      if (typeof cleaned.skillOverlap === 'string') {
        const parsed = parseInt(cleaned.skillOverlap.replace(/\D/g, ""), 10);
        cleaned.skillOverlap = isNaN(parsed) ? 50 : parsed;
      }
      return cleaned;
    });
  }

  // Clean up skillGap
  if (data.skillGap) {
    if (!Array.isArray(data.skillGap.have)) {
      data.skillGap.have = [];
    }
    if (!Array.isArray(data.skillGap.bridgingSteps)) {
      data.skillGap.bridgingSteps = ["Explore related courses and study daily."];
    } else {
      // Bug #17 fix: filter empty strings so Zod min(1) per-item check doesn't fail
      data.skillGap.bridgingSteps = data.skillGap.bridgingSteps.filter(
        (s) => typeof s === "string" && s.trim().length > 0
      );
      if (data.skillGap.bridgingSteps.length === 0) {
        data.skillGap.bridgingSteps = ["Explore related courses and study daily."];
      }
    }
    if (Array.isArray(data.skillGap.need)) {
      // Collect valid milestone and prerequisite IDs separately
      const validMilestoneIds = new Set();
      const validPrerequisiteIds = new Set();

      if (data.goalsToAchieve && Array.isArray(data.goalsToAchieve.milestones)) {
        data.goalsToAchieve.milestones.forEach(ms => {
          if (ms.id) validMilestoneIds.add(ms.id);
          if (Array.isArray(ms.prerequisites)) {
            ms.prerequisites.forEach(p => {
              if (p.id) validPrerequisiteIds.add(p.id);
            });
          }
        });
      }

      // Default fallback id: first valid milestone ID
      const defaultId = validMilestoneIds.size > 0 ? Array.from(validMilestoneIds)[0] : "goal-1";

      data.skillGap.need = data.skillGap.need.map(n => {
        let mId = n.milestoneId;
        if (!mId || !validMilestoneIds.has(mId)) {
          mId = defaultId;
        }
        return {
          skill: n.skill || "Technical Skill",
          milestoneId: mId
        };
      });
    } else {
      data.skillGap.need = [];
    }
  } else {
    data.skillGap = {
      have: [],
      need: [],
      bridgingSteps: ["Explore related courses and study daily."]
    };
  }

  // Ensure all course / internship / cert IDs and arrays are correct
  if (!Array.isArray(data.collegeCourses)) data.collegeCourses = [];
  data.collegeCourses = data.collegeCourses.map((c, i) => ({
    id: c.id || `course-${i + 1}`,
    name: c.name || "Recommended Course",
    semester: c.semester || "Next semester",
    reason: c.reason || "Highly recommended for your profile.",
    financialTiers: Array.isArray(c.financialTiers) && c.financialTiers.length > 0 ? c.financialTiers : ["LOW", "MEDIUM", "HIGH"]
  }));

  if (!Array.isArray(data.internships)) data.internships = [];
  data.internships = data.internships.map((int, i) => ({
    id: int.id || `intern-${i + 1}`,
    role: int.role || "Internship Role",
    when: int.when || "Year 2",
    platforms: Array.isArray(int.platforms) && int.platforms.length > 0 ? int.platforms : ["LinkedIn"],
    stipendNote: int.stipendNote || "Paid or stipend-based options.",
    financialTiers: Array.isArray(int.financialTiers) && int.financialTiers.length > 0 ? int.financialTiers : ["LOW", "MEDIUM", "HIGH"]
  }));

  if (!Array.isArray(data.certifications)) data.certifications = [];
  data.certifications = data.certifications.map((cert, i) => ({
    id: cert.id || `cert-${i + 1}`,
    name: cert.name || "Professional Certification",
    platform: cert.platform || "Online Provider",
    cost: cert.cost || "Free / Paid",
    duration: cert.duration || "4 weeks",
    impact: cert.impact || "Boosts your profile credentials.",
    financialTiers: Array.isArray(cert.financialTiers) && cert.financialTiers.length > 0 ? cert.financialTiers : ["LOW", "MEDIUM", "HIGH"]
  }));

  return data;
}

app.post("/api/generate-roadmap", validateRequest(profileSchema), async (req, res) => {
  const profile = sanitizeProfile(req.body);
  try {
    // Quick validation of the profile object structure
    if (!profile || !profile.name || !profile.goal || !profile.goal.description) {
      return res.status(400).json({ error: "Invalid profile data provided. Profile name and goal description are required." });
    }

    if (!genAI) {
      // No API key configured — jump straight to the local fallback roadmap below
      // (handled by the catch block) so the app remains fully usable in demo/offline mode.
      throw new Error("OpenAI API client is not configured; serving local fallback roadmap.");
    }

    console.log(`[Backend] Generating real OpenAI roadmap for: ${profile.name} (Goal: ${profile.goal.description})...`);

    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const { prompt, milestoneTimeframes } = constructPrompt(profile);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse the generated JSON response
    let generatedData;
    try {
      generatedData = JSON.parse(cleanGeminiJsonResponse(responseText));
    } catch (parseErr) {
      console.error("[Backend] Failed to parse JSON from OpenAI response. Raw response was:\n", responseText);
      throw new Error("OpenAI returned invalid JSON content.");
    }

    // Sanitize and normalize. Pass milestoneTimeframes so each milestone's timeframe
    // is forcibly re-stamped by index — fixing OpenAI hallucinating wrong timeframes.
    generatedData = normalizeRoadmapData(generatedData, milestoneTimeframes);

    // Future college-related certifications and internships can be recommended and will be filtered appropriately by stage on the client side.

    console.log("[Backend] OpenAI generation complete. Programmatically assembling decision tree...");

    // Build the decision tree from generated goals programmatically
    const decisionTree = buildTreeFromGoals(
      profile.goal.description,
      generatedData.goalsToAchieve,
      generatedData.collegeCourses || [],
      generatedData.internships || [],
      generatedData.certifications || [],
      generatedData.alternatePaths || []
    );

    // Merge decisionTree into the generated data to construct the full roadmap object
    const finalRoadmap = {
      ...generatedData,
      decisionTree
    };

    console.log("[Backend] Roadmap fully assembled and verified. Sending to client.");
    res.json(finalRoadmap);

  } catch (error) {
    console.error("[Backend Error] Failed to generate roadmap via OpenAI API:", error);
    console.warn("[Backend] API error occurred. Generating robust, high-fidelity local fallback roadmap. Details:", error.message);
    
    const field = profile.field?.type || "TECH";
    const goalDesc = profile.goal?.description || "Professional Career";
    const degree = inferCollegeDegree(profile);
    
    const mockGoalsToAchieve = {
      description: `A customized, structured progression roadmap for pursuing a degree in ${degree} toward becoming a ${goalDesc}.`,
      milestones: [
        {
          id: "goal-1",
          title: "Foundations & Baseline Skills Mastery",
          detail: "Establish core theoretical building blocks, enroll in introductory courses, and set up your development workspace.",
          timeframe: "Month 3",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-1-1", title: "Complete introductory specialization course", detail: "Focus on syntax, core definitions, and structural concepts.", phase: "goalsToAchieve", timeframe: "Month 3", prerequisites: [] },
            { id: "pre-1-2", title: "Configure local workspace tools", detail: "Install code editors, IDEs, or relevant local platforms.", phase: "goalsToAchieve", timeframe: "Month 3", prerequisites: [] }
          ]
        },
        {
          id: "goal-2",
          title: "Intermediate Frameworks & Practice Projects",
          detail: "Build simple practical proof-of-work examples, configure collaborative version control, and join student clubs.",
          timeframe: "Month 6",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-2-1", title: "Develop three simple mini-projects", detail: "Apply theoretical concepts to solve basic problems.", phase: "goalsToAchieve", timeframe: "Month 6", prerequisites: [] },
            { id: "pre-2-2", title: "Initialize version control repositories", detail: "Share your code on GitHub or local portfolio backups.", phase: "goalsToAchieve", timeframe: "Month 6", prerequisites: [] }
          ]
        },
        {
          id: "goal-3",
          title: "Industry Credentialing & Local Placements Prep",
          detail: "Earn industry-recognized certifications, prepare a professional resume, and apply for junior internships.",
          timeframe: "Month 12",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-3-1", title: "Obtain verified NASSCOM/SWAYAM certification", detail: "Acquire credible third-party evidence of skill mastery.", phase: "goalsToAchieve", timeframe: "Month 12", prerequisites: [] },
            { id: "pre-3-2", title: "Submit applications on Internshala", detail: "Target roles paying standard monthly stipends.", phase: "goalsToAchieve", timeframe: "Month 12", prerequisites: [] }
          ]
        },
        {
          id: "goal-4",
          title: "Advanced Engineering & Capstone Launch",
          detail: "Build a production-grade portfolio project, participate in mock interviews, and secure placement offers.",
          timeframe: "Year 2",
          phase: "goalsToAchieve",
          prerequisites: [
            { id: "pre-4-1", title: "Publish full-stack portfolio website", detail: "Deploy live code showing database and interface integration.", phase: "goalsToAchieve", timeframe: "Year 2", prerequisites: [] },
            { id: "pre-4-2", title: "Conduct mock technical interview sessions", detail: "Refine verbal articulation, coding explanations, and logic.", phase: "goalsToAchieve", timeframe: "Year 2", prerequisites: [] }
          ]
        }
      ]
    };

    const mockCollegeCourses = [
      { id: "course-1", name: "Data Structures & Structural Logic", semester: "Next semester", reason: "Establishes baseline algorithm concepts.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "course-2", name: "Relational Database Management Systems", semester: "Within 2 semesters", reason: "Crucial for handling data metrics.", financialTiers: ["LOW", "MEDIUM", "HIGH"] }
    ];

    const mockInternships = [
      { id: "intern-1", role: `Junior ${field.toLowerCase()} Developer Intern`, when: "Month 6-12", platforms: ["Internshala", "LinkedIn"], stipendNote: "Guaranteed monthly stipend options.", financialTiers: ["LOW", "MEDIUM", "HIGH"] }
    ];

    const mockCertifications = [
      { id: "cert-1", name: "Google Professional Specialization Certificate", platform: "Coursera", cost: "Free Audit Available", duration: "4-6 weeks", impact: "Highly recognizable by IT recruiters.", financialTiers: ["LOW", "MEDIUM", "HIGH"] },
      { id: "cert-2", name: "Programming Foundations Exam", platform: "SWAYAM / NPTEL", cost: "₹1000", duration: "12 weeks", impact: "Indian university credit transfer eligible.", financialTiers: ["LOW", "MEDIUM", "HIGH"] }
    ];

    const mockAlternatePaths = [
      { id: "alt-1", title: "Systems Administrator", salaryRange: "₹4,00,000 - ₹7,00,000", skillOverlap: 65, pivotRequired: "Learn Linux terminal commands and scripting." }
    ];

    const mockSkillGap = {
      have: profile.skills.filter(s => s !== "None yet"),
      need: [
        { skill: "Structured Query Language (SQL)", milestoneId: "goal-1" },
        { skill: "Collaborative Git Pipelines", milestoneId: "goal-2" }
      ],
      bridgingSteps: [
        "Complete free SQL interactive tutorials on W3Schools.",
        "Host three personal repositories publicly on GitHub.",
        "Participate in local community developer hackathons."
      ]
    };

    const generatedData = {
      goalsToAchieve: mockGoalsToAchieve,
      collegeCourses: mockCollegeCourses,
      internships: mockInternships,
      certifications: mockCertifications,
      alternatePaths: mockAlternatePaths,
      skillGap: mockSkillGap
    };

    const decisionTree = buildTreeFromGoals(
      profile.goal.description,
      generatedData.goalsToAchieve,
      generatedData.collegeCourses,
      generatedData.internships,
      generatedData.certifications,
      generatedData.alternatePaths
    );

    const finalRoadmap = {
      ...generatedData,
      decisionTree,
      isMock: true,
      warning: "OpenAI API error (Rate Limit/Invalid Key/Quota). Automatically serving high-fidelity local fallback data."
    };

    return res.json(finalRoadmap);
  }
});

// Fallback dynamic questions if API is offline
const fallbackQuestions = {
  questions: [
    {
      id: "q1",
      questionText: "Which specific focus area matches your interest best?",
      options: ["Technical Core & Engineering", "Data, Metrics & Analytics", "Product Strategy & Operations"]
    },
    {
      id: "q2",
      questionText: "How many hours per week can you realistically dedicate?",
      options: ["3-5 hours (Moderate pace)", "6-12 hours (Accelerated learning)", "15+ hours (Intensive preparation)"]
    },
    {
      id: "q3",
      questionText: "What type of employer environment do you want to target?",
      options: ["Agile Early-Stage Startups", "Established Corporations & Brands", "Freelancing / Independent Remote Work"]
    }
  ]
};

// Fallback detailed roadmap plans
const fallbackDeepRoadmap = {
  weeklyStudyPlan: [
    { week: "Week 1", topic: "Workspace Configuration & Core Fundamentals", resource: "freeCodeCamp & MDN Guides", actionItem: "Configure local development environment and run a basic application prototype." },
    { week: "Week 2", topic: "Advanced Data Manipulation & API Calls", resource: "MDN Web Docs / Platform References", actionItem: "Write a script that pulls data from a public API, parses it, and logs the output." },
    { week: "Week 3", topic: "Collaborative Git Workflows & Version Control", resource: "GitHub Learning Labs", actionItem: "Initialize a local Git repository, make 3 sequential feature commits, and push to GitHub." },
    { week: "Week 4", topic: "Component Styling & UI Layouts", resource: "TailwindCSS Docs & CSS Tricks", actionItem: "Create a fully responsive, interactive flexbox grid showing data metrics." },
    { week: "Week 5", topic: "Automated Testing & Code Refactoring", resource: "Jest/Mocha Documentation", actionItem: "Write 3 unit tests for your data manipulation modules to verify boundary values." },
    { week: "Week 6", topic: "Static/Server Deployment & Resume Linking", resource: "Vercel / Netlify / Render Documentation", actionItem: "Deploy your project live to Vercel or Render, add it to your LinkedIn, and share." }
  ],
  targetProjects: [
    {
      title: "Interactive Professional Portfolio",
      techStack: "React.js, TailwindCSS, GitHub Pages",
      description: "A gorgeous, responsive portfolio website highlighting your onboarding achievements, projects, and certifications.",
      phases: ["Phase 1: Design clean structural layouts with grid systems", "Phase 2: Code responsive micro-animations for card details", "Phase 3: Publish live to GitHub Pages and share on LinkedIn"]
    },
    {
      title: "Collaborative Personal Task Board",
      techStack: "Vite, Local Storage API, Vanilla CSS",
      description: "A robust developer application that allows users to manage objectives, check milestones, and track timelines.",
      phases: ["Phase 1: Implement React state management for checklist items", "Phase 2: Integrate localStorage for offline database backups", "Phase 3: Deploy on a secure hosting environment"]
    }
  ],
  strategicAdvice: "Consistency is your greatest advantage. Set aside 45 minutes every single morning to study before distractions arise. Update your public portfolio live as you finish goals, and connect with developers inside your target niche on LinkedIn."
};

function constructDeepQuestionsPrompt(profile, roadmap) {
  const fieldLabel = profile.field.type === "OTHER" ? profile.field.customValue : profile.field.type;
  
  return `You are a professional career coach. The user named ${profile.name} has onboarded with:
- Stage: ${profile.stage}
- Age: ${profile.age}
- Field: ${fieldLabel}
- Skills: ${profile.skills.join(", ")}
- Goal: "${profile.goal.description}"
- Budget Tier: ${profile.financialTier}
- Preferences: ${profile.preferences.join(", ") || "None"}

We generated an initial roadmap. Here is the objective summary:
- Goals Summary: "${roadmap.goalsToAchieve.description}"

Generate exactly 3 highly personalized, context-specific multiple-choice questions to help us deep-dive into their specific preferences.
For example, ask about:
1. A specific sub-specialization choice that fits their field (e.g. frontend vs backend, corporate accounting vs startup finance, etc.).
2. Their weekly time commitment (e.g. 5, 10, 15+ hours) or favorite learning style (video vs reading vs build-first).
3. The type of industry or employer they want to target (e.g. early-stage startup, corporate brand, research lab, global remote, freelance).

Your output must be a single, raw, valid JSON object containing exactly 3 objects. Do not wrap the JSON in markdown code blocks. Return only the JSON.

### JSON Structure Casing:
{
  "questions": [
    {
      "id": "q1",
      "questionText": "Question 1 text...",
      "options": ["Option A", "Option B", "Option C", "Option D"]
    },
    {
      "id": "q2",
      "questionText": "Question 2 text...",
      "options": ["Option A", "Option B", "Option C", "Option D"]
    },
    {
      "id": "q3",
      "questionText": "Question 3 text...",
      "options": ["Option A", "Option B", "Option C", "Option D"]
    }
  ]
}`;
}

function constructDeepRoadmapPrompt(profile, roadmap, answers) {
  const fieldLabel = profile.field.type === "OTHER" ? profile.field.customValue : profile.field.type;
  const answersFormatted = answers.map((a, i) => `Question: ${a.questionText}\nAnswer Selected: ${a.answerText}`).join("\n\n");

  return `You are an elite career strategist. The user named ${profile.name} (Stage: ${profile.stage}, Goal: ${profile.goal.description}) completed our Phase 2 Onboarding. Here are their specific answers:

${answersFormatted}

Based on these answers, their original roadmap, and their budget tier (${profile.financialTier}), construct a highly detailed Deep Optimization Study & Project Plan.

Your output must be a single, raw, valid JSON object matching the exact structure below. Do not wrap the JSON in markdown code blocks. Return only the JSON.

### JSON Structure Casing:
{
  "weeklyStudyPlan": [
    {
      "week": "Week 1",
      "topic": "Topic Name",
      "resource": "Specific Resource Name (Free/Paid based on budget)",
      "actionItem": "Practical Action Item"
    },
    ... (exactly 6 items for Week 1 to Week 6)
  ],
  "targetProjects": [
    {
      "title": "Project Title",
      "techStack": "Languages & frameworks used",
      "description": "Short explanation of the project",
      "phases": ["Phase 1 description", "Phase 2 description", "Phase 3 description"] (exactly 3 phases)
    },
    ... (exactly 2 projects)
  ],
  "strategicAdvice": "3-4 sentences of customized professional coaching advice on how they can network and position themselves for interviews."
}`;
}

app.post("/api/generate-deep-questions", validateRequest(generateDeepQuestionsSchema), async (req, res) => {
  try {
    const profile = sanitizeProfile(req.body.profile);
    const roadmap = req.body.roadmap;
    
    if (!profile || !roadmap) {
      return res.status(400).json({ error: "Profile and roadmap data are required." });
    }

    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning fallback questions.");
      return res.json(fallbackQuestions);
    }

    console.log(`[Backend] Generating dynamic Phase 2 questions for: ${profile.name}...`);
    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const promptText = constructDeepQuestionsPrompt(profile, roadmap);
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();

    let parsedQuestions = JSON.parse(cleanGeminiJsonResponse(responseText));
    res.json(parsedQuestions);

  } catch (error) {
    console.error("[Backend Error] Failed to generate dynamic questions, using fallback:", error);
    res.json(fallbackQuestions);
  }
});

app.post("/api/generate-deep-roadmap", validateRequest(generateDeepRoadmapSchema), async (req, res) => {
  try {
    const profile = sanitizeProfile(req.body.profile);
    const roadmap = req.body.roadmap;
    const answers = (req.body.answers || []).map(a => ({
      questionId: a.questionId,
      questionText: sanitizeInput(a.questionText, 500),
      answerText: sanitizeInput(a.answerText, 500)
    }));

    if (!profile || !roadmap || !answers) {
      return res.status(400).json({ error: "Profile, roadmap, and answers are required." });
    }

    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning fallback deep plan.");
      return res.json(fallbackDeepRoadmap);
    }

    console.log(`[Backend] Generating Deep Roadmap details for: ${profile.name}...`);
    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const promptText = constructDeepRoadmapPrompt(profile, roadmap, answers);
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();

    let parsedDeepRoadmap = JSON.parse(cleanGeminiJsonResponse(responseText));
    res.json(parsedDeepRoadmap);

  } catch (error) {
    console.error("[Backend Error] Failed to generate deep roadmap, using fallback:", error);
    res.json(fallbackDeepRoadmap);
  }
});

function constructSuggestSkillsPrompt(fieldType, customFieldValue) {
  const fieldLabel = fieldType === "OTHER" ? customFieldValue : fieldType;
  return `You are a professional career coach and syllabus designer. The user has selected a discipline or field of study named "${fieldLabel}".
Suggest exactly 6-8 highly specific, modern, and practical technical, professional, or domain skills (one or two words each) that someone entering this field must learn.
For example, if the field is "Culinary Arts" or "Cooking", suggest skills like: "Knife skills", "Food safety", "Plating techniques", "Menu planning", "Garde manger", "Baking/Pastry".
Do NOT suggest soft skills like "Communication", "Teamwork", "Documentation", or "Leadership". Suggest ONLY specialized, domain-specific skills.

Your output must be a single, raw, valid JSON object containing an array of strings. Do not wrap the JSON in markdown code blocks. Return only the JSON.

### JSON Structure Casing:
{
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6"]
}`;
}

app.post("/api/suggest-skills", validateRequest(suggestSkillsSchema), async (req, res) => {
  try {
    const fieldType = sanitizeInput(req.body.fieldType, 100);
    const customFieldValue = sanitizeInput(req.body.customFieldValue, 200);

    if (!fieldType) {
      return res.status(400).json({ error: "fieldType is required." });
    }

    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning empty skills array.");
      return res.json({ skills: [] });
    }

    console.log(`[Backend] Generating dynamic skills for field: ${fieldType} (${customFieldValue})...`);
    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const promptText = constructSuggestSkillsPrompt(fieldType, customFieldValue);
    const result = await model.generateContent(promptText);
    const responseText = result.response.text();

    let parsed = JSON.parse(cleanGeminiJsonResponse(responseText));
    res.json(parsed);

  } catch (error) {
    console.error("[Backend Error] Failed to generate dynamic skills:", error);
    res.json({ skills: [] });
  }
});

app.post("/api/analyze-resume", (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File size limit exceeded. Max size allowed is 10MB." });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res, next) => {
  try {
    const profileJson = JSON.parse(req.body.profile || "{}");
    const result = profileSchema.safeParse(profileJson);
    if (!result.success) {
      const details = result.error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
      return res.status(400).json({ error: `Invalid profile data: ${details}` });
    }
    req.validatedProfile = result.data;
    next();
  } catch (e) { 
    return res.status(400).json({ error: "Invalid JSON format in profile data." });
  }
}, async (req, res) => {
  try {
    const file = req.file;
    const profile = sanitizeProfile(req.validatedProfile);

    if (!file) {
      return res.status(400).json({ error: "No resume file uploaded." });
    }

    if (!genAI) {
      throw new Error("OpenAI API client is not configured; serving local fallback resume analysis.");
    }

    console.log(`[Backend] Analyzing resume for ${profile.name || "User"}...`);

    // Parse the PDF buffer
    let pdfText = "";
    try {
      const data = await pdfParse(file.buffer, { max: 3 });
      pdfText = sanitizeInput(data.text, 10000);
    } catch (parseErr) {
      console.warn("[Backend] Failed to parse PDF resume, proceeding with profile-only info:", parseErr.message);
      pdfText = "[Failed to parse PDF file. Please analyze based on the self-reported profile skills and goal only.]";
    }

    if (!pdfText || pdfText.trim() === "") {
      pdfText = "[No selectable text extracted from PDF. This may be a scanned image. Please analyze based on the self-reported profile skills and goal only.]";
    }

    // Build OpenAI model
    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are an expert HR recruiter and career progression advisor.
Analyze the following candidate's PDF resume and their career profile.
Compare their skills, experience, and education against their target career goal.

Candidate Profile:
- Name: ${profile.name || "User"}
- Stage: ${profile.stage || "Not specified"}
- Field: ${profile.field?.type || "Not specified"}
- Career Goal Type: ${profile.goal?.type || "Not specified"}
- Career Goal Description: "${profile.goal?.description || "Not specified"}"
- Current Self-Reported Skills: ${(profile.skills || []).join(", ") || "None"}

Resume Extracted Text:
"""
${pdfText}
"""

Analyze this carefully and identify:
1. "skills": An array of at most 12 key extracted technical or domain skills from the resume that are most relevant to their target career goal. For each skill, include a match percentage (0 to 100) representing how well it aligns with their target career goal, e.g. { "name": "SQL", "match": 80 }.
2. "experience": An array of at most 3 key experience items parsed from the resume, e.g. { "role": "Junior Analyst", "company": "Tech Corp", "duration": "1 year" }.
3. "education": An array of at most 2 major education items parsed from the resume, e.g. { "degree": "B.Tech", "field": "Computer Science", "school": "University", "year": "2024" }.
4. "strengths": An array of 3 strengths from their resume that will help them achieve their career goal.
5. "gaps": An array of 3 skill or experience gaps compared to their target career goal.
6. "recommendations": An array of 3 highly actionable recommendations to bridge these gaps.

Your output must be a single, raw, valid JSON object matching the exact structure below. Do not wrap the JSON in markdown code blocks. Return only the JSON.

### JSON Structure Casing:
{
  "skills": [
    { "name": "Skill Name", "match": 85 }
  ],
  "experience": [
    { "role": "Role Title", "company": "Company Name", "duration": "Duration" }
  ],
  "education": [
    { "degree": "Degree", "field": "Field of Study", "school": "Institution", "year": "Year" }
  ],
  "strengths": [
    "Strength detail..."
  ],
  "gaps": [
    "Gap detail..."
  ],
  "recommendations": [
    "Actionable recommendation..."
  ]
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let analysisResult = JSON.parse(cleanGeminiJsonResponse(responseText));

    res.json(analysisResult);
  } catch (error) {
    console.error("[Backend Error] Resume analysis failed:", error);
    console.warn("[Backend] API error occurred. Returning high-fidelity mock resume analysis. Details:", error.message);
    return res.json({
      skills: [
        { name: "Python", match: 85 },
        { name: "SQL", match: 70 },
        { name: "Git", match: 90 },
        { name: "Communication", match: 80 }
      ],
      experience: [
        { role: "Junior Developer Intern", company: "Software Lab", duration: "6 Months" },
        { role: "Research Assistant", company: "Tech University", duration: "3 Months" }
      ],
      education: [
        { degree: "B.Tech Computer Science", field: "Software Engineering", school: "National Institute", year: "2024" }
      ],
      strengths: [
        "Solid understanding of core object-oriented Python scripting.",
        "Hands-on experience configuring collaborative branch operations in Git.",
        "Clear, confident presentation skills demonstrated in academic projects."
      ],
      gaps: [
        "Lacks experience with advanced relational database optimization.",
        "No professional cloud deployment credentials (e.g., AWS, Azure).",
        "Needs to build visual frontend React interface credentials."
      ],
      recommendations: [
        "Prioritize taking an advanced SQL certification course on Swayam/NPTEL.",
        "Build a responsive web application and host it publicly on Vercel/Netlify.",
        "Complete a foundational Cloud Practitioner certification course."
      ],
      isMock: true,
      warning: "OpenAI API error (Rate Limit/Invalid Key/Quota). Automatically serving high-fidelity local fallback data."
    });
  }
});

app.post("/api/market-intelligence", validateRequest(marketIntelligenceSchema), async (req, res) => {
  try {
    const jobTitle = sanitizeInput(req.body.jobTitle, 100);
    const field = sanitizeInput(req.body.field, 100);
    const location = sanitizeInput(req.body.location, 150);

    if (!jobTitle) {
      return res.status(400).json({ error: "jobTitle is required." });
    }

    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning mock market intelligence.");
      return res.json({
        demandLevel: "HIGH",
        avgSalary: "₹6,00,000 - ₹11,00,000 per annum",
        trendingSkills: ["Python", "SQL", "Git", "React.js", "Docker"],
        topCompanies: ["TCS", "Infosys", "Wipro", "Cognizant", "Tech Mahindra"],
        jobListings: [
          { title: "Junior Python Developer Intern", company: "Cognizant Technology Solutions", location: "Bengaluru (Hybrid)", salary: "₹15,000/month", url: "https://internshala.com" },
          { title: "Associate SQL Analyst", company: "Infosys Ltd", location: "Hyderabad", salary: "₹4,50,000/annum", url: "https://naukri.com" }
        ],
        marketInsights: "Hiring velocity remains high for candidates with verifiable coding experience. Standard corporate teams prioritize candidates who can show public Git portfolios and have completed foundational NASSCOM/SWAYAM certifications.",
        isMock: true,
        warning: "OpenAI API not configured. Serving local fallback data."
      });
    }

    console.log(`[Backend] Fetching market intelligence for: ${jobTitle}...`);

    let searchResults = "";
    const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

    if (TAVILY_API_KEY && TAVILY_API_KEY.trim() !== "") {
      try {
        console.log(`[Backend] Searching Tavily for live market data on: ${jobTitle} ${location || ""}`);
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TAVILY_API_KEY}`
          },
          body: JSON.stringify({
            query: `current job market demand salary trend top skills hiring companies for "${jobTitle}" ${location || "India"} 2026`,
            search_depth: "basic",
            max_results: 5
          })
        });
        if (response.ok) {
          const data = await response.json();
          searchResults = JSON.stringify(data.results);
          console.log(`[Backend] Tavily search successful with ${data.results?.length} results.`);
        } else {
          console.warn("[Backend] Tavily API returned status:", response.status);
        }
      } catch (searchErr) {
        console.warn("[Backend] Tavily search failed, falling back to OpenAI knowledge:", searchErr);
      }
    } else {
      console.log("[Backend] No Tavily API key configured. Utilizing OpenAI's internal knowledge.");
    }

    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `You are a job market research analyst and recruiter.
Analyze the current job market demand, salary, trending skills, top companies, and realistic job listings for the role of "${jobTitle}" in the field of "${field || 'General'}".
${location ? `Focus on the location: ${location}` : "Prioritize the Indian educational and professional market, but make it globally context-aware."}

${searchResults ? `Here is live web search results about the current market:
"""
${searchResults}
"""` : "Utilize your deep, up-to-date knowledge about the current industry trends."}

Generate a comprehensive market intelligence report in JSON format.

Your output must be a single, raw, valid JSON object matching the exact structure below. Do not wrap the JSON in markdown code blocks. Return only the JSON.

### JSON Structure Casing:
{
  "demandLevel": "HIGH", // Options: "LOW", "MEDIUM", "HIGH", "VERY_HIGH"
  // Bug #13 fix: corrected salary format (₹6,00,000 not ₹6,0,000)
  "avgSalary": "₹6,00,000 - ₹12,00,000 per annum", // or equivalent local salary range
  "trendingSkills": [
    "Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"
  ],
  "topCompanies": [
    "Company 1", "Company 2", "Company 3"
  ],
  "jobListings": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "salary": "Stipend / Salary",
      "url": "https://internshala.com or similar relevant portal link"
    },
    {
      "title": "Job Title 2",
      "company": "Company Name 2",
      "location": "Location 2",
      "salary": "Salary 2",
      "url": "https://naukri.com or similar relevant portal link"
    }
  ],
  "marketInsights": "A detailed 3-4 sentence paragraph summarizing the current hiring outlook, industry shifts, and critical career growth vectors for this role in the near future."
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let marketIntelResult = JSON.parse(cleanGeminiJsonResponse(responseText));

    res.json(marketIntelResult);
  } catch (error) {
    console.error("[Backend Error] Market intelligence fetch failed:", error);
    console.warn("[Backend] API error occurred. Returning high-fidelity mock market intelligence. Details:", error.message);
    return res.json({
      demandLevel: "HIGH",
      avgSalary: "₹6,00,000 - ₹11,00,000 per annum",  // Bug #13 fix: corrected comma formatting
      trendingSkills: [
        "Python", "SQL", "Git", "React.js", "Docker"
      ],
      topCompanies: [
        "TCS", "Infosys", "Wipro", "Cognizant", "Tech Mahindra"
      ],
      jobListings: [
        {
          title: "Junior Python Developer Intern",
          company: "Cognizant Technology Solutions",
          location: "Bengaluru (Hybrid)",
          salary: "₹15,000/month",
          url: "https://internshala.com"
        },
        {
          title: "Associate SQL Analyst",
          company: "Infosys Ltd",
          location: "Hyderabad",
          salary: "₹4,50,000/annum",
          url: "https://naukri.com"
        }
      ],
      marketInsights: "Hiring velocity remains high for candidates with verifiable coding experience. Standard corporate teams prioritize candidates who can show public Git portfolios and have completed foundational NASSCOM/SWAYAM certifications.",
      isMock: true,
      warning: "OpenAI API error (Rate Limit/Invalid Key/Quota). Automatically serving high-fidelity local fallback data."
    });
  }
});

app.post("/api/career-chat", validateRequest(careerChatSchema), async (req, res) => {
  try {
    const profile = sanitizeProfile(req.body.profile);
    const roadmap = req.body.roadmap;
    const resumeAnalysis = req.body.resumeAnalysis;
    const messages = (req.body.messages || []).map(m => ({ role: m.role, content: sanitizeInput(m.content, 2000) }));

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required." });
    }

    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning mock chat response.");
      return res.json({
        response: `Hello! I am currently operating in **High-Fidelity AI Mock Mode** because your OpenAI API key is not configured. 

Based on your profile (**${profile?.goal?.description || "your career goal"}**) and target goals, I recommend focusing on your core **roadmap milestones**, practicing daily, building a public GitHub/portfolio, and pursuing free certifications (SWAYAM/NPTEL) appropriate to your budget tier.

Ask me any specific career query — for example about skills, certifications, or internships — and I will guide you!`,
        suggestedActions: [
          "How can I improve my skills for my target role?",
          "What projects should I host on GitHub?",
          "Curate a list of free certifications"
        ],
        isMock: true,
        warning: "OpenAI API not configured. Serving local fallback data."
      });
    }

    console.log(`[Backend] Handling career chat session...`);

    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    // Construct the context prompt containing user details
    const contextPrompt = `You are "Antigravity Career Advisor", a helpful, empathetic, and highly knowledgeable career guide.
You are having an interactive career advisory conversation with a user.

User Context:
- Name: ${profile?.name || "User"}
- Stage: ${profile?.stage || "Not specified"}
- Field: ${profile?.field?.type || "Not specified"}
- Career Goal Type: ${profile?.goal?.type || "Not specified"}
- Career Goal Description: "${profile?.goal?.description || "Not specified"}"
- Current Skills: ${(profile?.skills || []).join(", ") || "None"}
${roadmap ? `- Current Roadmap Summary: "${roadmap.goalsToAchieve?.description || 'Active roadmap generated'}"` : ""}
${resumeAnalysis ? `- Resume Extracted Skills: ${(resumeAnalysis.skills || []).map(s => s.name).join(", ") || "None"}` : ""}
${resumeAnalysis ? `- Resume Strengths: ${(resumeAnalysis.strengths || []).join("; ") || "None"}` : ""}
${resumeAnalysis ? `- Resume Gaps: ${(resumeAnalysis.gaps || []).join("; ") || "None"}` : ""}

Answer the user's latest query inside the conversation. Be extremely helpful, encouraging, and provide concrete steps.
You MUST output your response in JSON format. Provide the conversational markdown response and exactly 2-3 suggested quick-reply actions the user might take next.

Ensure your response answers their query directly, using Markdown for formatting (bolding, lists, etc.) inside the "response" field.

Your output must be a single, raw, valid JSON object matching the exact structure below. Do not wrap the JSON in markdown code blocks. Return only the JSON.

### JSON Structure Casing:
{
  "response": "Your markdown-formatted message here...",
  "suggestedActions": [
    "Suggested action/question 1",
    "Suggested action/question 2"
  ]
}

Conversation History:
${messages.map(m => `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.content}`).join("\n")}
`;

    const result = await model.generateContent(contextPrompt);
    const responseText = result.response.text();
    let chatResult = JSON.parse(cleanGeminiJsonResponse(responseText));

    res.json(chatResult);
  } catch (error) {
    console.error("[Backend Error] Career chat failed:", error);
    console.warn("[Backend] API error occurred. Returning high-fidelity mock chat response. Details:", error.message);
    return res.json({
      response: `Hello! I am currently operating in **High-Fidelity AI Mock Mode** because your OpenAI API key returned an error or is throttled. 

Based on your profile and target goals, I recommend focusing on your core **roadmap milestones**, practicing coding daily, and building a public GitHub profile. 

Ask me any specific career query, and I will do my best to guide you!`,
      suggestedActions: [
        "How can I improve my SQL skills?",
        "What projects should I host on GitHub?",
        "Curate a list of free certifications"
      ],
      isMock: true,
      warning: "OpenAI API error (Rate Limit/Invalid Key/Quota). Automatically serving high-fidelity local fallback data."
    });
  }
});

// ─────────────────────────────────────────────────────────
// NODE CONTENT — lazy per-node AI generation
// Called when a node reaches 80% parent completion
// ─────────────────────────────────────────────────────────

const AGE_CONTENT_RULES = {
  CLASS_7_8:     { age: "12–14", rules: "Use ONLY: curiosity building, logical puzzles, basic math, intro hobby projects, reading about the field, simple block-based tools (Scratch, basic Excel). NEVER suggest SQL, APIs, frameworks, internships, or certifications." },
  CLASS_9_10:    { age: "14–16", rules: "Use: reasoning challenges, beginner tools (Python basics, Excel), foundational concepts, light project-based learning, career exploration. NEVER suggest advanced frameworks, real internships, or professional certifications." },
  CLASS_11_12:   { age: "16–18", rules: "Use: intermediate concepts, relevant subject focus, board prep, beginner certifications (NPTEL/SWAYAM free tier only), first small portfolio project. NEVER suggest production-level projects or paid internships." },
  UNDERGRADUATE: { age: "18–22", rules: "Yr1-2: beginner-to-intermediate tools, first internship prep, beginner free certifications. Yr3-4: advanced projects, real internships, intermediate certifications, placement prep." },
  POSTGRADUATE:  { age: "22–24", rules: "Use: research-level depth, specialization topics, advanced certifications, publications or thesis work where relevant, industry networking." },
  WORKING:       { age: "22+",   rules: "Use: skill gap bridging, industry certifications, leadership skills, portfolio refinement, networking, promotion milestones. NO semester structure — use quarterly blocks." }
};

function getOfflineMockNodeContent(nodeId, nodeLabel, profile) {
  const stage = profile?.stage || "UNDERGRADUATE";
  const fieldType = profile?.field?.type || "TECH";
  const careerGoal = profile?.goal?.description || "your career goal";
  let lowId = nodeId.toLowerCase();

  // Map sequential goal-X IDs to specific stages/semesters to avoid duplicate generic goals
  if (lowId.startsWith("goal-")) {
    const num = parseInt(lowId.replace("goal-", ""), 10);
    if (!isNaN(num)) {
      if (stage === "CLASS_7_8") {
        if (num === 1 || num === 2) lowId = "grade-7-8";
        else if (num === 3 || num === 4) lowId = "grade-9";
        else if (num === 5 || num === 6) lowId = "grade-10";
        else if (num === 7 || num === 8) lowId = "grade-11";
        else if (num === 9 || num === 10) lowId = "grade-12";
        else if (num === 11) lowId = "sem-1";
        else if (num === 12) lowId = "sem-3";
        else if (num === 13) lowId = "sem-5";
        else if (num === 14) lowId = "sem-7";
        else lowId = "working";
      } else if (stage === "CLASS_9_10") {
        if (num === 1 || num === 2) lowId = "grade-9";
        else if (num === 3 || num === 4) lowId = "grade-10";
        else if (num === 5 || num === 6) lowId = "grade-11";
        else if (num === 7 || num === 8) lowId = "grade-12";
        else if (num === 9) lowId = "sem-1";
        else if (num === 10) lowId = "sem-3";
        else if (num === 11) lowId = "sem-5";
        else if (num === 12) lowId = "sem-7";
        else lowId = "working";
      } else if (stage === "CLASS_11_12") {
        if (num === 1 || num === 2 || num === 3) lowId = "grade-11";
        else if (num === 4 || num === 5 || num === 6) lowId = "grade-12";
        else if (num === 7) lowId = "sem-1";
        else if (num === 8) lowId = "sem-3";
        else if (num === 9) lowId = "sem-5";
        else if (num === 10) lowId = "sem-7";
        else lowId = "working";
      } else if (stage === "UNDERGRADUATE") {
        if (num === 1) lowId = "sem-1";
        else if (num === 2) lowId = "sem-3";
        else if (num === 3) lowId = "sem-5";
        else if (num === 4) lowId = "sem-7";
        else lowId = "working";
      } else if (stage === "POSTGRADUATE") {
        if (num === 1 || num === 2) lowId = "pg";
        else lowId = "working";
      } else {
        lowId = "working";
      }
    }
  }

    // Checkpoints have achievements instead of goals
  if (lowId.includes("checkpoint") || lowId.includes("-cp")) {
    let achievements = [];
    if (lowId.includes("gr10")) {
      achievements = [
        "Acquired Grade 10 Board Certification",
        "Completed stream selection and high-school academic path alignment"
      ];
    } else if (lowId.includes("gr12")) {
      achievements = [
        "Acquired Grade 12 Board Certification",
        "Completed university entrance exams and undergraduate course registration"
      ];
    } else if (lowId.includes("yr1")) {
      achievements = [
        "Completed Year 1 foundation courses with strong GPA",
        "Built baseline coding skills and joined campus network"
      ];
    } else if (lowId.includes("yr2")) {
      achievements = [
        "Completed Year 2 intermediate coursework",
        "Developed three practical mini-projects and applied for stipend internships"
      ];
    } else if (lowId.includes("yr3")) {
      achievements = [
        "Completed Year 3 advanced coursework",
        "Earned first industry-recognized certification and internship experience"
      ];
    } else if (lowId.includes("yr4")) {
      achievements = [
        "Completed graduation capstone project",
        "Prepared portfolio and secured final placement options"
      ];
    } else if (lowId.includes("pg")) {
      achievements = [
        "Completed Postgraduate specialization modules",
        "Delivered thesis project and prepared for senior-level placement"
      ];
    } else if (lowId.includes("cp1")) {
      achievements = [
        "Onboarded successfully and mastered key tools of the position",
        "Delivered first set of production tasks under professional guidance"
      ];
    } else if (lowId.includes("cp2")) {
      achievements = [
        "Established strong position ownership and lateral transition goals",
        "Completed first year review with verified resume achievements"
      ];
    } else {
      achievements = [
        `Successfully passed all milestone checks for ${nodeLabel}`,
        `Validated skills and updated progress narrative for ${careerGoal}`
      ];
    }

    return {
      goals: [],
      skills: ["Self-reflection", "Performance review", "Resume branding"],
      achievements,
      milestones: [{
        id: `${lowId}-ms-1`,
        title: `Verify achievements for ${nodeLabel}`,
        detail: `Review skills built and progress narrative at the ${nodeLabel}.`,
        timeframe: nodeLabel
      }],
      summary: `You have reached the ${nodeLabel}. This checkpoint reviews your accumulated achievements and updates your career profile.`,
      goal_reasons: {},
      stageGoals: [],
      isMock: true
    };
  }
  
  // Default values
  let goals = [
    `Master the key concepts and tools relevant to ${nodeLabel} to prepare for your target role as a ${careerGoal}`,
    `Build a practical mini-project demonstrating skills from this stage related to ${careerGoal}`,
    `Document your progress and reflect on learning from this period`
  ];
  let skills = ["Critical thinking", "Domain knowledge", "Time management"];
  let summary = `This stage focuses on ${nodeLabel}, building the foundation you need to reach your goal of becoming a ${careerGoal}.`;
  
  if (lowId.includes("root")) {
    goals = [
      `Define your career aspirations and identify target fields aligned with becoming a ${careerGoal}`,
      `Conduct informational interviews or research professionals working as a ${careerGoal}`,
      `Assess your current skill strengths and map out learning gaps for target ${careerGoal} pathways`
    ];
    skills = ["Career planning", "Market research", "Self-assessment"];
    summary = `Welcome to your roadmap! This initial step is about self-discovery, target setting, and mapping your current capabilities to eventually become a ${careerGoal}.`;
  } else if (lowId.includes("grade-7") || lowId.includes("grade-8") || lowId.includes("grade78")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Explore visual block programming (Scratch/Code.org) or logic games to build a foundation for ${careerGoal}`,
        "Participate in school science fairs or math puzzles to practice basic problem solving",
        `Read introductory science and tech stories to discover how a ${careerGoal} works in the real world`
      ];
      skills = ["Logical logic", "Creative curiosity", "Problem solving"];
    } else {
      goals = [
        `Participate in school debate clubs or speech competitions to build communication confidence for a future ${careerGoal} career`,
        "Learn basic budget planning by tracking your weekly pocket money or school projects",
        `Read biographies or watch documentaries about business leaders to inspire your journey toward ${careerGoal}`
      ];
      skills = ["Leadership intro", "Self-confidence", "Curiosity"];
    }
    summary = `At age 12-14 (Grade 7/8), the best preparation for becoming a ${careerGoal} is exploring your curiosity, playing logic games, and practicing public speaking.`;
  } else if (lowId.includes("grade-9")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Explore basic text-based coding resources (like basic Python syntax) to build simple logic scripts for ${careerGoal}`,
        `Build solid mathematical foundations (algebra, basic statistics) essential for analytical fields like ${careerGoal}`,
        "Maintain a consistent homework schedule and master active recall study techniques"
      ];
      skills = ["Algorithmic logic", "Basic arithmetic", "Active learning"];
    } else {
      goals = [
        `Build communication clarity by participating in class discussions and essay writing relevant for ${careerGoal}`,
        `Learn the basic concepts of supply, demand, and how businesses create value toward a ${careerGoal} mindset`,
        "Maintain a consistent homework schedule and master active recall study techniques"
      ];
      skills = ["Communication clarity", "Value creation", "Study habits"];
    }
    summary = `Grade 9 (age 14-15) is the perfect time to build strong study habits and explore fundamental scientific and mathematical principles related to ${careerGoal}.`;
  } else if (lowId.includes("grade-10")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Excel in 10th Grade board examinations to keep science stream option pathways open for ${careerGoal}`,
        `Examine board curriculums and target elective subjects (MPC, BiPC) aligned with becoming a ${careerGoal}`,
        "Develop basic problem-solving logic through school presentations and science projects"
      ];
      skills = ["Exam preparation", "Academic planning", "Problem solving"];
    } else {
      goals = [
        `Excel in 10th Grade board examinations to keep commerce/arts stream option pathways open for ${careerGoal}`,
        `Examine board curriculums and target elective streams (Commerce, Humanities) aligned with becoming a ${careerGoal}`,
        "Develop public speaking and collaboration skills through school presentations and group work"
      ];
      skills = ["Exam preparation", "Academic planning", "Public speaking"];
    }
    summary = `Grade 10 (age 15-16) is a major milestone year focused on boards and stream selection. Excel in exams and plan your next academic stage to reach your ${careerGoal} aspiration.`;
  } else if (lowId.includes("grade-11")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Deep dive into selected stream subjects (Physics, Chemistry, Math) essential for a ${careerGoal} degree`,
        `Learn core computing concepts (variables, loops, arrays) in school computer science electives related to ${careerGoal}`,
        `Research top universities and admission criteria (like JEE/SAT) for target undergraduate degrees in ${careerGoal}`
      ];
      skills = ["Advanced sciences", "Logical thinking", "University research"];
    } else {
      goals = [
        `Deep dive into selected stream subjects (Accounts, Economics, Business Studies) essential for a ${careerGoal} degree`,
        `Learn core financial and business principles in school business electives related to ${careerGoal}`,
        `Research top universities and admission criteria for target business/commerce degrees in ${careerGoal}`
      ];
      skills = ["Accounts/Economics", "Business logic", "University research"];
    }
    summary = `Grade 11 (age 16-17) marks the start of your specialization stream. Lay down deep academic roots in your chosen subjects to prepare for a target ${careerGoal} university program.`;
  } else if (lowId.includes("grade-12")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Achieve competitive scores in 12th Grade boards and university entrance examinations for ${careerGoal} fields`,
        `Prepare college applications, write personal statements, and draft a high-school resume aligned with ${careerGoal}`,
        `Learn personal finance basics (budgeting, saving) before transitioning to university to study ${careerGoal}`
      ];
      skills = ["Time management", "College writing", "Financial literacy"];
    } else {
      goals = [
        `Achieve competitive scores in 12th Grade boards and university entrance examinations for business/commerce fields related to ${careerGoal}`,
        `Prepare college applications, write personal statements, and draft a high-school resume aligned with ${careerGoal}`,
        `Learn personal finance basics (budgeting, saving) before transitioning to university to study ${careerGoal}`
      ];
      skills = ["Time management", "College writing", "Financial literacy"];
    }
    summary = `Grade 12 (age 17-18) is the final board exam year. Focus heavily on entrance tests, boards, and securing college admissions to study toward becoming a ${careerGoal}.`;
  } else if (lowId.includes("sem-1") || lowId.includes("semester-1")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        "Establish a solid college study schedule and daily learning habit",
        "Maintain a GPA above 8.0 in your first semester core modules",
        `Join at least one student technical club or interest group related to ${careerGoal}`
      ];
      skills = ["Study habits", "Academic adaptation", "Time management"];
    } else {
      goals = [
        "Establish a solid college study schedule and daily learning habit",
        "Maintain a GPA above 8.0 in your first semester core business/commerce modules",
        `Join campus clubs or debating groups to develop leadership skills relevant to a ${careerGoal}`
      ];
      skills = ["Leadership skills", "Time management", "Academic adjustment"];
    }
    summary = `Your first semester of college is about adjusting to university life, establishing study schedules, and joining campus communities focused on ${careerGoal}.`;
  } else if (lowId.includes("sem-2") || lowId.includes("semester-2")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Master programming syntax and data structure concepts needed for ${careerGoal} roles`,
        `Solve 30+ basic coding problems on HackerRank or LeetCode targeting ${careerGoal} requirements`,
        "Maintain high academic performance in university end-semester exams"
      ];
      skills = ["Object-Oriented Programming", "Algorithm basics", "LeetCode practice"];
    } else {
      goals = [
        `Master core principles of accounting, microeconomics, and laws relevant to ${careerGoal}`,
        "Maintain high academic performance in commerce end-semester examinations",
        `Build a basic resume highlighting first-year academic projects aligned with ${careerGoal}`
      ];
      skills = ["Accounting principles", "Economic analysis", "Resume building"];
    }
    summary = `Your second semester focuses on fundamental programming, data structures, or commerce core aligned with becoming a ${careerGoal}.`;
  } else if (lowId.includes("sem-3") || lowId.includes("semester-3")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        "Master relational database concepts and write intermediate SQL queries",
        "Learn Git version control and host your code repositories on GitHub",
        `Build your first database-driven mini-project demonstrating foundational ${careerGoal} skills`
      ];
      skills = ["SQL Databases", "Git & GitHub", "Database Design"];
    } else {
      goals = [
        `Master corporate governance, financial accounting, and cost analysis for ${careerGoal}`,
        `Build spreadsheet models (Excel/Google Sheets) for budgets related to ${careerGoal}`,
        `Participate in case study competitions and simulations targeting ${careerGoal} skills`
      ];
      skills = ["Advanced Excel", "Financial modeling", "Case analysis"];
    }
    summary = `Semester 3 is about database management systems, version control, and building your first projects or business models for ${careerGoal}.`;
  } else if (lowId.includes("sem-4") || lowId.includes("semester-4")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Build 2-3 specialized projects demonstrating ${careerGoal} capabilities for your portfolio`,
        `Prepare your resume and optimize your LinkedIn profile for target ${careerGoal} recruiters`,
        `Apply to at least 10 summer internships related to ${careerGoal} on Internshala/LinkedIn`
      ];
      skills = ["Project Building", "Resume optimization", "Internship applications"];
    } else {
      goals = [
        `Secure a summer internship or project in marketing, finance, or operations related to ${careerGoal}`,
        `Prepare case studies and brush up on group discussions and writing for ${careerGoal}`,
        `Build a professional LinkedIn network connecting with industry leaders in ${careerGoal}`
      ];
      skills = ["Business writing", "Interview skills", "Networking"];
    }
    summary = `Semester 4 focuses on portfolio building, resume optimization, applying for internships, and communication skills for a target ${careerGoal} role.`;
  } else if (lowId.includes("sem-5") || lowId.includes("semester-5")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Learn advanced framework development and specialized tools relevant to ${careerGoal}`,
        `Form a final year Capstone project group and finalize your abstract targeting ${careerGoal}`,
        `Secure and complete your first virtual/remote or local internship related to ${careerGoal}`
      ];
      skills = ["Framework development", "Capstone project planning", "Industry internship"];
    } else {
      goals = [
        `Master corporate finance, income tax laws, and analytics methods required for ${careerGoal}`,
        `Complete a summer internship in your chosen specialization stream for ${careerGoal}`,
        `Finalize abstract for your third-year dissertation or consulting capstone on ${careerGoal}`
      ];
      skills = ["Corporate Finance", "Business Analytics", "Dissertation abstract"];
    }
    summary = `Semester 5 focuses on advanced framework design, capstone project formation, tax laws, and completing internships related to ${careerGoal}.`;
  } else if (lowId.includes("sem-6") || lowId.includes("semester-6")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Solve 100+ DSA problems on LeetCode focusing on arrays, trees, and graphs for ${careerGoal} evaluations`,
        `Conduct 5+ peer mock interviews and practice CS fundamentals for target ${careerGoal} roles`,
        `Complete your major semester project prototype related to ${careerGoal} and host its live demo`
      ];
      skills = ["LeetCode DSA practice", "Mock interviewing", "Project deployment"];
    } else {
      goals = [
        `Prepare for quantitative aptitude, logical reasoning, and behavioral interviews for ${careerGoal}`,
        `Secure a pre-placement offer or complete a secondary project in your ${careerGoal} stream`,
        `Review core business management subjects to prepare for recruitment in ${careerGoal}`
      ];
      skills = ["Aptitude testing", "Behavioral interviewing", "Placement preparation"];
    }
    summary = `Semester 6 is all about rigorous placement prep: solving DSA problems, mock interviews, and placement training targeting ${careerGoal}.`;
  } else if (lowId.includes("sem-7") || lowId.includes("semester-7")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Submit applications to 15+ campus placement opportunities for ${careerGoal}`,
        `Crack the coding/aptitude assessment rounds for target ${careerGoal} employers`,
        `Excel in technical and HR face-to-face interview cycles for ${careerGoal}`
      ];
      skills = ["Job hunting", "Aptitude assessments", "Interview execution"];
    } else {
      goals = [
        `Participate in corporate recruitment drives and apply to target associate programs for ${careerGoal}`,
        `Excel in group discussions and case interviews for target ${careerGoal} roles`,
        `Submit applications for graduate admission to postgraduate MBA/PGDM programs for ${careerGoal}`
      ];
      skills = ["Group discussions", "Case interviews", "Postgrad applications"];
    }
    summary = `Semester 7 is about campus placement drives. Attend aptitude tests, code tests, and interviews targeting ${careerGoal}.`;
  } else if (lowId.includes("sem-8") || lowId.includes("semester-8")) {
    if (fieldType === "TECH" || fieldType === "SCIENCE") {
      goals = [
        `Complete and defend your final-year major engineering project related to ${careerGoal}`,
        "Clear all university credit requirements to secure your degree",
        `Complete pre-onboarding training modules sent by your target ${careerGoal} employer`
      ];
      skills = ["Capstone defense", "Degree clearance", "Pre-onboarding preparation"];
    } else {
      goals = [
        `Complete and defend your comprehensive final year consulting dissertation on ${careerGoal}`,
        "Clear final term academic credits and secure university graduation clearance",
        `Prepare for post-graduate relocation or transition to professional career in ${careerGoal}`
      ];
      skills = ["Dissertation defense", "Graduation clearance", "Career transition"];
    }
    summary = `Semester 8 focuses on defending your capstone project/dissertation, clearing academic credits, and starting pre-onboarding for ${careerGoal}.`;
  } else if (lowId.includes("pg")) {
    const tier = profile?.collegeTier || "TIER_1";
    const course = profile?.postGradCourse || "M.Tech / MS (Computer Science/IT)";
    const isTech = course.toLowerCase().includes("tech") || course.toLowerCase().includes("science") || course.toLowerCase().includes("computer");
    
    if (tier === "TIER_1") {
      goals = [
        `Master advanced specialization coursework in ${course}`,
        `Publish a peer-reviewed research paper in a premier international journal or conference (IEEE, ACM, etc.)`,
        `Leverage elite alumni network and on-campus career cells to secure research fellowships or tier-1 placements`
      ];
      skills = [`${isTech ? "Advanced Systems" : "Strategic Analysis"}`, "Collaborative Research", "Alumni Networking"];
    } else if (tier === "TIER_2") {
      goals = [
        `Master advanced specialization coursework in ${course}`,
        `Design a robust, end-to-end PG major project addressing practical industry-aligned problems`,
        `Secure standard competitive research assistantships or campus placement opportunities`
      ];
      skills = [`${isTech ? "Applied Software Eng" : "Business Analytics"}`, "Industry Case Studies", "Placement Preparation"];
    } else {
      goals = [
        `Master advanced specialization coursework in ${course}`,
        `Build a strong GitHub portfolio of independent projects to demonstrate practical specialization skills`,
        `Seek off-campus post-graduate internships and leverage online talent platforms for roles`
      ];
      skills = ["Independent Dev", "Off-campus Networking", "Career Portfolios"];
    }
    summary = `Your Master's degree in ${course} (Tier ${tier === "TIER_1" ? "1" : (tier === "TIER_2" ? "2" : "3")}) is about advanced mastery. Publish research, complete specialized internships, and transition into senior industry roles.`;
  } else if (lowId.includes("working") || lowId.includes("job") || lowId.includes("progression")) {
    const progression = profile?.targetLeadershipGoal || "SENIOR";
    if (progression === "SENIOR") {
      goals = [
        `Master advanced system design, database scalability, and software architecture patterns`,
        `Take full ownership of a business-critical microservice or feature module end-to-end`,
        `Conduct detailed code reviews and mentor junior developers to establish best engineering practices`
      ];
      skills = ["System Design", "Microservices Scaling", "Technical Mentorship"];
      summary = "Focus on deep technical mastery, architectural patterns, and mentorship to successfully transition into a Senior individual contributor.";
    } else if (progression === "MANAGER") {
      goals = [
        `Lead agile sprint planning, scope tasks accurately, and coordinate cross-functional milestones`,
        `Master project management frameworks, resource budgeting, and risk mitigation strategies`,
        `Conduct 1-on-1 career development check-ins and improve team collaboration and morale`
      ];
      skills = ["Agile Leadership", "Project Management", "People Operations"];
      summary = "Focus on project execution, delivery accountability, budget planning, and people management to transition to an Engineering Manager.";
    } else {
      // EXECUTIVE
      goals = [
        `Align engineering OKRs with core business metrics and present technical roadmaps to stakeholders`,
        `Design long-term organizational architecture and define scalable developer workflow standards`,
        `Navigate cross-team dynamics, resolve complex resource conflicts, and build engineering culture`
      ];
      skills = ["Strategic Alignment", "Executive Presence", "Org Architecture"];
      summary = "Focus on high-level organizational scaling, business alignment, strategic budgeting, and developer culture to transition to an Executive role.";
    }
  }
  
  // Build goal_reasons
  const goal_reasons = {};
  goals.forEach(g => {
    goal_reasons[g] = `Achieving this goal helps you build the necessary foundation to become a successful ${careerGoal}.`;
  });
  
  return {
    goals,
    skills,
    milestones: [{
      id: `${lowId}-ms-1`,
      title: `Complete ${nodeLabel} objectives`,
      detail: `Lay down solid foundations in ${nodeLabel} to progress toward ${careerGoal}.`,
      timeframe: nodeLabel
    }],
    summary,
    goal_reasons,
    stageGoals: goals.slice(0, 2),
    isMock: true
  };
}

app.post("/api/node-content", validateRequest(nodeContentSchema), async (req, res) => {
  const profile = sanitizeProfile(req.body.profile);
  const nodeType = sanitizeInput(req.body.nodeType, 100);
  const nodeId = sanitizeInput(req.body.nodeId, 100);
  const nodeLabel = sanitizeInput(req.body.nodeLabel, 200);
  const parentNodeLabel = sanitizeInput(req.body.parentNodeLabel, 200);
  const completedMilestones = req.body.completedMilestones;
  const userSelections = req.body.userSelections;
  const allCompletedGoals = req.body.allCompletedGoals;

  try {
    if (!profile || !nodeId || !nodeType) {
      return res.status(400).json({ error: "profile, nodeId, and nodeType are required." });
    }
    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning offline mock node content for:", nodeId);
      const mockContent = getOfflineMockNodeContent(nodeId, nodeLabel || nodeId, profile);
      return res.json(mockContent);
    }

    const stage = profile.stage || "UNDERGRADUATE";
    const ageRule = AGE_CONTENT_RULES[stage] || AGE_CONTENT_RULES.UNDERGRADUATE;
    const careerGoal = profile.goal?.description || "their career goal";
    const fieldLabel = profile.field?.type === "OTHER" ? profile.field?.customValue : profile.field?.type;
    const completedGoalsList = (allCompletedGoals || []).join(", ") || "None yet";
    const isCheckpointType = nodeType === "checkpoint" || nodeId.toLowerCase().includes("checkpoint") || nodeId.toLowerCase().includes("-cp");

    const boardSelectVal = userSelections?.["node-board-select"] || "";
    const ugSelectVal = userSelections?.["node-ug-select"] || "";
    const mastersSelectVal = userSelections?.["node-masters-select"] || "";

    let stageFocusRules = "";
    const lowNodeId = nodeId.toLowerCase();
    if (lowNodeId.includes("sem-") || lowNodeId.includes("semester") || lowNodeId.startsWith("goal-")) {
      stageFocusRules = `
### STAGE-SPECIFIC FOCUS RULES:
Since this node represents a specific academic grade or college semester, you MUST focus the goals strictly on the typical milestones for this period. Do NOT repeat topics or skills across stages:
- **Grade 7-8**: Basic block coding, logic games, math puzzles, general curiosity. No advanced topics.
- **Grade 9**: Basic text programming (Python syntax), algebra/math foundations, active study habits.
- **Grade 10**: 10th board exams prep, stream/elective choice alignment.
- **Grade 11**: Specialization stream start, basic programming or commerce concepts in school.
- **Grade 12**: 12th board exams prep, college entrance preparation, college applications.
- **Semester 1**: College adaptation, GPA, campus coding/student clubs.
- **Semester 2**: Basic data structures, programming language basics, basic online problem solving.
- **Semester 3**: Relational databases (SQL), version control (Git & GitHub), small portfolio database-driven projects.
- **Semester 4**: Specialized portfolio project building, resume writing, summer internship search on Internshala.
- **Semester 5**: Advanced core subjects (OS, networks), final-year capstone project abstract preparation, remote internships.
- **Semester 6**: Placement preparation, LeetCode DSA practice (arrays, trees, graphs), mock interviews, major project prototype deployment.
- **Semester 7**: Job applications, campus placement drives, technical and HR interview rounds.
- **Semester 8**: Final capstone defense, clearing graduation credits, pre-onboarding modules.
`;
    }

    const prompt = `You are an expert career advisor generating content for ONE specific node in an interactive career mindmap.

## User Profile
- Name: ${profile.name}
- Current Stage: ${stage} (age ${ageRule.age})
- Field: ${fieldLabel}
- Career Goal: "${careerGoal}"
- Financial Tier: ${profile.financialTier}
- Current Skills: ${(profile.skills || []).join(", ")}
${boardSelectVal ? `- Selected Board & Stream: ${boardSelectVal}` : ""}
${ugSelectVal ? `- Selected UG Degree: ${ugSelectVal}` : ""}
${mastersSelectVal ? `- Selected Post-grad Pathway: ${mastersSelectVal}` : ""}

${stageFocusRules}

## Node Being Generated
- Node ID: ${nodeId}
- Node Type: ${nodeType}
- Node Label: "${nodeLabel}"
- Parent Node: "${parentNodeLabel || "Root"}"
- Already completed goals in this journey: ${completedGoalsList}

${isCheckpointType ? `
### SPECIAL RULE FOR CHECKPOINT NODES:
This is a checkpoint node. Checkpoints represent milestones where the user pauses to review achievements and generate a mini-resume.
1. The "goals" array MUST be empty: [].
2. Return a list of 2-3 specific achievements/milestones suitable for this position/stage in the "achievements" array field (e.g. "Acquired Grade 10 Board Certification", "Completed stream selection and high-school academic path alignment").
` : `
## Age-Appropriate Content Rule (STRICTLY ENFORCED)
Stage: ${stage} — ${ageRule.rules}

## ZERO REPETITION RULE
Do NOT repeat any goal, skill, or milestone that appears in the already-completed list: [${completedGoalsList}]
`}

## Task
Generate content specifically for THIS node ("${nodeLabel}") that directly helps ${profile.name} reach their goal of becoming a "${careerGoal}".

## Output Format (raw JSON only, no markdown)
{
  "goals": [
    ${isCheckpointType ? "" : `"Goal sentence 1 (specific, age-appropriate, tied to ${careerGoal})", "Goal sentence 2", "Goal sentence 3"`}
  ],
  "achievements": [
    ${isCheckpointType ? `"Specific milestone achievement 1 (suited to ${nodeLabel} and ${careerGoal})", "Specific milestone achievement 2"` : ""}
  ],
  "skills": [
    "Skill 1 (never repeat from completed list)",
    "Skill 2",
    "Skill 3"
  ],
  "milestones": [
    {
      "id": "${nodeId}-ms-1",
      "title": "Specific milestone title",
      "detail": "What to do and why it matters for reaching ${careerGoal}",
      "timeframe": "${nodeLabel}"
    }
  ],
  "summary": "One paragraph: what this stage is about and why it matters for reaching ${careerGoal}",
  "goal_reasons": {
    ${isCheckpointType ? "" : `"Goal sentence 1": "One sentence connecting this goal directly to becoming a ${careerGoal}", "Goal sentence 2": "One sentence reason", "Goal sentence 3": "One sentence reason"`}
  },
  "stageGoals": [
    ${isCheckpointType ? "" : `"Short actionable goal 1 for this specific stage", "Short actionable goal 2", "Short actionable goal 3"`}
  ]
}

Rules:
1. Every goal in "goals" MUST have a matching entry in "goal_reasons" with exactly the same text as the key
2. goal_reasons values must be SPECIFIC to this goal AND to "${careerGoal}" — never generic
3. Skills must be deduplicated from: [${completedGoalsList}]
4. Content difficulty must match age ${ageRule.age} exactly
5. Return ONLY the JSON object — no markdown, no preamble`;

    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    console.log(`[Backend] Generating node content for: "${nodeLabel}" (${nodeType}, stage: ${stage})`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(cleanGeminiJsonResponse(responseText));

    // Normalize output
    const normalized = {
      goals: Array.isArray(parsed.goals) ? parsed.goals.filter(g => typeof g === "string" && g.trim()) : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter(a => typeof a === "string" && a.trim()) : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter(s => typeof s === "string" && s.trim()) : [],
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones.map((m, i) => ({
        id: m.id || `${nodeId}-ms-${i + 1}`,
        title: m.title || "Milestone",
        detail: m.detail || "Work toward this stage.",
        timeframe: m.timeframe || nodeLabel
      })) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : `Focus on ${nodeLabel} to progress toward ${careerGoal}.`,
      goal_reasons: (typeof parsed.goal_reasons === "object" && !Array.isArray(parsed.goal_reasons)) ? parsed.goal_reasons : {},
      stageGoals: Array.isArray(parsed.stageGoals) ? parsed.stageGoals : []
    };

    console.log(`[Backend] Node content generated: ${normalized.goals.length} goals, ${normalized.achievements?.length || 0} achievements, ${normalized.skills.length} skills`);
    res.json(normalized);

  } catch (error) {
    console.error("[Backend Error] node-content failed:", error.message);
    const nodeLabel_ = nodeLabel || nodeId;
    const mockContent = getOfflineMockNodeContent(nodeId, nodeLabel_, profile);
    res.json(mockContent);
  }
});

// ─────────────────────────────────────────────────────────
// CHECKPOINT — narrative summary + mini resume
// Called when user opens a gold checkpoint node
// ─────────────────────────────────────────────────────────

app.post("/api/checkpoint", validateRequest(checkpointSchema), async (req, res) => {
  const profile = sanitizeProfile(req.body.profile);
  const checkpointLabel = sanitizeInput(req.body.checkpointLabel, 200);
  const completedGoals = (req.body.completedGoals || []).map(item => sanitizeInput(item, 100));
  const completedSkills = (req.body.completedSkills || []).map(item => sanitizeInput(item, 100));
  const completedCerts = (req.body.completedCerts || []).map(item => sanitizeInput(item, 100));
  const completedInternships = (req.body.completedInternships || []).map(item => sanitizeInput(item, 100));

  try {
    if (!profile) {
      return res.status(400).json({ error: "profile is required." });
    }
    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning mock checkpoint data.");
      const careerGoal_ = profile?.goal?.description || "your career goal";
      return res.json({
        narrative: `You have made great progress on your journey toward becoming a ${careerGoal_}. The skills and experiences you have gathered so far form a strong foundation. Keep pushing forward — you are on track!`,
        skills_earned: completedSkills || [],
        certifications: completedCerts || [],
        internships: completedInternships || [],
        mini_resume: `${profile?.name || "Student"}\nCareer Goal: ${careerGoal_}\nStage: ${profile?.stage || ""}\nSkills: ${(completedSkills || []).join(", ")}`,
        isMock: true
      });
    }

    const careerGoal = profile.goal?.description || "their career goal";
    const stage = profile.stage || "UNDERGRADUATE";
    const completedGoalsList = (completedGoals || []).join("\n- ");
    const skillsList = (completedSkills || []).join(", ");
    const certsList = (completedCerts || []).join(", ") || "None yet";
    const internList = (completedInternships || []).join(", ") || "None yet";

    const prompt = `You are a career advisor generating a checkpoint summary for ${profile.name}.

## Context
- Career Goal: "${careerGoal}"
- Current Stage: ${stage}
- Checkpoint: "${checkpointLabel}"

## What They Have Completed So Far
Goals achieved:
- ${completedGoalsList || "Starting out"}

Skills acquired: ${skillsList || "Building foundations"}
Certifications: ${certsList}
Internships: ${internList}

## Output (raw JSON only, no markdown)
{
  "narrative": "2-3 paragraph inspiring narrative about what ${profile.name} has built so far and exactly why they are on track for ${careerGoal}. Reference their actual completed items. Be specific and encouraging.",
  "skills_earned": ["deduplicated list of all skills earned so far"],
  "certifications": ["list of certs completed"],
  "internships": ["list of internships attempted"],
  "mini_resume": "Formatted resume-style text block the user can copy. Include: Name, Career Goal, Education Stage, Skills (comma-separated), Certifications, Internships, Key Achievements. Use clean formatting with section headers."
}`;

    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    console.log(`[Backend] Generating checkpoint summary for: ${checkpointLabel}`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(cleanGeminiJsonResponse(responseText));

    res.json({
      narrative: parsed.narrative || `You have made excellent progress toward becoming a ${careerGoal}. Keep going!`,
      skills_earned: Array.isArray(parsed.skills_earned) ? parsed.skills_earned : (completedSkills || []),
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      internships: Array.isArray(parsed.internships) ? parsed.internships : [],
      mini_resume: parsed.mini_resume || `${profile.name}\nGoal: ${careerGoal}\nSkills: ${skillsList}`
    });

  } catch (error) {
    console.error("[Backend Error] checkpoint failed:", error.message);
    const careerGoal = profile?.goal?.description || "your career goal";
    res.json({
      narrative: `You have made great progress on your journey toward becoming a ${careerGoal}. The skills and experiences you have gathered so far form a strong foundation. Keep pushing forward — you are on track!`,
      skills_earned: completedSkills || [],
      certifications: completedCerts || [],
      internships: completedInternships || [],
      mini_resume: `${profile?.name || "Student"}\nCareer Goal: ${careerGoal}\nStage: ${profile?.stage || ""}\nSkills: ${(completedSkills || []).join(", ")}`,
      isMock: true
    });
  }
});

// ─────────────────────────────────────────────────────────
// INIT ROADMAP — lightweight first-node initialization
// ─────────────────────────────────────────────────────────

app.post("/api/init-roadmap", validateRequest(profileSchema), async (req, res) => {
  const profile = sanitizeProfile(req.body);
  try {
    if (!profile || !profile.name || !profile.goal || !profile.goal.description) {
      return res.status(400).json({ error: "Invalid profile data. Name and goal description are required." });
    }
    if (!genAI) {
      console.warn("[Backend] OpenAI API client missing. Returning mock init-roadmap.");
      return res.json({
        goalsToAchieve: {
          description: `Your custom pathway to becoming a ${profile.goal?.description || "Professional"}.`,
          milestones: [{ id: "node-root-ms-1", title: `Adapt to ${profile.stage}`, detail: `Focus on mastering the core principles at your current stage.`, timeframe: "NOW", phase: "goalsToAchieve", prerequisites: [] }]
        },
        collegeCourses: [],
        internships: [],
        certifications: [],
        alternatePaths: [],
        decisionTree: { id: "node-root", label: "You Are Here", type: "decision", month: "Now", detail: "Start of your path.", financialTiers: ["LOW", "MEDIUM", "HIGH"], status: "in_progress", children: [] },
        skillGap: { have: profile.skills || [], need: [], bridgingSteps: ["Begin with the starting milestone."] },
        isMock: true
      });
    }

    const stage = profile.stage || "UNDERGRADUATE";
    const ageRule = AGE_CONTENT_RULES[stage] || AGE_CONTENT_RULES.UNDERGRADUATE;
    const careerGoal = profile.goal.description;
    const fieldLabel = profile.field?.type === "OTHER" ? profile.field?.customValue : profile.field?.type;

    console.log(`[Backend] Initializing roadmap scaffold for: ${profile.name} (Stage: ${stage})`);

    const prompt = `You are a career consultant initializing a personalized career path.
Generate a minimal starting roadmap JSON for:
- Name: ${profile.name}
- Current Stage: ${stage} (age ${ageRule.age})
- Field: ${fieldLabel}
- Career Goal: "${careerGoal}"
- Financial Tier: ${profile.financialTier}
- Current Skills: ${(profile.skills || []).join(", ")}

Generate only the starting milestone content, plus initial recommendations for courses, certs, and alternates.

Output format (raw JSON only, no markdown):
{
  "goalsToAchieve": {
    "description": "Chronological pathway from ${stage} to ${careerGoal}",
    "milestones": [
      {
        "id": "node-root-ms-1",
        "title": "Initial Stage: ${stage} Focus",
        "detail": "Actionable focus items for your current stage matching age ${ageRule.age}.",
        "timeframe": "NOW",
        "phase": "goalsToAchieve",
        "prerequisites": []
      }
    ]
  },
  "collegeCourses": [
    {
      "id": "course-1",
      "name": "Foundational Course Name",
      "semester": "Semester 1",
      "reason": "Why this builds core concepts for ${careerGoal}",
      "financialTiers": ["LOW", "MEDIUM", "HIGH"]
    }
  ],
  "internships": [],
  "certifications": [
    {
      "id": "cert-1",
      "name": "Introductory Certification Name",
      "platform": "Coursera or NASSCOM",
      "cost": "Free",
      "duration": "4 weeks",
      "impact": "Builds baseline credibility for ${careerGoal}",
      "financialTiers": ["LOW", "MEDIUM", "HIGH"]
    }
  ],
  "alternatePaths": [
    {
      "id": "alt-1",
      "title": "Alternative Role Name",
      "salaryRange": "Competitive",
      "skillOverlap": 70,
      "pivotRequired": "What is needed to pivot"
    }
  ],
  "skillGap": {
    "have": ${profile.skills && profile.skills.length > 0 ? JSON.stringify(profile.skills) : '[]'},
    "need": [
      { "skill": "Core skill to learn", "milestoneId": "node-root-ms-1" }
    ],
    "bridgingSteps": [
      "Dedicate weekly time to recommended study plan.",
      "Complete introductory certificates."
    ]
  }
}`;

    const model = genAI.getGenerativeModel({
      model: OPENAI_MODEL,
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(cleanGeminiJsonResponse(responseText));

    // Form programmatically a dummy decisionTree to make parsed object pass parseRoadmap
    parsed.decisionTree = {
      id: "node-root",
      label: "You Are Here",
      type: "decision",
      month: "Now",
      detail: "Start of your path.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"],
      status: "in_progress",
      children: []
    };

    res.json(parsed);

  } catch (error) {
    console.error("[Backend Error] init-roadmap failed:", error.message);
    // Return minimal valid roadmap matching schema
    res.json({
      goalsToAchieve: {
        description: `Your custom pathway to becoming a ${profile.goal?.description || "Professional"}.`,
        milestones: [
          {
            id: "node-root-ms-1",
            title: `Adapt to ${profile.stage}`,
            detail: `Focus on mastering the core principles at your current stage.`,
            timeframe: "NOW",
            phase: "goalsToAchieve",
            prerequisites: []
          }
        ]
      },
      collegeCourses: [],
      internships: [],
      certifications: [],
      alternatePaths: [],
      decisionTree: {
        id: "node-root",
        label: "You Are Here",
        type: "decision",
        month: "Now",
        detail: "Start of your path.",
        financialTiers: ["LOW", "MEDIUM", "HIGH"],
        status: "in_progress",
        children: []
      },
      skillGap: {
        have: profile.skills || [],
        need: [],
        bridgingSteps: ["Begin with the starting milestone."]
      },
      isMock: true
    });
  }
});

// Serve frontend assets in production
app.use(express.static(path.join(__dirname, "../dist")));

// Bug #14 fix: SPA catch-all — any unmatched GET request returns index.html
// so that React Router deep links work correctly in production.
// Note: Express 5 requires '/{*path}' instead of '*' due to path-to-regexp v8.
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Career GPS Secure Proxy running on port ${PORT}`);
  console.log(` Environment: Local Development Proxy`);
  console.log(` Target OpenAI Model: ${OPENAI_MODEL}`);
  console.log(`==================================================`);
});
