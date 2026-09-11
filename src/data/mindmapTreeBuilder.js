/**
 * mindmapTreeBuilder.js
 * Pure function — builds the full academic-to-career mindmap tree
 * from a user profile + roadmap. Returns only the options that are related
 * to the user's specific target career goal.
 */

import { inferCollegeDegree } from "../utils/roadmapHelpers.js";

// ─────────────────────────────────────────────────────────
// Node type colours (consistent with existing DecisionTree)
// ─────────────────────────────────────────────────────────
export const NODE_COLORS = {
  root:        "#7c3aed", // violet — the "you are here" centre
  path:        "#2563eb", // blue — major pathway branch (CBSE / Inter / Diploma)
  stream:      "#0891b2", // cyan — stream/elective choice
  degree:      "#059669", // emerald — degree programme
  milestone:   "#8fd5c0", // mint — goals from roadmap
  cert:        "#f59e0b", // amber — certifications
  internship:  "#6366f1", // indigo — internship roles
  goal:        "#f7d06b", // gold — career goal / terminal node
  alternate:   "#f4a38f", // salmon — alternate career paths
  skill:       "#c084fc", // purple — skill gap nodes
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function node(id, label, type, timeframe, detail, extra = {}) {
  return {
    id,
    label,
    type,
    timeframe,
    detail,
    skills: [],          // string[] — required skills (populated by annotator)
    financialTiers: ["LOW", "MEDIUM", "HIGH"],
    status: "not_started",
    isUserPath: false,   // true if this is on the user's actual selected path
    children: [],
    ...extra,
  };
}

// User-specific node generators (from actual roadmap)
function buildMilestoneChain(roadmap) {
  const milestones = roadmap.goalsToAchieve?.milestones || [];
  return milestones.map((ms, i) =>
    node(
      ms.id,
      ms.title.length > 36 ? ms.title.slice(0, 34) + "…" : ms.title,
      "milestone",
      ms.timeframe,
      ms.detail,
      {
        fullTitle: ms.title,
        prerequisites: ms.prerequisites || [],
        sequenceIndex: i,
      }
    )
  );
}

function buildCertNodes(roadmap, financialTier) {
  return (roadmap.certifications || [])
    .filter(c => c.financialTiers?.includes(financialTier))
    .map(c =>
      node(
        c.id,
        c.name.length > 30 ? c.name.slice(0, 28) + "…" : c.name,
        "cert",
        c.duration,
        `${c.platform} · ${c.cost}\n${c.impact}`,
        {
          fullTitle: c.name,
          platform: c.platform,
          cost: c.cost,
          impact: c.impact,
          financialTiers: c.financialTiers,
        }
      )
    );
}

function buildInternNodes(roadmap, financialTier) {
  return (roadmap.internships || [])
    .filter(i => i.financialTiers?.includes(financialTier))
    .map(i =>
      node(
        i.id,
        i.role.length > 30 ? i.role.slice(0, 28) + "…" : i.role,
        "internship",
        i.when,
        `Platforms: ${i.platforms.join(", ")}\n${i.stipendNote}`,
        {
          fullTitle: i.role,
          platforms: i.platforms,
          stipendNote: i.stipendNote,
          financialTiers: i.financialTiers,
        }
      )
    );
}

function buildAlternateNodes(roadmap) {
  return (roadmap.alternatePaths || []).map(a =>
    node(
      a.id,
      a.title,
      "alternate",
      a.salaryRange,
      `Skill overlap: ${a.skillOverlap}%\nPivot needed: ${a.pivotRequired}`,
      {
        salaryRange: a.salaryRange,
        skillOverlap: a.skillOverlap,
        pivotRequired: a.pivotRequired,
      }
    )
  );
}

function annotateSkills(nodes, skillGap) {
  if (!skillGap?.need?.length) return nodes;
  
  const skillMap = {};
  for (const item of skillGap.need) {
    if (!skillMap[item.milestoneId]) skillMap[item.milestoneId] = [];
    skillMap[item.milestoneId].push(item.skill);
  }
  
  function annotate(n) {
    return {
      ...n,
      skills: skillMap[n.id] || [],
      children: n.children.map(annotate),
    };
  }
  
  return nodes.map(annotate);
}

function getMilestoneStage(timeframe, title = "", detail = "") {
  const tf = (timeframe || "").toLowerCase();
  const t = (title || "").toLowerCase();
  const d = (detail || "").toLowerCase();

  // Intercept school milestones that mention school levels/boards in title or detail
  const isSchoolText = 
    t.includes("11th standard") || d.includes("11th standard") ||
    t.includes("12th standard") || d.includes("12th standard") ||
    t.includes("10th standard") || d.includes("10th standard") ||
    t.includes("inter year 1") || d.includes("inter year 1") ||
    t.includes("inter year 2") || d.includes("inter year 2") ||
    t.includes("10th board") || d.includes("10th board") ||
    t.includes("12th board") || d.includes("12th board") ||
    ((t.includes("board exam") || d.includes("board exam")) && !t.includes("certification") && !t.includes("residency")) ||
    (t.includes("board / year 1 exam") || t.includes("board / year 2 exam")) ||
    (t.includes("higher secondary") || d.includes("higher secondary"));

  if (isSchoolText) {
    if (t.includes("12th") || t.includes("year 2") || d.includes("12th") || d.includes("inter year 2")) {
      return "school-12";
    }
    if (t.includes("11th") || t.includes("year 1") || d.includes("11th") || d.includes("inter year 1")) {
      return "school-11";
    }
    if (t.includes("10th") || d.includes("10th")) {
      return "school-10";
    }
    return "school-11";
  }

  // ─── PRIORITY 0: Grade/class number in timeframe is the strongest signal ───
  // Check grade/class numbers FIRST before any other pattern to prevent
  // misclassification (e.g. Grade 11 timeframes must not fall into diploma buckets)

  // Grade 11 — explicit timeframe patterns
  if (
    tf.includes("grade 11") || tf.includes("class 11") || tf.includes("11th grade") ||
    tf.includes("grade 11 (") || tf.includes("11th (")
  ) {
    return "school-11";
  }
  // Grade 12 — explicit timeframe patterns
  if (
    tf.includes("grade 12") || tf.includes("class 12") || tf.includes("12th grade") ||
    tf.includes("grade 12 (") || tf.includes("12th (")
  ) {
    return "school-12";
  }
  // Grade 10
  if (
    tf.includes("grade 10") || tf.includes("class 10") || tf.includes("10th grade") ||
    tf.includes("grade 10 (")
  ) {
    return "school-10";
  }
  // Grade 9
  if (
    tf.includes("grade 9") || tf.includes("class 9") || tf.includes("9th grade") ||
    tf.includes("grade 9 (")
  ) {
    return "school-9";
  }
  // Grade 8
  if (
    tf.includes("grade 8") || tf.includes("class 8") || tf.includes("8th grade") ||
    tf.includes("grade 8 (")
  ) {
    return "school-8";
  }

  // ─── PRIORITY 1: Legacy timeframe keywords (11th/12th without "grade" prefix) ───
  if (tf.includes("11th") || tf.includes("year 4 - stream") || tf.includes("stream start")) {
    // Only match stream start if NOT college-year context
    if (!tf.includes("college") && !tf.includes("diploma")) {
      return "school-11";
    }
  }
  if (tf.includes("12th") || tf.includes("final boards") || tf.includes("year 5 - final")) {
    if (!tf.includes("college") && !tf.includes("diploma")) {
      return "school-12";
    }
  }
  if (tf.includes("10th") && !tf.includes("college")) {
    return "school-10";
  }
  if (tf.includes("9th") && !tf.includes("college")) {
    return "school-9";
  }
  if (tf.includes("8th") && !tf.includes("college")) {
    return "school-8";
  }

  // ─── PRIORITY 2: Career Progression (must be after school checks) ───
  if (
    tf.includes("year 5") || tf.includes("year 6") || tf.includes("year 7") ||
    tf.includes("year 8") || tf.includes("year 9") || tf.includes("year 10") ||
    tf.includes("junior role") || tf.includes("mid-level") || tf.includes("senior role") ||
    tf.includes("lead / specialist") ||
    t.includes("junior role") || t.includes("mid-level") || t.includes("senior") ||
    t.includes("lead / specialist") || t.includes("leadership")
  ) {
    return "career-progression";
  }

  // ─── PRIORITY 3: Title/detail-based school fallbacks ───
  if (t.includes("10th board") || t.includes("class 10") || t.includes("curiosity") || t.includes("scratch project")) {
    return "school-10";
  }
  if (t.includes("9th grade") || t.includes("keyboard confidence")) {
    return "school-9";
  }
  if (t.includes("8th grade") || t.includes("logical puzzles")) {
    return "school-8";
  }
  if (t.includes("curiosity & hobby") || d.includes("scratch")) {
    return "school-8";
  }
  if (t.includes("digital literacy") || d.includes("typing daily")) {
    return "school-8";
  }
  if (t.includes("deepen logic") || d.includes("basic arithmetic")) {
    return "school-9";
  }
  if (
    t.includes("11th grade") || t.includes("transition to higher secondary") ||
    t.includes("higher secondary stream") || t.includes("academic routine")
  ) {
    return "school-11";
  }
  if (
    t.includes("12th board") || t.includes("final board & college entrance") ||
    t.includes("12th board / final")
  ) {
    return "school-12";
  }

  // ─── PRIORITY 4: Diploma-specific patterns ───
  if (tf.includes("diploma year 1")) return "dip-1";
  if (tf.includes("diploma year 2")) return "dip-2";
  if (tf.includes("diploma year 3") || tf.includes("final board / diploma year 3")) return "dip-3";
  if (t.includes("polytechnic diploma") || d.includes("polytechnic syllabus")) return "dip-1";
  if (t.includes("diploma year 1") || d.includes("polytechnic 1st year")) return "dip-1";
  if (t.includes("diploma year 2") || d.includes("diploma year 2")) return "dip-2";
  if (t.includes("final diploma exams") || d.includes("diploma year 3")) return "dip-3";

  // ─── PRIORITY 5: College Years — explicit "college year N" patterns first ───
  if (tf.includes("college year 1") || tf.includes("college 1st year") || tf.includes("1st year of college")) return "college-1";
  if (tf.includes("college year 2") || tf.includes("college 2nd year") || tf.includes("2nd year of college")) return "college-2";
  if (tf.includes("college year 3") || tf.includes("college 3rd year") || tf.includes("3rd year of college")) return "college-3";
  if (tf.includes("college year 4") || tf.includes("college 4th year") || tf.includes("4th year of college")) return "college-4";

  // PG-specific timeframes — must be checked before generic "year N" patterns
  if (tf.includes("pg year 1")) return "college-1";
  if (tf.includes("pg year 2")) return "college-2";

  // Semester-specific timeframes (undergrad semesters 1-8)
  if (tf.includes("sem 1") || tf.includes("sem 2") || tf.includes("semester 1") || tf.includes("semester 2")) return "college-1";
  if (tf.includes("sem 3") || tf.includes("sem 4") || tf.includes("semester 3") || tf.includes("semester 4")) return "college-2";
  if (tf.includes("sem 5") || tf.includes("sem 6") || tf.includes("semester 5") || tf.includes("semester 6")) return "college-3";
  if (tf.includes("sem 7") || tf.includes("sem 8") || tf.includes("semester 7") || tf.includes("semester 8")) return "college-4";

  // Generic "year N" fallbacks (only after explicit college and diploma checks)
  if (tf.includes("year 1")) return "college-1";
  if (tf.includes("year 2")) return "college-2";
  if (tf.includes("year 3")) return "college-3";
  if (tf.includes("year 4") || tf.includes("final year")) return "college-4";

  // Phase 4 Month-based timeframes (Post-College)
  if (tf.includes("month 3") || tf.includes("post-college")) return "college-1";
  if (tf.includes("month 6") || tf.includes("initial steps")) return "college-1";
  if (tf.includes("month 12") || tf.includes("core growth")) return "college-1";
  if (tf.includes("advanced level")) return "college-2";

  // Titles for college phase
  if (t.includes("college academics") || t.includes("maintain high gpa")) return "college-1";
  if (t.includes("portfolio") || t.includes("apply for internships") || t.includes("professional cert")) return "college-2";
  if (t.includes("placement preparation") || t.includes("advanced capstone")) return "college-3";
  if (t.includes("final placements") || t.includes("university graduation")) return "college-4";

  // Post-college phase 4 titles
  if (t.includes("pg entrance") || t.includes("ideation & mvp") || t.includes("job search")) return "college-1";
  if (t.includes("pg admissions") || t.includes("refinement & incorporation") || t.includes("onboarding")) return "college-1";
  if (t.includes("pg academic rhythm") || t.includes("pitch deck") || t.includes("independence")) return "college-1";
  if (t.includes("pg thesis") || t.includes("commercial launch") || t.includes("mid-level / promotion")) return "college-2";

  return "unknown";
}

function buildSkillsNode(nodeId, roadmap, profile, milestoneIds = []) {
  const careerGoal = profile?.goal?.description || "";
  const fieldType = profile?.field?.type || "TECH";

  const isChefGoal = careerGoal.toLowerCase().includes("chef") ||
                     careerGoal.toLowerCase().includes("culinary") ||
                     careerGoal.toLowerCase().includes("cook") ||
                     careerGoal.toLowerCase().includes("hotel") ||
                     careerGoal.toLowerCase().includes("bakery") ||
                     careerGoal.toLowerCase().includes("food") ||
                     careerGoal.toLowerCase().includes("restaurant");

  const activeField = isChefGoal ? "CHEF" : fieldType;

  // Extract dynamic skills from Gemini API generated skillGap
  let dynamicNeed = [];
  if (roadmap?.skillGap?.need && milestoneIds.length > 0) {
    roadmap.skillGap.need.forEach(item => {
      if (milestoneIds.includes(item.milestoneId)) {
        dynamicNeed.push(item.skill);
      }
    });
  }

  // If we found dynamic skills matching this stage/milestone, prioritize them!
  if (dynamicNeed.length > 0) {
    const bridgingSteps = roadmap.skillGap.bridgingSteps || [
      "Follow the milestone objectives sequentially.",
      "Complete recommended coursework.",
      "Build a project demonstrating these skills."
    ];
    
    return node(
      `${nodeId}-skill-gap-root`,
      "Skills to Build",
      "skill",
      "Current Stage",
      `You currently have: ${roadmap.skillGap.have?.join(", ") || "foundational skills"}.\nBridging steps:\n${bridgingSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      {
        skills: dynamicNeed,
        children: [],
        isUserPath: true
      }
    );
  }

  // Otherwise, fallback to the smart offline stage-specific/goal-specific defaults
  const isSchoolNode = nodeId.includes("school") || nodeId.includes("11th") || nodeId.includes("12th") || nodeId.includes("stream");
  if (isSchoolNode) {
    let have = ["Basic digital literacy", "Curiosity"];
    let need = [];
    let steps = [];

    if (nodeId.includes("8")) {
      // Grade 8
      if (activeField === "TECH") {
        have = ["Basic typing", "Curiosity", "Simple computer apps"];
        need = ["Logical reasoning", "Basic Math foundations", "Block-based coding (Scratch)"];
        steps = [
          "Practice daily analytical puzzles.",
          "Excel in standard school mathematics.",
          "Explore Scratch visual programming to build basic logical loops."
        ];
      } else if (activeField === "MEDICINE" || activeField === "SCIENCE") {
        have = ["Basic scientific interest", "Observational curiosity"];
        need = ["Basic biology classification", "Scientific observation", "First Aid fundamentals"];
        steps = [
          "Maintain a simple botany or chemistry observation diary.",
          "Understand basic hygiene, pathogens, and emergency First Aid steps.",
          "Excel in school biology and physical sciences."
        ];
      } else if (activeField === "COMMERCE") {
        have = ["Basic arithmetic", "Curiosity"];
        need = ["Logical calculations", "Decision-making heuristics", "Introductory financial concepts"];
        steps = [
          "Excel in basic school math calculations.",
          "Explore simple household budgeting exercises.",
          "Practice basic analytical puzzles."
        ];
      } else if (activeField === "LAW" || activeField === "ARTS" || activeField === "DESIGN") {
        have = ["Language skills", "Creative interests"];
        need = ["Creative writing", "Public speaking basics", "Visual logic / sketching"];
        steps = [
          "Practice writing weekly essays or short stories.",
          "Participate in school debates or declamation events.",
          "Explore basic drawing, composition, or photography."
        ];
      } else if (activeField === "CHEF") {
        have = ["Helping in kitchen", "Taste interest", "Manual dexterity"];
        need = ["Ingredient science", "Kitchen safety basics", "Sensory taste profiles"];
        steps = [
          "Help measure out weights and volumes for home cooking recipe science.",
          "Understand stove and knife safety basics under adult supervision.",
          "Explore spice combinations and flavor tasting exercises."
        ];
      } else {
        have = ["Basic logic", "Curiosity"];
        need = ["Logical reasoning", "Basic Math foundations", "Communication skills"];
        steps = [
          "Practice daily analytical puzzles.",
          "Excel in standard school mathematics.",
          "Read diverse fiction/non-fiction books weekly."
        ];
      }
    } else if (nodeId.includes("9") || nodeId.includes("10")) {
      // Grade 9-10
      if (activeField === "TECH") {
        have = ["Computer literacy", "Logical basics", "Analytical interest"];
        need = ["Board exam writing skills", "Problem-solving heuristics", "Introductory coding concepts"];
        steps = [
          "Focus heavily on school science and mathematics boards.",
          "Solve logical reasoning test papers.",
          "Improve typing speed and try simple CLI programs (e.g. basic Python)."
        ];
      } else if (activeField === "MEDICINE" || activeField === "SCIENCE") {
        have = ["Scientific diagrams", "Academic memory"];
        need = ["Board exam writing skills", "High-school Biology/Chemistry foundations", "Scientific experiment protocols"];
        steps = [
          "Focus heavily on high-school biology, anatomy, and chemistry boards.",
          "Read popular science books or documentaries about physiology and medicine.",
          "Practice drawing neat labeled scientific diagrams for exams."
        ];
      } else if (activeField === "COMMERCE") {
        have = ["Percentage arithmetic", "Analytical interests"];
        need = ["Board exam writing skills", "Basic financial accounting", "Economic logic"];
        steps = [
          "Excel in school mathematics and social studies (economics) boards.",
          "Understand basic concepts of saving, inflation, and simple interest.",
          "Analyze real-world business case studies of retail shops."
        ];
      } else if (activeField === "LAW" || activeField === "ARTS" || activeField === "DESIGN") {
        have = ["Advanced composition", "Public speaking comfort"];
        need = ["Board exam writing skills", "Critical analysis", "Portfolio sketching / voice training"];
        steps = [
          "Excel in school social sciences and languages boards.",
          "Practice writing persuasive debates and structured essays.",
          "Start building a portfolio of art, design, or writing pieces."
        ];
      } else if (activeField === "CHEF") {
        have = ["Recipe following", "Heat/cooking familiarity"];
        need = ["Board exam writing skills", "Culinary math & proportions", "Basic food hygiene principles"];
        steps = [
          "Excel in school board exams (focus on chemistry of heat/matter).",
          "Learn measurement conversions: metric to imperial, scaling recipes.",
          "Study food safety guidelines: cross-contamination, safe temperatures."
        ];
      } else {
        have = ["Reading habit", "Syllabus mapping"];
        need = ["Board exam writing skills", "Communication confidence", "Logical heuristics"];
        steps = [
          "Focus heavily on school board examination scores.",
          "Practice public presentation or speaking topics.",
          "Solve basic analytical aptitude tests."
        ];
      }
    } else {
      // Grade 11-12
      if (activeField === "TECH") {
        have = ["Syllabus basics", "Algorithmic thinking foundations"];
        need = ["Advanced Physics/Math core", "Entrance test aptitude", "Basic scripting syntax"];
        steps = [
          "Master higher secondary science and math syllabi.",
          "Practice timed entrance-exam mock tests (JEE/NEET/CUET format).",
          "Learn basic syntax rules of programming or business spreadsheets."
        ];
      } else if (activeField === "MEDICINE" || activeField === "SCIENCE") {
        have = ["Biological systems basics", "Academic chemistry comfort"];
        need = ["Advanced Biology/Chemistry core", "Pre-medical entrance aptitude", "Basic lab protocols"];
        steps = [
          "Master higher secondary biology and chemistry syllabi.",
          "Solve NEET / biology-based entrance mock papers under time constraints.",
          "Learn basic biological lab safety rules and clinical concepts."
        ];
      } else if (activeField === "COMMERCE") {
        have = ["Accounting entries comfort", "Economic structures basics"];
        need = ["Business math core", "Commerce stream basics", "Excel modeling concepts"];
        steps = [
          "Master accountancy, business studies, and economics syllabi.",
          "Solve CUET/commerce entrance tests mock papers.",
          "Learn basic Excel sheet calculations and formulas."
        ];
      } else if (activeField === "LAW" || activeField === "ARTS" || activeField === "DESIGN") {
        have = ["Essay composition excellence", "Current affairs baseline"];
        need = ["Legal aptitude / General knowledge", "Logical reasoning", "Advanced composition"];
        steps = [
          "Read daily news editorials and study basic constitutional law principles.",
          "Solve CLAT/CUET mock tests and critical reasoning sections.",
          "Refine your creative design or writing portfolio."
        ];
      } else if (activeField === "CHEF") {
        have = ["Basic culinary techniques", "Kitchen chemistry baseline"];
        need = ["Food chemistry & heat transfer", "Culinary history & techniques", "Kitchen teamwork basics"];
        steps = [
          "Study how heat affects proteins, starches, and fats (culinary science).",
          "Research classic culinary techniques (French mother sauces, baking ratios).",
          "Participate in team-based activities or hospitality volunteer roles."
        ];
      } else {
        have = ["Higher secondary curriculum"];
        need = ["Analytical reasoning", "Aptitude target settings", "Soft skills baseline"];
        steps = [
          "Master stream-specific higher secondary courses.",
          "Solve general entrance mock exams (CUET / regional aptitude tests).",
          "Practice verbal communications and interpersonal interactions."
        ];
      }
    }

    return node(
      `${nodeId}-skill-gap-root`,
      "Skills to Build",
      "skill",
      "Current Stage",
      `You currently have: ${have.join(", ")}.\nBridging steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      {
        skills: need,
        children: [],
        isUserPath: true
      }
    );
  }

  // Otherwise, use the career-oriented skills from roadmap
  const skillGap = roadmap.skillGap;
  if (!skillGap) return null;
  return node(
    `${nodeId}-skill-gap-root`,
    "Skills to Build",
    "skill",
    "Ongoing",
    `You currently have: ${skillGap.have?.join(", ") || "foundational skills"}.\nBridging steps:\n${(skillGap.bridgingSteps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    {
      skills: skillGap.need?.map(n => n.skill) || [],
      children: [],
      isUserPath: true
    }
  );
}

function buildYearSpecificSkillsNode(degreeId, year, profile, roadmap, milestoneIds = []) {
  // Extract dynamic skills from Gemini API generated skillGap
  let dynamicNeed = [];
  if (roadmap?.skillGap?.need && milestoneIds.length > 0) {
    roadmap.skillGap.need.forEach(item => {
      if (milestoneIds.includes(item.milestoneId)) {
        dynamicNeed.push(item.skill);
      }
    });
  }

  // If we found dynamic skills matching this stage/milestone, prioritize them!
  if (dynamicNeed.length > 0) {
    const bridgingSteps = roadmap.skillGap.bridgingSteps || [
      "Follow the milestone objectives sequentially.",
      "Complete recommended coursework.",
      "Build a project demonstrating these skills."
    ];
    
    return node(
      `${degreeId}-year-${year}-skills`,
      "Skills to Build",
      "skill",
      `Year ${year} Focus`,
      `You currently have: ${roadmap.skillGap.have?.join(", ") || "foundational skills"}.\nBridging steps:\n${bridgingSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      {
        skills: dynamicNeed,
        children: [],
        isUserPath: true
      }
    );
  }

  const isWorking = degreeId.includes("working");
  const isPostgrad = degreeId.includes("pg");
  const isUg = !isWorking && !isPostgrad;

  let have = [];
  let need = [];
  let steps = [];

  if (isUg) {
    if (year === 1) {
      have = ["Basic logic", "High school mathematics"];
      need = ["Academic algorithms", "C/C++/Python coding logic", "Foundational GPA modules"];
      steps = [
        "Master college algebra and discrete structures.",
        "Practice coding simple data structures on paper and IDE.",
        "Attend core programming tutorials and maintain >8.0 GPA."
      ];
    } else if (year === 2) {
      have = ["Basic scripting syntax", "Classroom foundations"];
      need = ["Web frameworks/databases", "Version control (Git)", "Developer environment setup"];
      steps = [
        "Learn Git workflow: branch, commit, push/pull requests.",
        "Build a simple CRUD application using a standard database (SQL/MongoDB).",
        "Prepare and register for your first foundational industry certification."
      ];
    } else if (year === 3) {
      have = ["Version control", "Basic web/database CRUD projects"];
      need = ["Portfolio building", "Mock coding tests", "Stipend-based internship preparation"];
      steps = [
        "Create a personal GitHub portfolio showcasing at least 2 complete projects.",
        "Practice timed data structures & algorithms puzzles (LeetCode/HackerRank).",
        "Write a clean resume and apply to stipend-paying internships."
      ];
    } else if (year === 4) {
      have = ["Resume draft", "Basic internship/project experience"];
      need = ["System Design concepts", "Mock HR & technical interviews", "Graduation capstone delivery"];
      steps = [
        "Understand system scaling, API design, and database normalization.",
        "Perform at least 3 peer-to-peer mock interviews.",
        "Complete and document your final-year capstone project."
      ];
    }
  } else if (isPostgrad) {
    if (year === 1) {
      have = ["Undergrad degree foundations"];
      need = ["Research methodology", "Advanced domain algorithms", "Specialized tech stack"];
      steps = [
        "Read 5 seminal research papers in your target field.",
        "Master advanced theoretical modules and algorithms.",
        "Identify potential thesis advisor and define research topic area."
      ];
    } else {
      have = ["Thesis topic defined", "Literature review complete"];
      need = ["Thesis dissertation writing", "Journal paper publication guidelines", "Specialized placements prep"];
      steps = [
        "Draft and defend your master's thesis dissertation.",
        "Write and submit a research paper to a recognized conference or journal.",
        "Prepare for specialized R&D or technical leadership placement drives."
      ];
    }
  } else if (isWorking) {
    if (year === 1) {
      have = ["Academic/Foundational knowledge"];
      need = ["Production-grade codebases", "Corporate toolchains (Jira, CI/CD)", "Professional upskilling"];
      steps = [
        "Learn containerization (Docker) and basic CI/CD pipeline automation.",
        "Understand company-specific reporting frameworks and ticketing tools.",
        "Secure professional certifications aligned with your current job role."
      ];
    } else {
      have = ["CI/CD familiarity", "Basic ticketing/workplace routine"];
      need = ["System architecture ownership", "Cross-team communication", "Promotion / transition strategy"];
      steps = [
        "Lead a small feature development from design to deployment.",
        "Mentor new hires or interns in your immediate team.",
        "Compile a performance feedback log for promotion discussions."
      ];
    }
  }

  // Fallback to career roadmap skillGap if stage is not fully matched
  if (need.length === 0 && roadmap?.skillGap) {
    const skillGap = roadmap.skillGap;
    have = skillGap.have || ["Foundational skills"];
    need = skillGap.need?.map(n => n.skill) || [];
    steps = skillGap.bridgingSteps || [];
  }

  return node(
    `${degreeId}-year-${year}-skills`,
    "Skills to Build",
    "skill",
    `Year ${year} Focus`,
    `You currently have: ${have.join(", ")}.\nBridging steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    {
      skills: need,
      children: [],
      isUserPath: true
    }
  );
}

function buildDiplomaYearSkillsNode(streamId, year, profile, roadmap, milestoneIds = []) {
  // Extract dynamic skills from Gemini API generated skillGap
  let dynamicNeed = [];
  if (roadmap?.skillGap?.need && milestoneIds.length > 0) {
    roadmap.skillGap.need.forEach(item => {
      if (milestoneIds.includes(item.milestoneId)) {
        dynamicNeed.push(item.skill);
      }
    });
  }

  // If we found dynamic skills matching this stage/milestone, prioritize them!
  if (dynamicNeed.length > 0) {
    const bridgingSteps = roadmap.skillGap.bridgingSteps || [
      "Follow the milestone objectives sequentially.",
      "Complete recommended coursework.",
      "Build a project demonstrating these skills."
    ];
    
    return node(
      `${streamId}-y${year}-skills`,
      "Skills to Build",
      "skill",
      `Year ${year} Focus`,
      `You currently have: ${roadmap.skillGap.have?.join(", ") || "foundational skills"}.\nBridging steps:\n${bridgingSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      {
        skills: dynamicNeed,
        children: [],
        isUserPath: true
      }
    );
  }

  let have = [];
  let need = [];
  let steps = [];

  if (year === 1) {
    have = ["Basic high school math/science"];
    need = ["Engineering graphics", "Basic workshop safety", "Core calculations"];
    steps = [
      "Practice orthographic and isometric projections on sheet.",
      "Understand workshop machine safeguards and tools.",
      "Excel in applied sciences and basic mathematical operations."
    ];
  } else if (year === 2) {
    have = ["Basic drawing & sciences"];
    need = ["Core stream technicals", "Circuit/Kinematics simulator tools", "Lab testing routines"];
    steps = [
      "Learn stream-specific concepts (e.g. data structures or electronic circuits).",
      "Run simulation software (e.g. Multisim, AutoCAD, or MATLAB basics).",
      "Maintain a consistent lab journal with practical test cases."
    ];
  } else if (year === 3) {
    have = ["Basic simulation & lab routines"];
    need = ["Final year major project", "Competitive entrance (ECET)", "Resume optimization"];
    steps = [
      "Choose, prototype, and document a complete final year group project.",
      "Solve previous years' ECET / lateral-entry aptitude questions.",
      "Write a functional resume highlight your workshop and project skills."
    ];
  }

  return node(
    `${streamId}-y${year}-skills`,
    "Skills to Build",
    "skill",
    `Year ${year} Focus`,
    `You currently have: ${have.join(", ")}.\nBridging steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    {
      skills: need,
      children: [],
      isUserPath: true
    }
  );
}

function categorizeMilestones(milestoneChain) {
  const categorized = {
    school8: [],
    school9: [],
    school10: [],
    school11: [],
    school12: [],
    dip1: [],
    dip2: [],
    dip3: [],
    college1: [],
    college2: [],
    college3: [],
    college4: [],
    postCollege: [],
    genericCollege: []
  };

  milestoneChain.forEach((msNode) => {
    const stage = getMilestoneStage(msNode.timeframe || msNode.label, msNode.fullTitle || msNode.label, msNode.detail);
    
    if (stage === "school-8") categorized.school8.push(msNode);
    else if (stage === "school-9") categorized.school9.push(msNode);
    else if (stage === "school-10") categorized.school10.push(msNode);
    else if (stage === "school-11") categorized.school11.push(msNode);
    else if (stage === "school-12") categorized.school12.push(msNode);
    else if (stage === "dip-1") categorized.dip1.push(msNode);
    else if (stage === "dip-2") categorized.dip2.push(msNode);
    else if (stage === "dip-3") categorized.dip3.push(msNode);
    else if (stage === "college-1") categorized.college1.push(msNode);
    else if (stage === "college-2") categorized.college2.push(msNode);
    else if (stage === "college-3") categorized.college3.push(msNode);
    else if (stage === "college-4") categorized.college4.push(msNode);
    else if (stage === "career-progression") categorized.postCollege.push(msNode);
    else {
      categorized.genericCollege.push(msNode);
    }
  });

  return categorized;
}

// Template generators for non-user paths
function getTemplateGoalLabel(fieldType) {
  const map = {
    TECH: "Senior Software Engineer",
    SCIENCE: "Lead Research Scientist",
    COMMERCE: "Investment Banker / CFO",
    ARTS: "Creative Director",
    LAW: "Senior Partner / Lawyer",
    MEDICINE: "Specialist Doctor / Surgeon",
  };
  return map[fieldType] || "Industry Professional";
}

// Helpers for templates
function getAlternativeGoal(fieldType) {
  const map = {
    TECH: "Product Manager",
    SCIENCE: "Data Scientist",
    COMMERCE: "Management Consultant",
    ARTS: "Content Strategist",
    LAW: "Legal Advisor",
    MEDICINE: "Medical Consultant",
  };
  return map[fieldType] || "Consultant";
}

function getTemplateMilestones(fieldType) {
  const map = {
    TECH: ["Master Programming Basics", "Build Full-Stack Projects", "Ace Technical Interviews"],
    SCIENCE: ["Master Scientific Principles", "Publish a Research Paper", "Present at Conferences"],
    COMMERCE: ["Learn Financial Modeling", "Analyze Case Studies", "Obtain Professional Credentials"],
    ARTS: ["Develop Portfolio Projects", "Establish Personal Brand", "Freelance & Network"],
    LAW: ["Excel in Moot Courts", "Master Constitutional Law", "Pass the Bar Examination"],
    MEDICINE: ["Clear Medical Licensing Exams", "Complete Hospital Internship", "Select Residency Niche"],
  };
  return map[fieldType] || ["Build Foundations", "Gain Experience", "Enter Job Market"];
}

function getTemplateCerts(fieldType, degreeId) {
  const map = {
    TECH: [
      { id: `${degreeId}-c1`, name: "AWS Cloud Practitioner", platform: "Amazon Web Services", cost: "Free Tier", impact: "High value for Cloud & DevOps roles", duration: "1 month" },
      { id: `${degreeId}-c2`, name: "Meta Front-End Developer", platform: "Coursera", cost: "Subscription", impact: "Great portfolio anchor for front-end engineers", duration: "2 months" }
    ],
    SCIENCE: [
      { id: `${degreeId}-c1`, name: "Data Science Specialization", platform: "Coursera / Johns Hopkins", cost: "Subscription", impact: "Bridges lab work with computational research", duration: "3 months" }
    ],
    COMMERCE: [
      { id: `${degreeId}-c1`, name: "Financial Modeling & Valuation", platform: "CFI", cost: "Paid", impact: "Crucial for investment banking placements", duration: "2 months" }
    ],
    ARTS: [
      { id: `${degreeId}-c1`, name: "Google UX Design Professional", platform: "Coursera", cost: "Subscription", impact: "Crucial portfolio validation for UI/UX positions", duration: "3 months" }
    ],
    LAW: [
      { id: `${degreeId}-c1`, name: "Introduction to Contract Law", platform: "Harvard / edX", cost: "Free Option", impact: "Builds early corporate law concepts", duration: "1 month" }
    ],
    MEDICINE: [
      { id: `${degreeId}-c1`, name: "Advanced Cardiovascular Life Support (ACLS)", platform: "AHA", cost: "Paid", impact: "Essential licensing criteria for medical practitioners", duration: "2 weeks" }
    ]
  };
  
  const items = map[fieldType] || [
    { id: `${degreeId}-c1`, name: "Professional Foundation Certificate", platform: "Coursera", cost: "Free Option", impact: "General industry readiness", duration: "1 month" }
  ];
  
  return items.map(c => node(c.id, c.name, "cert", c.duration, `${c.platform} · ${c.cost}\n${c.impact}`));
}

function getTemplateInterns(fieldType, degreeId) {
  const map = {
    TECH: [
      { id: `${degreeId}-i1`, role: "Junior Web Developer", platforms: ["Internshala", "LinkedIn"], when: "Summer Year 2", stipendNote: "Paid (est. 10k/month)" }
    ],
    COMMERCE: [
      { id: `${degreeId}-i1`, role: "Finance Intern", platforms: ["Naukri", "LinkedIn"], when: "Summer Year 2", stipendNote: "Paid (est. 8k/month)" }
    ]
  };
  const items = map[fieldType] || [
    { id: `${degreeId}-i1`, role: "General Practice Intern", platforms: ["LinkedIn", "Direct Referral"], when: "Summer Year 3", stipendNote: "Unpaid / Academic Credit" }
  ];
  return items.map(i => node(i.id, i.role, "internship", i.when, `Platforms: ${i.platforms.join(", ")}\n${i.stipendNote}`));
}

function getTemplateSkills(fieldType) {
  const map = {
    TECH: ["JavaScript", "React", "Node.js", "SQL"],
    SCIENCE: ["Lab Safety", "Data Analytics", "Technical Writing"],
    COMMERCE: ["Accounting", "Excel Valuation", "Business Analysis"],
    ARTS: ["Creative Writing", "Figma", "Social Media Analytics"],
    LAW: ["Legal Drafting", "Argumentation", "Case Analysis"],
    MEDICINE: ["First Aid", "Patient Empathy", "Medical Terminology"],
  };
  return map[fieldType] || ["Communication", "Research", "Teamwork"];
}

function getPgBranchesForUg(degreeId, isUser, profile, roadmap, completedMilestoneIds) {
  let fieldType = "TECH";
  const lowId = degreeId.toLowerCase();
  if (lowId.includes("cse") || lowId.includes("ece")) {
    fieldType = "TECH";
  } else if (lowId.includes("bsc") || lowId.includes("biotech")) {
    fieldType = "SCIENCE";
  } else if (lowId.includes("bcom") || lowId.includes("bba")) {
    fieldType = "COMMERCE";
  } else if (lowId.includes("llb")) {
    fieldType = "LAW";
  } else if (lowId.includes("mbbs") || lowId.includes("nursing")) {
    fieldType = "MEDICINE";
  } else if (lowId.includes("masscomm")) {
    fieldType = "ARTS";
  }

  const pgOpts = getPgDegreeOptions(fieldType);
  return pgOpts.map(opt => {
    const pgBranchId = `${degreeId}-pg-${opt.id.replace("degree-pg-", "")}`;
    const pgBranch = getPgDegreeBranch(pgBranchId, opt.label, profile, roadmap, completedMilestoneIds);
    pgBranch.isUserPath = isUser && pgBranch.isUserPath;
    return pgBranch;
  });
}

function buildDegreeYearPath(degreeId, degreeLabel, numYears, startYear, certNodes, internNodes, milestones, skillNode, careerGoalNode, isUser = false, profile = null, roadmap = null, completedMilestoneIds = null) {
  const yearNodes = [];
  const isWorking = degreeId.includes("working");
  const isPostgrad = degreeId.includes("pg");
  const isUg = !isWorking && !isPostgrad;

  if (isUg) {
    // Generate Semester-based nodes for UG
    const startSem = (startYear - 1) * 2 + 1;
    const endSem = (startYear + numYears - 1) * 2;
    const totalSems = endSem - startSem + 1;

    for (let s = startSem; s <= endSem; s++) {
      let label = "";
      let detail = "";
      let timeframe = `Semester ${s}`;
      let sGoals = [];

      if (s === 1) {
        label = "Semester 1: Campus & Academic Adaptation";
        detail = "Focus on adapting to college life, maintaining a high GPA in engineering physics/math, and joining student academic societies.";
        sGoals = [
          "Establish a solid college study schedule and daily learning habit",
          "Maintain a GPA above 8.0 in your first semester core modules",
          "Join at least one student technical club or interest group"
        ];
      } else if (s === 2) {
        label = "Semester 2: Foundational Algorithms & Skills";
        detail = "Focus on core programming fundamentals, data structures basics, and starting coding practice (e.g. on LeetCode/HackerRank).";
        sGoals = [
          "Master fundamental programming syntax and data structure concepts",
          "Solve 30+ basic coding problems on HackerRank or LeetCode",
          "Maintain high academic performance in university end-semester exams"
        ];
      } else if (s === 3) {
        label = "Semester 3: Core Fields & Tool Mastery";
        detail = "Deep dive into database management systems (DBMS), intermediate programming frameworks, and version control (Git).";
        sGoals = [
          "Build your first database-driven mini-project (SQL/NoSQL)",
          "Learn Git version control and host your code repositories on GitHub",
          "Earn a foundational certification in cloud computing or web basics"
        ];
      } else if (s === 4) {
        label = "Semester 4: Full Stack Projects & Internships Search";
        detail = "Build 2-3 full-stack or specialized projects for your portfolio and start applying for stipend-based internships.";
        sGoals = [
          "Build a comprehensive full-stack application or specialized domain project",
          "Prepare your resume and optimize your LinkedIn profile for recruiters",
          "Apply to at least 10 stipend-paying summer internships on Internshala/LinkedIn"
        ];
      } else if (s === 5) {
        label = "Semester 5: Advanced Electives & Research";
        detail = "Focus on advanced subjects like Operating Systems, Computer Networks, and starting a major group project.";
        sGoals = [
          "Master advanced system-level subjects and network protocols",
          "Form a final year project group and finalize your project abstract",
          "Secure and complete your first virtual/remote or local industry internship"
        ];
      } else if (s === 6) {
        label = "Semester 6: Placement Preparation & Mocks";
        detail = "Practice mock interviews, solve daily DSA problems, review computer science fundamentals, and prepare for campus drives.";
        sGoals = [
          "Solve 100+ DSA problems focusing on arrays, trees, and graphs",
          "Conduct 5+ peer mock interviews and practice behavioral questions",
          "Complete your major semester project prototype and host its live demo"
        ];
      } else if (s === 7) {
        label = "Semester 7: Campus Placement Drives";
        detail = "Actively participate in college placement drives, attend aptitude rounds, and crack technical interview cycles.";
        sGoals = [
          "Submit applications to 15+ campus placement opportunities",
          "Crack the coding/aptitude assessment rounds for target companies",
          "Excel in technical and HR face-to-face interview cycles"
        ];
      } else if (s === 8) {
        label = "Semester 8: Graduation & Professional Onboarding";
        detail = "Successfully complete final semester university requirements, defend your major project, and prepare for corporate onboarding.";
        sGoals = [
          "Complete and defend your final-year major engineering project",
          "Clear all university credit requirements to secure your degree",
          "Complete pre-onboarding training modules sent by your hiring employer"
        ];
      } else {
        label = `Semester ${s}: Advanced Practice`;
        detail = "Complete final practical assignments, licensing, or residency placements.";
        sGoals = ["Fulfill graduation credits and prepare final reports."];
      }

      const sNode = node(
        `${degreeId}-sem-${s}`,
        label,
        "degree",
        timeframe,
        detail,
        { isUserPath: isUser, stageGoals: sGoals }
      );
      yearNodes.push(sNode);
    }

    // Distribute milestones across semester nodes
    milestones.forEach((msNode, idx) => {
      const stage = getMilestoneStage(msNode.timeframe, msNode.fullTitle || msNode.label, msNode.detail);
      let targetSem = startSem;
      if (stage === "college-1") targetSem = startSem + 1; // Map to Semester 2
      else if (stage === "college-2") targetSem = startSem + 3; // Map to Semester 4
      else if (stage === "college-3") targetSem = startSem + 5; // Map to Semester 6
      else if (stage === "college-4") targetSem = startSem + 7; // Map to Semester 8
      else {
        // Fallback to timeframe parsing
        const tf = (msNode.timeframe || "").toLowerCase();
        if (tf.includes("month")) {
          const m = parseInt(tf.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(m)) {
            if (m <= 6) targetSem = startSem;
            else if (m <= 12) targetSem = startSem + 1;
            else if (m <= 18) targetSem = startSem + 2;
            else if (m <= 24) targetSem = startSem + 3;
            else if (m <= 30) targetSem = startSem + 4;
            else if (m <= 36) targetSem = startSem + 5;
            else targetSem = startSem + 7;
          }
        } else {
          const offset = Math.min(idx * 2 + 1, totalSems - 1);
          targetSem = startSem + offset;
        }
      }

      const sNode = yearNodes.find(n => n.id === `${degreeId}-sem-${targetSem}`);
      if (sNode) {
        sNode.children.push(msNode);
      }
    });

    // Chain Semester Nodes
    for (let i = 0; i < yearNodes.length - 1; i++) {
      yearNodes[i].children.push(yearNodes[i + 1]);
    }

    // Attach postgraduate/working progression nodes to the final semester node
    const finalSemNode = yearNodes[yearNodes.length - 1];
    if (isUg && profile && roadmap && completedMilestoneIds) {
      const jobNode = node(
        `${degreeId}-post-job`,
        "Job Placement / Junior Role",
        "path",
        "Post-College",
        "Enter the job market in an entry-level junior role to gain industry experience.",
        { isUserPath: isUser }
      );
      jobNode.children.push(careerGoalNode);

      const pgBranches = getPgBranchesForUg(degreeId, isUser, profile, roadmap, completedMilestoneIds);
      const mastersNode = node(
        `${degreeId}-post-masters`,
        "Higher Studies / Masters",
        "path",
        "Post-College",
        "Pursue a postgraduate degree (M.Tech, MBA, MS, etc.) to specialize further.",
        { isUserPath: isUser, children: pgBranches }
      );

      finalSemNode.children.push(jobNode, mastersNode);
    } else {
      finalSemNode.children.push(careerGoalNode);
    }

    // Attach Certifications to the Semester 2 node
    if (certNodes && certNodes.length > 0) {
      const sem2Node = yearNodes.find(n => n.id === `${degreeId}-sem-${startSem + 1}`) || yearNodes[0];
      const certCluster = node(
        `${degreeId}-cert-cluster`,
        "Certifications",
        "cert",
        "Ongoing",
        "Professional certifications to build credibility in your field.",
        { children: certNodes, isUserPath: isUser }
      );
      sem2Node.children.push(certCluster);
    }

    // Attach Internships to the Semester 4 node
    if (internNodes && internNodes.length > 0) {
      const sem4Node = yearNodes.find(n => n.id === `${degreeId}-sem-${startSem + 3}`) || yearNodes[0];
      const internCluster = node(
        `${degreeId}-intern-cluster`,
        "Internships",
        "internship",
        "Year 2-3",
        "Real-world work experience opportunities.",
        { children: internNodes, isUserPath: isUser }
      );
      sem4Node.children.push(internCluster);
    }

    // Attach dynamic year-specific skills nodes LAST, shifted one level up
    if (isUser && profile && roadmap) {
      yearNodes.forEach((sNode, idx) => {
        // We only generate skills nodes for even semesters (Semester 2, 4, 6, 8) which represent the end of Year 1, 2, 3, 4
        const semNum = parseInt(sNode.id.split("-").pop(), 10);
        if (semNum % 2 === 0) {
          const yearNum = Math.floor((semNum - 1) / 2) + 1;
          
          // Collect milestones from both semesters of this year for the skills check
          const prevSemNode = yearNodes.find(n => n.id === `${degreeId}-sem-${semNum - 1}`);
          const milestoneIds = [
            ...(prevSemNode ? prevSemNode.children : []),
            ...sNode.children
          ].filter(c => c.type === "milestone" || c.type === "goal").map(c => c.id);

          const yrSkills = buildYearSpecificSkillsNode(degreeId, yearNum, profile, roadmap, milestoneIds);
          if (yrSkills) {
            if (semNum === startSem + 1) {
              // For Year 1 (Semester 2), store it on the first semester node (Semester 1) so it gets attached to the Degree node
              yearNodes[0].yr1Skills = yrSkills;
            } else {
              // For Year > 1, attach it to the previous semester node's children list so it renders alongside the next semester
              const parentSemIdx = idx - 1; // Semester 2 is the parent of Semester 3, etc.
              if (parentSemIdx >= 0) {
                yearNodes[parentSemIdx].children.push(yrSkills);
              }
            }
          }
        }
      });
    }

    return yearNodes[0];
  } else {
    for (let y = startYear; y <= numYears + startYear - 1; y++) {
      let label = "";
      let detail = "";
      let timeframe = `Year ${y}`;
      
      if (y === 1) {
        if (isWorking) {
          label = "1st Year: Skill Building & Certs";
          detail = "Focus on intensive upskilling, mastering core tools, and earning professional certifications to build career credibility.";
        } else if (isPostgrad) {
          label = "1st Year: Specialization & Certs";
          detail = "Focus on advanced academic coursework, research methodology, and completing specialized certifications.";
        }
      } else if (y === 2) {
        if (isWorking) {
          label = "2nd Year: Real-world Projects & Transition";
          detail = "Build a robust practical portfolio, apply for transition roles, and complete real-world projects or freelancing.";
        } else if (isPostgrad) {
          label = "2nd Year: Thesis & Industry Exposure";
          detail = "Focus on your master's thesis, project work, and secure a high-impact internship or placement preparation.";
        }
      } else {
        label = `${y}th Year: Advanced Practice`;
        detail = "Complete final practical assignments, licensing, or residency placements.";
      }

      const yNode = node(
        `${degreeId}-year-${y}`,
        label,
        "degree",
        timeframe,
        detail,
        { isUserPath: isUser }
      );
      
      yearNodes.push(yNode);
    }

    // Distribute milestones across year nodes
    milestones.forEach((msNode, idx) => {
      const stage = getMilestoneStage(msNode.timeframe, msNode.fullTitle || msNode.label, msNode.detail);
      let targetYear = startYear;
      if (stage === "college-1") targetYear = startYear;
      else if (stage === "college-2") targetYear = Math.min(startYear + 1, startYear + numYears - 1);
      else if (stage === "college-3") targetYear = Math.min(startYear + 2, startYear + numYears - 1);
      else if (stage === "college-4") targetYear = startYear + numYears - 1;
      else {
        // Fallback to timeframe parsing
        const tf = (msNode.timeframe || "").toLowerCase();
        if (tf.includes("month")) {
          const m = parseInt(tf.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(m)) {
            if (m <= 12) targetYear = startYear;
            else if (m <= 24) targetYear = startYear + 1;
            else if (m <= 36) targetYear = Math.min(startYear + 2, startYear + numYears - 1);
            else targetYear = startYear + numYears - 1;
          }
        } else {
          const offset = Math.min(idx, numYears - 1);
          targetYear = startYear + offset;
        }
      }
      
      const yNode = yearNodes.find(n => n.id === `${degreeId}-year-${targetYear}`);
      if (yNode) {
        yNode.children.push(msNode);
      }
    });

    // Chain Year Nodes
    for (let i = 0; i < yearNodes.length - 1; i++) {
      yearNodes[i].children.push(yearNodes[i + 1]);
    }

    // Attach postgraduate/working progression nodes to the final year node
    const finalYearNode = yearNodes[yearNodes.length - 1];
    if (isUg && profile && roadmap && completedMilestoneIds) {
      const jobNode = node(
        `${degreeId}-post-job`,
        "Job Placement / Junior Role",
        "path",
        "Post-College",
        "Enter the job market in an entry-level junior role to gain industry experience.",
        { isUserPath: isUser }
      );
      jobNode.children.push(careerGoalNode);

      const pgBranches = getPgBranchesForUg(degreeId, isUser, profile, roadmap, completedMilestoneIds);
      const mastersNode = node(
        `${degreeId}-post-masters`,
        "Higher Studies / Masters",
        "path",
        "Post-College",
        "Pursue a postgraduate degree (M.Tech, MBA, MS, etc.) to specialize further.",
        { isUserPath: isUser, children: pgBranches }
      );

      finalYearNode.children.push(jobNode, mastersNode);
    } else {
      finalYearNode.children.push(careerGoalNode);
    }

    // Attach Certifications to the first year node
    if (certNodes && certNodes.length > 0) {
      const firstYearNode = yearNodes[0];
      const certCluster = node(
        `${degreeId}-cert-cluster`,
        "Certifications",
        "cert",
        "Ongoing",
        "Professional certifications to build credibility in your field.",
        { children: certNodes, isUserPath: isUser }
      );
      firstYearNode.children.push(certCluster);
    }

    // Attach Internships to the second year node
    if (internNodes && internNodes.length > 0) {
      const secondYearNode = yearNodes.length > 1 ? yearNodes[1] : yearNodes[0];
      const internCluster = node(
        `${degreeId}-intern-cluster`,
        "Internships",
        "internship",
        "Year 2-3",
        "Real-world work experience opportunities.",
        { children: internNodes, isUserPath: isUser }
      );
      secondYearNode.children.push(internCluster);
    }

    // Attach dynamic year-specific skills nodes LAST, shifted one level up
    if (isUser && profile && roadmap) {
      yearNodes.forEach((yNode, idx) => {
        const yearNum = parseInt(yNode.id.split("-").pop(), 10);
        const milestoneIds = yNode.children
          .filter(c => c.type === "milestone" || c.type === "goal")
          .map(c => c.id);
        
        const yrSkills = buildYearSpecificSkillsNode(degreeId, yearNum - startYear + 1, profile, roadmap, milestoneIds);
        if (yrSkills) {
          if (idx === 0) {
            yNode.yr1Skills = yrSkills;
          } else {
            yearNodes[idx - 1].children.push(yrSkills);
          }
        }
      });
    }

    return yearNodes[0];
  }
}

function buildTemplateBranch(degreeId, degreeLabel, fieldType, profile = null, roadmap = null, completedMilestoneIds = null) {
  const goalLabel = getTemplateGoalLabel(fieldType);
  const milestoneLabels = getTemplateMilestones(fieldType);
  
  const altNode = node(`${degreeId}-alt`, "Alternative Career Paths", "alternate", "Ongoing", "Explore alternative options", {
    children: [
      node(`${degreeId}-alt-1`, getAlternativeGoal(fieldType), "alternate", "Year 3-5", "Alternative path in this field")
    ]
  });

  const goalNode = node(`${degreeId}-goal`, goalLabel, "goal", "Year 4-5", `Target: ${goalLabel}`, {
    children: [altNode]
  });

  const msNodes = milestoneLabels.map((title, i) => 
    node(`${degreeId}-ms-${i}`, title, "milestone", `Milestone ${i+1}`, `Learn and master ${title.toLowerCase()}`)
  );

  const certNodes = getTemplateCerts(fieldType, degreeId);
  const internNodes = getTemplateInterns(fieldType, degreeId);
  
  const skillsNode = node(`${degreeId}-skills-root`, "Skills to Build", "skill", "Ongoing", "Foundational skills to master", {
    skills: getTemplateSkills(fieldType),
    children: []
  });

  const isLateral = degreeId.includes("lateral");
  const isMbbs = degreeId.includes("mbbs") || degreeId.includes("llb");
  const isThreeYear = degreeId.includes("bsc") || degreeId.includes("bcom") || degreeId.includes("bba") || degreeId.includes("masscomm");
  
  let startYear = 1;
  let endYear = 4;
  if (isLateral) {
    startYear = 2;
    endYear = 4;
  } else if (isMbbs) {
    endYear = 5;
  } else if (isThreeYear) {
    endYear = 3;
  }
  const numYears = endYear - startYear + 1;

  const yearPathStartNode = buildDegreeYearPath(
    degreeId,
    degreeLabel,
    numYears,
    startYear,
    certNodes,
    internNodes,
    msNodes,
    skillsNode,
    goalNode,
    false,
    profile,
    roadmap,
    completedMilestoneIds
  );

  const degreeChildren = [yearPathStartNode];
  if (yearPathStartNode.yr1Skills) {
    degreeChildren.push(yearPathStartNode.yr1Skills);
  }

  return node(
    degreeId,
    degreeLabel,
    "degree",
    `Year ${startYear}-${endYear}`,
    `Degree: ${degreeLabel}`,
    {
      isUserPath: false,
      children: degreeChildren
    }
  );
}

function buildUserDegreeBranch(degreeId, degreeLabel, profile, roadmap, completedMilestoneIds) {
  const financialTier = profile.financialTier || "MEDIUM";
  const goalType = profile.goal?.type || "JOB_ROLE";
  const careerGoal = profile.goal?.description || "Your Career Goal";

  const milestoneChain = buildMilestoneChain(roadmap);
  const certNodes = buildCertNodes(roadmap, financialTier);
  const internNodes = buildInternNodes(roadmap, financialTier);
  const altNodes = buildAlternateNodes(roadmap);

  const altRoot = node(`${degreeId}-alt`, "Alternative Paths", "alternate", "Ongoing", "Alternative paths based on your skills", {
    children: altNodes
  });

  const postCollegeMilestones = milestoneChain.filter(ms => getMilestoneStage(ms.timeframe, ms.fullTitle || ms.label, ms.detail) === "career-progression");
  let lastNodeInChain = altRoot;
  if (postCollegeMilestones.length > 0) {
    for (let i = 0; i < postCollegeMilestones.length - 1; i++) {
      postCollegeMilestones[i].children = [postCollegeMilestones[i + 1]];
      postCollegeMilestones[i].isUserPath = true;
    }
    postCollegeMilestones[postCollegeMilestones.length - 1].children = [altRoot];
    postCollegeMilestones[postCollegeMilestones.length - 1].isUserPath = true;
    lastNodeInChain = postCollegeMilestones[0];
  }

  const careerGoalNode = node(
    `${degreeId}-career-goal`,
    careerGoal.length > 32 ? careerGoal.slice(0, 30) + "…" : careerGoal,
    "goal",
    goalType === "HIGHER_STUDIES" ? "Year 4-5" : goalType === "STARTUP" ? "Year 2-3" : "Year 3-5",
    `Your target: ${careerGoal}`,
    {
      fullTitle: careerGoal,
      children: [lastNodeInChain],
      isUserPath: true
    }
  );

  const isSchoolStage = ["CLASS_7_8", "CLASS_9_10", "CLASS_11_12"].includes(profile.stage);
  let skillBridgeNode = null;
  if (!isSchoolStage) {
    skillBridgeNode = buildSkillsNode(degreeId, roadmap);
  }

  const collegeMilestones = milestoneChain.filter(ms => {
    const stage = getMilestoneStage(ms.timeframe, ms.fullTitle || ms.label, ms.detail);
    return stage.startsWith("college") || stage === "unknown" || stage === "genericCollege";
  });

  const isLateral = degreeId.includes("lateral");
  const isMbbs = degreeId.includes("mbbs") || degreeId.includes("llb");
  const isThreeYear = degreeId.includes("bsc") || degreeId.includes("bcom") || degreeId.includes("bba") || degreeId.includes("masscomm");
  
  let startYear = 1;
  let endYear = 4;
  if (isLateral) {
    startYear = 2;
    endYear = 4;
  } else if (isMbbs) {
    endYear = 5;
  } else if (isThreeYear) {
    endYear = 3;
  }
  const numYears = endYear - startYear + 1;

  const yearPathStartNode = buildDegreeYearPath(
    degreeId,
    degreeLabel,
    numYears,
    startYear,
    certNodes,
    internNodes,
    collegeMilestones,
    skillBridgeNode,
    careerGoalNode,
    true,
    profile,
    roadmap,
    completedMilestoneIds
  );

  const degreeChildren = [yearPathStartNode];
  if (yearPathStartNode.yr1Skills) {
    degreeChildren.push(yearPathStartNode.yr1Skills);
  }

  return node(
    degreeId,
    degreeLabel,
    "degree",
    `Year ${startYear}-${endYear}`,
    `Degree: ${degreeLabel}`,
    {
      isUserPath: true,
      children: degreeChildren
    }
  );
}

function getDegreeBranch(degreeId, degreeLabel, profile, roadmap, completedMilestones) {
  const userField = profile.field?.type || "TECH";
  
  const isTechDegree = degreeId.includes("cse") || degreeId.includes("ece");
  const isScienceDegree = degreeId.includes("bsc") || degreeId.includes("biotech");
  const isCommerceDegree = degreeId.includes("bcom") || degreeId.includes("bba");
  const isLawDegree = degreeId.includes("llb");
  const isMedicineDegree = degreeId.includes("mbbs") || degreeId.includes("nursing");
  const isArtsDegree = degreeId.includes("masscomm");

  let isMatch = false;
  if (userField === "TECH" && isTechDegree) isMatch = true;
  if (userField === "SCIENCE" && isScienceDegree) isMatch = true;
  if (userField === "COMMERCE" && isCommerceDegree) isMatch = true;
  if (userField === "LAW" && isLawDegree) isMatch = true;
  if (userField === "MEDICINE" && isMedicineDegree) isMatch = true;
  if ((userField === "ARTS" || userField === "DESIGN") && isArtsDegree) isMatch = true;
  if (userField === "OTHER") {
    isMatch = isTechDegree; // default fallback
  }

  if (isMatch) {
    return buildUserDegreeBranch(degreeId, degreeLabel, profile, roadmap, completedMilestones);
  } else {
    let templateField = "TECH";
    if (isScienceDegree) templateField = "SCIENCE";
    if (isCommerceDegree) templateField = "COMMERCE";
    if (isLawDegree) templateField = "LAW";
    if (isMedicineDegree) templateField = "MEDICINE";
    if (isArtsDegree) templateField = "ARTS";
    
    return buildTemplateBranch(degreeId, degreeLabel, templateField);
  }
}

function buildEntranceCheckpointNode(streamId, degreeOptions, profile) {
  const financialTier = profile?.financialTier || "MEDIUM";
  
  let examName = "JEE Main / State Engineering Entrance";
  const lowId = streamId.toLowerCase();
  if (lowId.includes("pcb") || lowId.includes("bipc")) {
    examName = "NEET / Biology Entrance";
  } else if (lowId.includes("comm") || lowId.includes("cec") || lowId.includes("hec") || lowId.includes("hum") || lowId.includes("arts")) {
    examName = "CUET / CLAT / Commerce Entrance";
  } else if (lowId.includes("diploma") || lowId.includes("polytechnic")) {
    examName = "ECET / Lateral Entry Exam";
  }
  
  const planADetail = "Plan A: Secure admission in Top-Tier institutions (IITs, NITs, Central Univs). Focus on clearing competitive cutoff targets.";
  const planBDetail = `Plan B: Secure seat in local Tier 2/3 colleges, combined with aggressive upskilling (10-12 hrs/week) on self-study courses. Optimized for ${financialTier} budget tier.`;
  
  const planANode = node(
    `${streamId}-entrance-plana`,
    "Plan A (Top Tier College)",
    "milestone",
    "Entrance",
    planADetail,
    { children: degreeOptions, isUserPath: true }
  );

  const planBNode = node(
    `${streamId}-entrance-planb`,
    "Plan B (Tier 2/3 + Upskill)",
    "milestone",
    "Entrance",
    planBDetail,
    { children: degreeOptions, isUserPath: true }
  );

  return node(
    `${streamId}-entrance-root`,
    `Entrance: ${examName}`,
    "decision",
    "Checkpoint",
    `Decide between Plan A (Top-Tier) and Plan B (Tier 2/3 + Portfolio) depending on cutoffs and your ${financialTier} budget constraints.`,
    {
      children: [planANode, planBNode],
      isUserPath: true
    }
  );
}

function buildCbseInterStreamSeq(streamId, streamLabel, detail, degreeOptions, school11Ms = [], school12Ms = [], skillNode = null, isUser = false, profile = null, roadmap = null) {
  let g11Detail = "Focus on 11th grade studies, while doing some logical problems (ongoing).";
  let g12Detail = "12th grade, focus on board exams, while doing some tougher problems.";
  
  let g11Goals = [
    "Master core concepts in Mechanics, Organic Chemistry, and Calculus",
    "Practice 5-10 logical reasoning or quantitative aptitude puzzles daily",
    "Familiarize yourself with JEE Main and BITSAT entrance formats"
  ];
  
  let g12Goals = [
    "Score 90%+ in PCM core board examinations",
    "Practice advanced physics numericals and complex math problems",
    "Solve full-length JEE Main mock papers under strict time constraints"
  ];

  const lowId = streamId.toLowerCase();
  if (lowId.includes("pcb") || lowId.includes("bipc")) {
    g11Detail = "Focus on 11th grade studies, while learning foundational biology concepts and solving medical-logic problems (ongoing).";
    g12Detail = "12th grade, focus on board exams, while doing tougher problems and preparing for medical entrance tests.";
    
    g11Goals = [
      "Master Human Physiology, Plant Anatomy, and basic Organic Chemistry",
      "Practice diagram labeling and solve biology-logic questions daily",
      "Familiarize yourself with the NEET syllabus and exam patterns"
    ];
    
    g12Goals = [
      "Score 90%+ in PCB core board examinations",
      "Practice speed-solving Biology multiple-choice questions",
      "Solve full-length NEET mock exams and analyze weak areas weekly"
    ];
  } else if (lowId.includes("comm") || lowId.includes("cec")) {
    g11Detail = "Focus on 11th grade commerce & economics studies, while solving business logic puzzles (ongoing).";
    g12Detail = "12th grade, focus on board exams, while doing tougher case studies and problems.";
    
    g11Goals = [
      "Master double-entry bookkeeping, microeconomics, and trade basics",
      "Practice business math puzzles and stay updated on financial news",
      "Explore basic spreadsheet tools (Excel) and business principles"
    ];
    
    g12Goals = [
      "Excel in Accountancy, Economics, and Business Studies board exams",
      "Practice company account ledgers and balance sheet verification",
      "Solve commerce mock papers and practice verbal reasoning"
    ];
  } else if (lowId.includes("hum") || lowId.includes("hec")) {
    g11Detail = "Focus on 11th grade humanities studies, while writing analytical essays and solving logical problems (ongoing).";
    g12Detail = "12th grade, focus on board exams, while writing deeper arguments and solving tougher problems.";
    
    g11Goals = [
      "Master Indian Constitution, historical timelines, and introductory sociology",
      "Write 1 structured analytical essay weekly on social or political issues",
      "Practice verbal logic, comprehension, and critical reasoning quizzes"
    ];
    
    g12Goals = [
      "Secure high marks in History, Political Science, and English board exams",
      "Write high-quality, structured answers for essay-type board questions",
      "Practice advanced reading comprehension and critical writing"
    ];
  }

  const entranceNode = buildEntranceCheckpointNode(streamId, degreeOptions, profile);

  const g12Skills = roadmap ? buildSkillsNode(`${streamId}-12th`, roadmap, profile, school12Ms.map(m => m.id)) : null;
  const g12Children = [entranceNode, ...school12Ms];

  const g12Node = node(
    `${streamId}-12th`,
    "12th Grade: Boards Focus",
    "stream",
    "Grade 12",
    g12Detail,
    { children: g12Children, stageGoals: g12Goals, isUserPath: isUser }
  );

  const g11Skills = roadmap ? buildSkillsNode(`${streamId}-11th`, roadmap, profile, school11Ms.map(m => m.id)) : null;
  const g11Children = [g12Node, ...school11Ms];
  if (g12Skills) {
    g11Children.push(g12Skills);
  }

  const g11Node = node(
    `${streamId}-11th`,
    "11th Grade: Core Academics",
    "stream",
    "Grade 11",
    g11Detail,
    { children: g11Children, stageGoals: g11Goals, isUserPath: isUser }
  );

  const streamChildren = [g11Node];
  if (g11Skills) {
    streamChildren.push(g11Skills);
  }

  return node(
    streamId,
    streamLabel,
    "stream",
    "Grade 11-12",
    detail,
    { children: streamChildren, isUserPath: isUser }
  );
}

function buildDiplomaYearSeq(streamId, streamLabel, detail, degreeOptions, dip1Ms = [], dip2Ms = [], dip3Ms = [], skillNode = null, isUser = false, profile = null, roadmap = null) {
  let y1Detail = "Focus on basic engineering sciences, math, and introductory engineering graphics.";
  let y2Detail = "Focus on core electrical, mechanical, or civil engineering principles and lab exercises.";
  let y3Detail = "Focus on advanced specialization coursework, workshop practice, and final project work.";

  let y1Goals = [
    "Excel in basic mathematics, physics, and chemistry applied to engineering",
    "Learn foundational engineering drawing and CAD drafting basics",
    "Build clean habits in mechanical or electrical workshop labs"
  ];
  let y2Goals = [
    "Master core stream subjects (e.g. basic circuit design or mechanical kinematics)",
    "Build 2-3 practical lab mini-projects to test concepts",
    "Maintain a high CGPA (above 8.5) to qualify for lateral entry degrees"
  ];
  let y3Goals = [
    "Complete a high-quality final semester major diploma project",
    "Practice previous years' ECET / lateral entry competitive exams",
    "Prepare your resume and academic transcripts for lateral B.Tech entry"
  ];

  if (streamId.includes("cse")) {
    y1Detail = "Focus on basic engineering sciences, physics, math, and introductory computing concepts.";
    y2Detail = "Focus on core programming languages, data structures, and digital logic design.";
    y3Detail = "Focus on software engineering, database management, and final semester diploma project.";
    
    y2Goals = [
      "Master core stream subjects (e.g. data structures and algorithms in C/C++)",
      "Build 2-3 practical lab mini-projects (e.g. simple web app or database schema)",
      "Maintain a high CGPA (above 8.5) to qualify for lateral entry degrees"
    ];
  } else if (streamId.includes("ece")) {
    y1Detail = "Focus on engineering sciences, circuit theory, and basic mathematics.";
    y2Detail = "Focus on analog electronics, digital circuits, and electronic measurements.";
    y3Detail = "Focus on microprocessors, communication systems, and microcontrollers lab.";
    
    y2Goals = [
      "Master core stream subjects (e.g. circuit theory and digital electronics)",
      "Build 2-3 practical lab mini-projects (e.g. circuit breadboard testing)",
      "Maintain a high CGPA (above 8.5) to qualify for lateral entry degrees"
    ];
  } else if (streamId.includes("mech")) {
    y1Detail = "Focus on engineering drawing, basic workshop technology, and thermodynamics.";
    y2Detail = "Focus on strength of materials, manufacturing processes, and fluid mechanics.";
    y3Detail = "Focus on CAD/CAM design, thermal engineering, and machine design project.";
    
    y2Goals = [
      "Master core stream subjects (e.g. strength of materials and thermodynamics)",
      "Build 2-3 practical lab mini-projects (e.g. lathe machine workpiece design)",
      "Maintain a high CGPA (above 8.5) to qualify for lateral entry degrees"
    ];
  } else if (streamId.includes("civil")) {
    y1Detail = "Focus on basic surveying, engineering geology, and mathematics.";
    y2Detail = "Focus on construction materials, hydraulics, and structural mechanics.";
    y3Detail = "Focus on concrete technology, environmental engineering, and estimation & costing.";
    
    y2Goals = [
      "Master core stream subjects (e.g. fluid mechanics and structural drawing)",
      "Build 2-3 practical lab mini-projects (e.g. structural layout drawing)",
      "Maintain a high CGPA (above 8.5) to qualify for lateral entry degrees"
    ];
  }

  const entranceNode = buildEntranceCheckpointNode(streamId, degreeOptions, profile);

  const y3Skills = buildDiplomaYearSkillsNode(streamId, 3, profile, roadmap, dip3Ms.map(m => m.id));
  const y3Children = [entranceNode, ...dip3Ms];

  const y3 = node(
    `${streamId}-y3`,
    "Diploma 3rd Year: Projects & Labs",
    "stream",
    "Year 3",
    y3Detail,
    { children: y3Children, stageGoals: y3Goals, isUserPath: isUser }
  );

  const y2Skills = buildDiplomaYearSkillsNode(streamId, 2, profile, roadmap, dip2Ms.map(m => m.id));
  const y2Children = [y3, ...dip2Ms];
  if (y3Skills) {
    y2Children.push(y3Skills);
  }
  const y2 = node(
    `${streamId}-y2`,
    "Diploma 2nd Year: Core Technicals",
    "stream",
    "Year 2",
    y2Detail,
    { children: y2Children, stageGoals: y2Goals, isUserPath: isUser }
  );

  const y1Skills = buildDiplomaYearSkillsNode(streamId, 1, profile, roadmap, dip1Ms.map(m => m.id));
  const y1Children = [y2, ...dip1Ms];
  if (y2Skills) {
    y1Children.push(y2Skills);
  }
  const y1 = node(
    `${streamId}-y1`,
    "Diploma 1st Year: Fundamentals",
    "stream",
    "Year 1",
    y1Detail,
    { children: y1Children, stageGoals: y1Goals, isUserPath: isUser }
  );

  const streamChildren = [y1];
  if (y1Skills) {
    streamChildren.push(y1Skills);
  }

  return node(
    streamId,
    streamLabel,
    "stream",
    "Years 1-3",
    detail,
    { children: streamChildren, isUserPath: isUser }
  );
}

function getPgDegreeOptions(fieldType) {
  const map = {
    TECH: [
      { id: "degree-pg-mtech", label: "M.Tech Computer Science" },
      { id: "degree-pg-mca", label: "Master of Computer Applications (MCA)" }
    ],
    SCIENCE: [
      { id: "degree-pg-msc", label: "M.Sc Biotechnology / Applied Sciences" }
    ],
    COMMERCE: [
      { id: "degree-pg-mba", label: "MBA (Finance / Marketing)" },
      { id: "degree-pg-mcom", label: "M.Com Honours" }
    ],
    LAW: [
      { id: "degree-pg-llm", label: "LLM (Master of Laws)" }
    ],
    MEDICINE: [
      { id: "degree-pg-md", label: "MD / MS Specialization" }
    ],
    ARTS: [
      { id: "degree-pg-ma", label: "MA Mass Communication / Creative Arts" }
    ]
  };
  return map[fieldType] || [{ id: "degree-pg-master", label: "Master's Degree Program" }];
}

function buildPgSpecificMilestones(degreeId, fieldType) {
  const pgMilestones = {
    TECH: [
      { id: `${degreeId}-pg-ms-1`, title: "Advanced Coursework & Research Methodology", timeframe: "PG Year 1", detail: "Master advanced algorithms, distributed systems, or AI/ML. Learn research methodology and complete literature reviews." },
      { id: `${degreeId}-pg-ms-2`, title: "Thesis Research & Publication", timeframe: "PG Year 1", detail: "Begin thesis research under faculty guidance. Aim to publish at least one conference/journal paper." },
      { id: `${degreeId}-pg-ms-3`, title: "Thesis Defense & Industry Placement", timeframe: "PG Year 2", detail: "Complete and defend your master's thesis. Secure a role via campus placements or research positions." },
      { id: `${degreeId}-pg-ms-4`, title: "Teaching Assistantship / Lab Work", timeframe: "PG Year 2", detail: "Gain teaching experience as a TA or contribute to ongoing lab projects for deeper practical exposure." },
    ],
    SCIENCE: [
      { id: `${degreeId}-pg-ms-1`, title: "Advanced Lab Techniques & Coursework", timeframe: "PG Year 1", detail: "Master advanced laboratory protocols, computational tools, and theoretical foundations in your specialization." },
      { id: `${degreeId}-pg-ms-2`, title: "Research Project Initiation", timeframe: "PG Year 1", detail: "Identify research gaps, design experiments, and begin collecting data for your dissertation." },
      { id: `${degreeId}-pg-ms-3`, title: "Dissertation & Academic Publication", timeframe: "PG Year 2", detail: "Complete your dissertation research, write and submit papers to peer-reviewed journals." },
    ],
    COMMERCE: [
      { id: `${degreeId}-pg-ms-1`, title: "Core MBA Modules & Case Studies", timeframe: "PG Year 1", detail: "Master core management subjects: Strategy, Finance, Marketing, Operations. Engage in live case competitions." },
      { id: `${degreeId}-pg-ms-2`, title: "Summer Internship & Specialization", timeframe: "PG Year 1", detail: "Complete a high-impact summer internship. Choose your specialization track (Finance, Marketing, HR, etc.)." },
      { id: `${degreeId}-pg-ms-3`, title: "Final Placements & Capstone Project", timeframe: "PG Year 2", detail: "Prepare for and crack final placements. Complete a capstone consulting project with an industry partner." },
    ],
    LAW: [
      { id: `${degreeId}-pg-ms-1`, title: "Advanced Legal Specialization", timeframe: "PG Year 1", detail: "Deep dive into your chosen specialization: IP Law, Corporate Law, Human Rights, or Constitutional Law." },
      { id: `${degreeId}-pg-ms-2`, title: "Legal Research & Publication", timeframe: "PG Year 1", detail: "Publish research papers in legal journals and participate in national moot court competitions." },
      { id: `${degreeId}-pg-ms-3`, title: "Dissertation Defense & Bar Prep", timeframe: "PG Year 2", detail: "Complete your LLM dissertation and prepare for specialized bar examinations or judicial service exams." },
    ],
    MEDICINE: [
      { id: `${degreeId}-pg-ms-1`, title: "Clinical Rotations & Specialization", timeframe: "PG Year 1", detail: "Complete rotations in your chosen specialization. Master advanced diagnostic and surgical techniques." },
      { id: `${degreeId}-pg-ms-2`, title: "Research & Case Presentations", timeframe: "PG Year 1", detail: "Present clinical cases at grand rounds. Begin a research project in your specialty area." },
      { id: `${degreeId}-pg-ms-3`, title: "Board Certification & Fellowship", timeframe: "PG Year 2", detail: "Prepare for specialty board examinations. Apply for fellowship programs or senior residency positions." },
    ],
    ARTS: [
      { id: `${degreeId}-pg-ms-1`, title: "Advanced Creative Practice & Theory", timeframe: "PG Year 1", detail: "Master advanced creative methodologies, critical theory, and industry-standard production techniques." },
      { id: `${degreeId}-pg-ms-2`, title: "Portfolio Exhibition & Industry Network", timeframe: "PG Year 1", detail: "Build a professional portfolio. Exhibit work and establish connections with industry professionals." },
      { id: `${degreeId}-pg-ms-3`, title: "Thesis Project & Career Launch", timeframe: "PG Year 2", detail: "Complete your master's thesis project. Secure a position in your creative field or launch independent practice." },
    ]
  };

  const milestones = pgMilestones[fieldType] || pgMilestones.TECH;
  return milestones.map(ms =>
    node(
      ms.id,
      ms.title.length > 36 ? ms.title.slice(0, 34) + "…" : ms.title,
      "milestone",
      ms.timeframe,
      ms.detail,
      {
        fullTitle: ms.title,
        prerequisites: [],
        sequenceIndex: 0,
        isUserPath: true
      }
    )
  );
}

function buildUserPgBranch(degreeId, degreeLabel, profile, roadmap, completedMilestoneIds) {
  const financialTier = profile.financialTier || "MEDIUM";
  const careerGoal = profile.goal?.description || "Your Career Goal";

  // Determine field type for PG-specific milestones
  let fieldType = profile.field?.type || "TECH";
  const lowId = degreeId.toLowerCase();
  if (lowId.includes("msc") || lowId.includes("biotech")) fieldType = "SCIENCE";
  else if (lowId.includes("mba") || lowId.includes("mcom")) fieldType = "COMMERCE";
  else if (lowId.includes("llm")) fieldType = "LAW";
  else if (lowId.includes("md")) fieldType = "MEDICINE";
  else if (lowId.includes("ma") || lowId.includes("masscomm")) fieldType = "ARTS";

  // Use PG-specific milestones instead of reusing UG milestone chain
  const pgMilestones = buildPgSpecificMilestones(degreeId, fieldType);

  const certNodes = buildCertNodes(roadmap, financialTier);
  const internNodes = buildInternNodes(roadmap, financialTier);
  const altNodes = buildAlternateNodes(roadmap);

  const altRoot = node(`${degreeId}-alt`, "Alternative Paths", "alternate", "Ongoing", "Alternative paths based on your skills", {
    children: altNodes
  });

  // Career progression milestones (post-PG) — these are unique and safe to reuse
  const milestoneChain = buildMilestoneChain(roadmap);
  const postCollegeMilestones = milestoneChain.filter(ms => getMilestoneStage(ms.timeframe, ms.fullTitle || ms.label, ms.detail) === "career-progression");
  let lastNodeInChain = altRoot;
  if (postCollegeMilestones.length > 0) {
    for (let i = 0; i < postCollegeMilestones.length - 1; i++) {
      postCollegeMilestones[i].children = [postCollegeMilestones[i + 1]];
      postCollegeMilestones[i].isUserPath = true;
    }
    postCollegeMilestones[postCollegeMilestones.length - 1].children = [altRoot];
    postCollegeMilestones[postCollegeMilestones.length - 1].isUserPath = true;
    lastNodeInChain = postCollegeMilestones[0];
  }

  const careerGoalNode = node(
    `${degreeId}-career-goal`,
    careerGoal.length > 32 ? careerGoal.slice(0, 30) + "…" : careerGoal,
    "goal",
    "Year 2-3",
    `Your target: ${careerGoal}`,
    {
      fullTitle: careerGoal,
      children: [lastNodeInChain],
      isUserPath: true
    }
  );

  let skillBridgeNode = null;
  const skillGap = roadmap.skillGap;
  if (skillGap) {
    skillBridgeNode = node(
      `${degreeId}-skill-gap-root`,
      "Skills to Build",
      "skill",
      "Ongoing",
      `You currently have: ${skillGap.have?.join(", ") || "foundational skills"}.\nBridging steps:\n${(skillGap.bridgingSteps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      {
        skills: skillGap.need?.map(n => n.skill) || [],
        children: [],
      }
    );
  }

  const yearPathStartNode = buildDegreeYearPath(
    degreeId,
    degreeLabel,
    2, // numYears
    1, // startYear
    certNodes,
    internNodes,
    pgMilestones, // PG-specific milestones instead of UG milestones
    skillBridgeNode,
    careerGoalNode,
    true
  );

  const degreeChildren = [yearPathStartNode];
  if (yearPathStartNode.yr1Skills) {
    degreeChildren.push(yearPathStartNode.yr1Skills);
  }

  return node(
    degreeId,
    degreeLabel,
    "degree",
    "Year 1-2",
    `Degree: ${degreeLabel}`,
    {
      isUserPath: true,
      children: degreeChildren
    }
  );
}

function buildTemplatePgBranch(degreeId, degreeLabel, fieldType) {
  const goalLabel = getTemplateGoalLabel(fieldType);
  const milestoneLabels = getTemplateMilestones(fieldType);

  const altNode = node(`${degreeId}-alt`, "Alternative Career Paths", "alternate", "Ongoing", "Explore alternative options", {
    children: [
      node(`${degreeId}-alt-1`, getAlternativeGoal(fieldType), "alternate", "Year 2-3", "Alternative path in this field")
    ]
  });

  const goalNode = node(`${degreeId}-goal`, goalLabel, "goal", "Year 2", `Target: ${goalLabel}`, {
    children: [altNode]
  });

  const msNodes = milestoneLabels.map((title, i) =>
    node(`${degreeId}-ms-${i}`, title, "milestone", `Milestone ${i+1}`, `Learn and master ${title.toLowerCase()}`)
  );

  const certNodes = getTemplateCerts(fieldType, degreeId);
  const internNodes = getTemplateInterns(fieldType, degreeId);

  const skillsNode = node(`${degreeId}-skills-root`, "Skills to Build", "skill", "Ongoing", "Foundational skills to master", {
    skills: getTemplateSkills(fieldType),
    children: []
  });

  const yearPathStartNode = buildDegreeYearPath(
    degreeId,
    degreeLabel,
    2, // numYears
    1, // startYear
    certNodes,
    internNodes,
    msNodes,
    skillsNode,
    goalNode,
    false
  );

  const degreeChildren = [yearPathStartNode];
  if (yearPathStartNode.yr1Skills) {
    degreeChildren.push(yearPathStartNode.yr1Skills);
  }

  return node(
    degreeId,
    degreeLabel,
    "degree",
    "Year 1-2",
    `Degree: ${degreeLabel}`,
    {
      isUserPath: false,
      children: degreeChildren
    }
  );
}

function getPgDegreeBranch(degreeId, degreeLabel, profile, roadmap, completedMilestones) {
  const userField = profile.field?.type || "TECH";
  const isMatch = (degreeId.includes("mtech") || degreeId.includes("mca")) && (userField === "TECH" || userField === "OTHER") ||
                  (degreeId.includes("msc") && userField === "SCIENCE") ||
                  ((degreeId.includes("mba") || degreeId.includes("mcom")) && userField === "COMMERCE") ||
                  (degreeId.includes("llm") && userField === "LAW") ||
                  (degreeId.includes("md") && userField === "MEDICINE") ||
                  (degreeId.includes("ma") && (userField === "ARTS" || userField === "DESIGN"));

  if (isMatch) {
    return buildUserPgBranch(degreeId, degreeLabel, profile, roadmap, completedMilestones);
  } else {
    let templateField = "TECH";
    if (degreeId.includes("msc")) templateField = "SCIENCE";
    if (degreeId.includes("mba") || degreeId.includes("mcom")) templateField = "COMMERCE";
    if (degreeId.includes("llm")) templateField = "LAW";
    if (degreeId.includes("md")) templateField = "MEDICINE";
    if (degreeId.includes("ma")) templateField = "ARTS";

    return buildTemplatePgBranch(degreeId, degreeLabel, templateField);
  }
}

function buildWorkingBranch(profile, roadmap, completedMilestoneIds) {
  const financialTier = profile.financialTier || "MEDIUM";
  const goalType = profile.goal?.type || "JOB_ROLE";
  const careerGoal = profile.goal?.description || "Your Career Goal";

  const milestoneChain = buildMilestoneChain(roadmap);
  const certNodes = buildCertNodes(roadmap, financialTier);
  const internNodes = buildInternNodes(roadmap, financialTier);
  const altNodes = buildAlternateNodes(roadmap);

  const altRoot = node("working-alt", "Alternative Paths", "alternate", "Ongoing", "Alternative paths based on your skills", {
    children: altNodes
  });

  const postCollegeMilestones = milestoneChain.filter(ms => getMilestoneStage(ms.timeframe, ms.fullTitle || ms.label, ms.detail) === "career-progression");
  let lastNodeInChain = altRoot;
  if (postCollegeMilestones.length > 0) {
    for (let i = 0; i < postCollegeMilestones.length - 1; i++) {
      postCollegeMilestones[i].children = [postCollegeMilestones[i + 1]];
      postCollegeMilestones[i].isUserPath = true;
    }
    postCollegeMilestones[postCollegeMilestones.length - 1].children = [altRoot];
    postCollegeMilestones[postCollegeMilestones.length - 1].isUserPath = true;
    lastNodeInChain = postCollegeMilestones[0];
  }

  const careerGoalNode = node(
    "working-career-goal",
    careerGoal.length > 32 ? careerGoal.slice(0, 30) + "…" : careerGoal,
    "goal",
    "Year 1-2",
    `Your target: ${careerGoal}`,
    {
      fullTitle: careerGoal,
      children: [lastNodeInChain],
      isUserPath: true
    }
  );

  const workingMilestones = milestoneChain.filter(ms => {
    const stage = getMilestoneStage(ms.timeframe, ms.fullTitle || ms.label, ms.detail);
    return stage !== "career-progression";
  });

  let skillBridgeNode = null;
  const skillGap = roadmap.skillGap;
  if (skillGap) {
    skillBridgeNode = node(
      "working-skill-gap-root",
      "Skills to Build",
      "skill",
      "Ongoing",
      `You currently have: ${skillGap.have?.join(", ") || "foundational skills"}.\nBridging steps:\n${(skillGap.bridgingSteps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      {
        skills: skillGap.need?.map(n => n.skill) || [],
        children: [],
      }
    );
  }

  const yearPathStartNode = buildDegreeYearPath(
    "working-path",
    "Professional Progression",
    2, // numYears
    1, // startYear
    certNodes,
    internNodes,
    workingMilestones,
    skillBridgeNode,
    careerGoalNode,
    true
  );

  const workingChildren = [yearPathStartNode];
  if (yearPathStartNode.yr1Skills) {
    workingChildren.push(yearPathStartNode.yr1Skills);
  }

  return node(
    "working-root-path",
    "Career Pathway",
    "path",
    "Professional Progression",
    "Transitioning from current experience to target role",
    {
      isUserPath: true,
      children: workingChildren
    }
  );
}

function markUserPathAncestors(n) {
  if (n.children && n.children.length > 0) {
    let hasUserPathChild = false;
    for (const child of n.children) {
      markUserPathAncestors(child);
      if (child.isUserPath) {
        hasUserPathChild = true;
      }
    }
    if (hasUserPathChild) {
      n.isUserPath = true;
    }
  }
}

function markCompleted(n, completedMilestoneIds) {
  return {
    ...n,
    status: completedMilestoneIds.has(n.id) ? "done" : n.id === "mindmap-root" ? "in_progress" : "not_started",
    children: n.children.map(c => markCompleted(c, completedMilestoneIds)),
  };
}

function isDegreeRelatedToGoal(degreeId, goalDesc, fieldType) {
  const desc = (goalDesc || "").toLowerCase().trim();
  if (!desc) return true;
  
  if (fieldType === "TECH" || fieldType === "OTHER") {
    const isSoftware = desc.includes("soft") || desc.includes("dev") || desc.includes("prog") || desc.includes("web") || desc.includes("front") || desc.includes("back") || desc.includes("full") || desc.includes("code") || desc.includes("app");
    const isData = desc.includes("data") || desc.includes("anal") || desc.includes("ml") || desc.includes("ai") || desc.includes("scie") || desc.includes("intel") || desc.includes("learn");
    const isHardware = desc.includes("hard") || desc.includes("embed") || desc.includes("circ") || desc.includes("netw") || desc.includes("tele") || desc.includes("elect") || desc.includes("syst") || desc.includes("robot");
    
    if (isSoftware) {
      return degreeId.includes("cse");
    }
    if (isData) {
      return degreeId.includes("cse") || degreeId.includes("bsc");
    }
    if (isHardware) {
      return degreeId.includes("ece");
    }
    return degreeId.includes("cse") || degreeId.includes("ece");
  }

  if (fieldType === "MEDICINE") {
    const isNursing = desc.includes("nurs") || desc.includes("phar") || desc.includes("dent") || desc.includes("ther");
    if (isNursing) {
      return degreeId.includes("nursing") || degreeId.includes("biotech");
    }
    return degreeId.includes("mbbs");
  }

  if (fieldType === "COMMERCE") {
    const isFinance = desc.includes("fina") || desc.includes("bank") || desc.includes("inv") || desc.includes("acc") || desc.includes("aud");
    if (isFinance) {
      return degreeId.includes("bcom");
    }
    return degreeId.includes("bba") || degreeId.includes("bcom");
  }

  if (fieldType === "LAW") {
    return degreeId.includes("llb");
  }
  if (fieldType === "ARTS" || fieldType === "DESIGN") {
    return degreeId.includes("masscomm");
  }

  return true;
}

export function buildMindmapTree(profile, roadmap, completedMilestoneIds = new Set()) {
  const careerGoal = profile.goal?.description || "Your Career Goal";
  const userField = profile.field?.type || "TECH";
  const userStage = profile.stage || "CLASS_11_12";

  // If the stage is WORKING, we build a direct professional progression path
  if (userStage === "WORKING") {
    const workingRoot = buildWorkingBranch(profile, roadmap, completedMilestoneIds);
    const root = node(
      "mindmap-root",
      `${profile.name || "You"} — Now`,
      "root",
      "Today",
      `Starting your journey toward: ${careerGoal}`,
      {
        isUserPath: true,
        children: [workingRoot]
      }
    );
    const annotatedRoot = annotateSkills([root], roadmap.skillGap)[0];
    markUserPathAncestors(annotatedRoot);
    return markCompleted(annotatedRoot, completedMilestoneIds);
  }

  // If the stage is UNDERGRADUATE, we show college degrees directly
  if (userStage === "UNDERGRADUATE") {
    let undergradDegrees = [];
    if (userField === "TECH" || userField === "OTHER") {
      undergradDegrees = [
        { id: "degree-ug-cse", label: "B.Tech Computer Science" },
        { id: "degree-ug-ece", label: "B.Tech Electronics & Comm" },
        { id: "degree-ug-bsc", label: "B.Sc Physics / Mathematics" }
      ];
    } else if (userField === "SCIENCE") {
      undergradDegrees = [
        { id: "degree-ug-mbbs", label: "MBBS (Medicine)" },
        { id: "degree-ug-biotech", label: "B.Sc Biotechnology" }
      ];
    } else if (userField === "COMMERCE") {
      undergradDegrees = [
        { id: "degree-ug-bcom", label: "B.Com Honours" },
        { id: "degree-ug-bba", label: "BBA (Finance/Marketing)" }
      ];
    } else if (userField === "LAW") {
      undergradDegrees = [
        { id: "degree-ug-llb", label: "BA LLB (Integrated Law)" }
      ];
    } else if (userField === "MEDICINE") {
      undergradDegrees = [
        { id: "degree-ug-mbbs", label: "MBBS (Medicine)" },
        { id: "degree-ug-nursing", label: "B.Sc Nursing / Pharma" }
      ];
    } else if (userField === "ARTS" || userField === "DESIGN") {
      undergradDegrees = [
        { id: "degree-ug-masscomm", label: "BA Mass Communication" }
      ];
    }

    const degreeNodes = undergradDegrees
      .filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
      .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

    // Fallback if empty
    if (degreeNodes.length === 0) {
      degreeNodes.push(getDegreeBranch("degree-ug-fallback", "Bachelor's Degree Program", profile, roadmap, completedMilestoneIds));
    }

    const root = node(
      "mindmap-root",
      `${profile.name || "You"} — Now`,
      "root",
      "Today",
      `Starting your journey toward: ${careerGoal}`,
      {
        isUserPath: true,
        children: degreeNodes
      }
    );
    const annotatedRoot = annotateSkills([root], roadmap.skillGap)[0];
    markUserPathAncestors(annotatedRoot);
    return markCompleted(annotatedRoot, completedMilestoneIds);
  }

  // If the stage is POSTGRADUATE, we show master's options directly
  if (userStage === "POSTGRADUATE") {
    const pgDegrees = getPgDegreeOptions(userField);
    const pgNodes = pgDegrees.map(d => getPgDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

    const root = node(
      "mindmap-root",
      `${profile.name || "You"} — Now`,
      "root",
      "Today",
      `Starting your journey toward: ${careerGoal}`,
      {
        isUserPath: true,
        children: pgNodes
      }
    );
    const annotatedRoot = annotateSkills([root], roadmap.skillGap)[0];
    markUserPathAncestors(annotatedRoot);
    return markCompleted(annotatedRoot, completedMilestoneIds);
  }

  // Otherwise (CLASS_7_8, CLASS_9_10, CLASS_11_12), build the full school-to-college pipeline
  const milestoneChain = buildMilestoneChain(roadmap);
  const categorized = categorizeMilestones(milestoneChain);

  // Determine if user is in CLASS_11_12 and we need to attach the skillsNode to Grade 11
  const isSchool11_12 = userStage === "CLASS_11_12";
  const school11_12SkillsNode = isSchool11_12 ? buildSkillsNode("school-11", roadmap, profile, categorized.school11.map(m => m.id)) : null;

  const cbseChildren = [];
  const interChildren = [];
  const diplomaChildren = [];

  // 1. CBSE Streams with inserted Grade 11 & Grade 12 sequencing
  const cbsePath = node("path-cbse", "CBSE / ICSE", "path", "Grade 10+", "Central Board school path — leads to stream-based degree programmes.");
  
  const cbsePCM_degrees = [
    { id: "degree-cbse-pcm-cse", label: "B.Tech Computer Science" },
    { id: "degree-cbse-pcm-ece", label: "B.Tech Electronics & Comm" },
    { id: "degree-cbse-pcm-bsc", label: "B.Sc Physics / Mathematics" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  const cbsePCB_degrees = [
    { id: "degree-cbse-pcb-mbbs", label: "MBBS (Medicine)" },
    { id: "degree-cbse-pcb-nursing", label: "B.Sc Nursing / Pharma" },
    { id: "degree-cbse-pcb-biotech", label: "B.Sc Biotechnology" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  const cbseComm_degrees = [
    { id: "degree-cbse-comm-bcom", label: "B.Com Honours" },
    { id: "degree-cbse-comm-bba", label: "BBA (Finance/Marketing)" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  const cbseHum_degrees = [
    { id: "degree-cbse-hum-llb", label: "BA LLB (Integrated Law)" },
    { id: "degree-cbse-hum-masscomm", label: "BA Mass Communication" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  if (cbsePCM_degrees.length > 0) {
    const isPCMUser = cbsePCM_degrees.some(d => d.isUserPath);
    cbseChildren.push(
      buildCbseInterStreamSeq(
        "stream-cbse-pcm",
        "Science (PCM)",
        "Physics, Chemistry, Math track.",
        cbsePCM_degrees,
        isPCMUser ? categorized.school11 : [],
        isPCMUser ? categorized.school12 : [],
        isPCMUser ? school11_12SkillsNode : null,
        isPCMUser,
        profile,
        roadmap
      )
    );
  }
  if (cbsePCB_degrees.length > 0) {
    const isPCBUser = cbsePCB_degrees.some(d => d.isUserPath);
    cbseChildren.push(
      buildCbseInterStreamSeq(
        "stream-cbse-pcb",
        "Science (PCB)",
        "Physics, Chemistry, Biology track.",
        cbsePCB_degrees,
        isPCBUser ? categorized.school11 : [],
        isPCBUser ? categorized.school12 : [],
        isPCBUser ? school11_12SkillsNode : null,
        isPCBUser,
        profile,
        roadmap
      )
    );
  }
  if (cbseComm_degrees.length > 0) {
    const isCommUser = cbseComm_degrees.some(d => d.isUserPath);
    cbseChildren.push(
      buildCbseInterStreamSeq(
        "stream-cbse-comm",
        "Commerce",
        "Accounting, Business Studies track.",
        cbseComm_degrees,
        isCommUser ? categorized.school11 : [],
        isCommUser ? categorized.school12 : [],
        isCommUser ? school11_12SkillsNode : null,
        isCommUser,
        profile,
        roadmap
      )
    );
  }
  if (cbseHum_degrees.length > 0) {
    const isHumUser = cbseHum_degrees.some(d => d.isUserPath);
    cbseChildren.push(
      buildCbseInterStreamSeq(
        "stream-cbse-hum",
        "Humanities",
        "History, Political Science, Arts track.",
        cbseHum_degrees,
        isHumUser ? categorized.school11 : [],
        isHumUser ? categorized.school12 : [],
        isHumUser ? school11_12SkillsNode : null,
        isHumUser,
        profile,
        roadmap
      )
    );
  }

  // 2. Intermediate Streams with inserted Grade 11 & Grade 12 sequencing
  const interPath = node("path-intermediate", "State Board (Intermediate)", "path", "Grade 10+", "State Intermediate Board path — equivalent to CBSE, leads to same degrees.");
  
  const interMPC_degrees = [
    { id: "degree-inter-mpc-cse", label: "B.Tech Computer Science" },
    { id: "degree-inter-mpc-ece", label: "B.Tech Electronics & Comm" },
    { id: "degree-inter-mpc-bsc", label: "B.Sc Physics / Mathematics" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  const interBiPC_degrees = [
    { id: "degree-inter-bipc-mbbs", label: "MBBS (Medicine)" },
    { id: "degree-inter-bipc-nursing", label: "B.Sc Nursing / Pharma" },
    { id: "degree-inter-bipc-biotech", label: "B.Sc Biotechnology" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  const interCEC_degrees = [
    { id: "degree-inter-cec-bcom", label: "B.Com Honours" },
    { id: "degree-inter-cec-bba", label: "BBA (Finance/Marketing)" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  const interHEC_degrees = [
    { id: "degree-inter-hec-llb", label: "BA LLB (Integrated Law)" },
    { id: "degree-inter-hec-masscomm", label: "BA Mass Communication" }
  ].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField))
   .map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  if (interMPC_degrees.length > 0) {
    const isMPCUser = interMPC_degrees.some(d => d.isUserPath);
    interChildren.push(
      buildCbseInterStreamSeq(
        "stream-inter-mpc",
        "MPC",
        "Maths, Physics, Chemistry stream.",
        interMPC_degrees,
        isMPCUser ? categorized.school11 : [],
        isMPCUser ? categorized.school12 : [],
        isMPCUser ? school11_12SkillsNode : null,
        isMPCUser,
        profile,
        roadmap
      )
    );
  }
  if (interBiPC_degrees.length > 0) {
    const isBiPCUser = interBiPC_degrees.some(d => d.isUserPath);
    interChildren.push(
      buildCbseInterStreamSeq(
        "stream-inter-bipc",
        "BiPC",
        "Biology, Physics, Chemistry stream.",
        interBiPC_degrees,
        isBiPCUser ? categorized.school11 : [],
        isBiPCUser ? categorized.school12 : [],
        isBiPCUser ? school11_12SkillsNode : null,
        isBiPCUser,
        profile,
        roadmap
      )
    );
  }
  if (interCEC_degrees.length > 0) {
    const isCECUser = interCEC_degrees.some(d => d.isUserPath);
    interChildren.push(
      buildCbseInterStreamSeq(
        "stream-inter-cec",
        "MEC / CEC",
        "Maths/Civics, Economics, Commerce stream.",
        interCEC_degrees,
        isCECUser ? categorized.school11 : [],
        isCECUser ? categorized.school12 : [],
        isCECUser ? school11_12SkillsNode : null,
        isCECUser,
        profile,
        roadmap
      )
    );
  }
  if (interHEC_degrees.length > 0) {
    const isHECUser = interHEC_degrees.some(d => d.isUserPath);
    interChildren.push(
      buildCbseInterStreamSeq(
        "stream-inter-hec",
        "HEC / Humanities",
        "History, Economics, Civics stream.",
        interHEC_degrees,
        isHECUser ? categorized.school11 : [],
        isHECUser ? categorized.school12 : [],
        isHECUser ? school11_12SkillsNode : null,
        isHECUser,
        profile,
        roadmap
      )
    );
  }

  // 3. Diploma Streams with inserted Year 1, 2, 3 sequencing
  const diplomaPath = node("path-diploma", "Polytechnic Diploma", "path", "Grade 10+", "3-year practical polytechnic stream — direct entry to engineering later.");
  
  const dipCSE_degrees = [{ id: "degree-diploma-cse-lateral", label: "Lateral B.Tech CSE" }].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField)).map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));
  const dipECE_degrees = [{ id: "degree-diploma-ece-lateral", label: "Lateral B.Tech ECE" }].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField)).map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));
  const dipMech_degrees = [{ id: "degree-diploma-mech-lateral", label: "Lateral B.Tech Mechanical" }].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField)).map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));
  const dipCivil_degrees = [{ id: "degree-diploma-civil-lateral", label: "Lateral B.Tech Civil" }].filter(d => isDegreeRelatedToGoal(d.id, careerGoal, userField)).map(d => getDegreeBranch(d.id, d.label, profile, roadmap, completedMilestoneIds));

  if (dipCSE_degrees.length > 0) {
    const isDipCSEUser = dipCSE_degrees.some(d => d.isUserPath);
    diplomaChildren.push(
      buildDiplomaYearSeq(
        "stream-diploma-cse",
        "Computer Engineering",
        "Practical programming and software labs.",
        dipCSE_degrees,
        isDipCSEUser ? categorized.dip1 : [],
        isDipCSEUser ? categorized.dip2 : [],
        isDipCSEUser ? categorized.dip3 : [],
        isDipCSEUser ? school11_12SkillsNode : null,
        isDipCSEUser,
        profile,
        roadmap
      )
    );
  }
  if (dipECE_degrees.length > 0) {
    const isDipECEUser = dipECE_degrees.some(d => d.isUserPath);
    diplomaChildren.push(
      buildDiplomaYearSeq(
        "stream-diploma-ece",
        "Electronics & Comm",
        "Hardware circuits and digital labs.",
        dipECE_degrees,
        isDipECEUser ? categorized.dip1 : [],
        isDipECEUser ? categorized.dip2 : [],
        isDipECEUser ? categorized.dip3 : [],
        isDipECEUser ? school11_12SkillsNode : null,
        isDipECEUser,
        profile,
        roadmap
      )
    );
  }
  if (dipMech_degrees.length > 0) {
    const isDipMechUser = dipMech_degrees.some(d => d.isUserPath);
    diplomaChildren.push(
      buildDiplomaYearSeq(
        "stream-diploma-mech",
        "Mechanical Eng",
        "Machinery, CAD design, workshop labs.",
        dipMech_degrees,
        isDipMechUser ? categorized.dip1 : [],
        isDipMechUser ? categorized.dip2 : [],
        isDipMechUser ? categorized.dip3 : [],
        isDipMechUser ? school11_12SkillsNode : null,
        isDipMechUser,
        profile,
        roadmap
      )
    );
  }
  if (dipCivil_degrees.length > 0) {
    const isDipCivilUser = dipCivil_degrees.some(d => d.isUserPath);
    diplomaChildren.push(
      buildDiplomaYearSeq(
        "stream-diploma-civil",
        "Civil Engineering",
        "Surveying, structural drafting, fluid labs.",
        dipCivil_degrees,
        isDipCivilUser ? categorized.dip1 : [],
        isDipCivilUser ? categorized.dip2 : [],
        isDipCivilUser ? categorized.dip3 : [],
        isDipCivilUser ? school11_12SkillsNode : null,
        isDipCivilUser,
        profile,
        roadmap
      )
    );
  }

  // 4. Link paths with children to the root
  const rootChildren = [];
  if (cbseChildren.length > 0) {
    cbsePath.children = cbseChildren;
    rootChildren.push(cbsePath);
  }
  if (interChildren.length > 0) {
    interPath.children = interChildren;
    rootChildren.push(interPath);
  }
  if (diplomaChildren.length > 0) {
    diplomaPath.children = diplomaChildren;
    rootChildren.push(diplomaPath);
  }

  if (school11_12SkillsNode) {
    rootChildren.push(school11_12SkillsNode);
  }

  // Fallback: If everything was filtered out due to custom naming, show all field options
  if (rootChildren.length === 0) {
    const cbsePCM_fallback = [
      getDegreeBranch("degree-cbse-pcm-cse", "B.Tech Computer Science", profile, roadmap, completedMilestoneIds),
      getDegreeBranch("degree-cbse-pcm-ece", "B.Tech Electronics & Comm", profile, roadmap, completedMilestoneIds)
    ];
    const interMPC_fallback = [
      getDegreeBranch("degree-inter-mpc-cse", "B.Tech Computer Science", profile, roadmap, completedMilestoneIds),
      getDegreeBranch("degree-inter-mpc-ece", "B.Tech Electronics & Comm", profile, roadmap, completedMilestoneIds)
    ];
    const cbsePCM_stream = buildCbseInterStreamSeq("stream-cbse-pcm", "Science (PCM)", "Physics, Chemistry, Math track.", cbsePCM_fallback);
    const interMPC_stream = buildCbseInterStreamSeq("stream-inter-mpc", "MPC", "Maths, Physics, Chemistry stream.", interMPC_fallback);
    cbsePath.children = [cbsePCM_stream];
    interPath.children = [interMPC_stream];
    rootChildren.push(cbsePath, interPath);
  }

  // Adjust tree layout dynamically based on the stage: CLASS_7_8 or CLASS_9_10
  let finalRootChildren = rootChildren;

  const isChef = careerGoal.toLowerCase().includes("chef") ||
                 careerGoal.toLowerCase().includes("culinary") ||
                 careerGoal.toLowerCase().includes("cook") ||
                 careerGoal.toLowerCase().includes("hotel") ||
                 careerGoal.toLowerCase().includes("bakery") ||
                 careerGoal.toLowerCase().includes("food") ||
                 careerGoal.toLowerCase().includes("restaurant");

  const g9Detail = isChef 
    ? "Focus on 9th grade studies, explore recipe structures and kitchen basics."
    : "Focus on 9th grade studies, explore science & coding basics.";

  const g9Goals = isChef
    ? [
        "Explore basic baking chemistry or culinary ratios at home",
        "Excel in school-level sciences (understanding heat and states of matter)",
        "Participate in home cooking, flavor experiments, or food-themed science projects"
      ]
    : [
        "Explore introductory coding (basic Python or Scratch) or visual design",
        "Excel in school-level sciences and mathematics",
        "Participate in science fairs, debates, or co-curricular clubs"
      ];

  const g8Detail = isChef
    ? "Focus on 8th grade studies, learn measurement units and flavor basics."
    : "Focus on 8th grade studies, build logical thinking & math basics (ongoing).";

  const g8Goals = isChef
    ? [
        "Master measurements and simple kitchen calculations (volume, mass)",
        "Practice flavor pairing ideas and simple ingredient combinations",
        "Maintain a consistent daily study routine and help in home cooking activities"
      ]
    : [
        "Master basic algebra, geometry, and foundational science concepts",
        "Practice logical reasoning puzzles to build analytical thinking",
        "Maintain a consistent daily study routine (1-2 hours)"
      ];

  if (userStage === "CLASS_7_8") {
    const school10SkillsNode = buildSkillsNode("school-10", roadmap, profile, categorized.school10.map(m => m.id));
    const grade10Children = [...rootChildren, ...categorized.school10];
    const grade10Node = node(
      "path-10th-grade",
      "10th Grade Boards & Decision",
      "path",
      "Grade 10",
      "Focus on 10th board exams and evaluate stream preferences (Science, Commerce, Arts, or Diploma).",
      { 
        isUserPath: true, 
        children: grade10Children,
        stageGoals: [
          "Score a high percentage in 10th Board Exams to maximize future choices",
          "Research different stream options (Science PCM/PCB, Commerce, Humanities)",
          "Solve previous board question papers and practice regular mock tests"
        ]
      }
    );
    
    const school9SkillsNode = buildSkillsNode("school-9", roadmap, profile, categorized.school9.map(m => m.id));
    const grade9Children = [grade10Node, ...categorized.school9];
    if (school10SkillsNode) {
      grade9Children.push(school10SkillsNode);
    }
    const grade9Node = node(
      "path-9th-grade",
      "9th Grade Exploration",
      "path",
      "Grade 9",
      g9Detail,
      { 
        isUserPath: true, 
        children: grade9Children,
        stageGoals: g9Goals
      }
    );
    
    const school8SkillsNode = buildSkillsNode("school-8", roadmap, profile, categorized.school8.map(m => m.id));
    const grade8Children = [grade9Node, ...categorized.school8];
    if (school9SkillsNode) {
      grade8Children.push(school9SkillsNode);
    }
    const grade8Node = node(
      "path-8th-grade",
      "8th Grade Foundations",
      "path",
      "Grade 8",
      g8Detail,
      { 
        isUserPath: true, 
        children: grade8Children,
        stageGoals: g8Goals
      }
    );
    
    finalRootChildren = [grade8Node];
    if (school8SkillsNode) {
      finalRootChildren.push(school8SkillsNode);
    }
  } else if (userStage === "CLASS_9_10") {
    const school10SkillsNode = buildSkillsNode("school-10", roadmap, profile, categorized.school10.map(m => m.id));
    const grade10Children = [...rootChildren, ...categorized.school10];
    const grade10Node = node(
      "path-10th-grade",
      "10th Grade Boards & Decision",
      "path",
      "Grade 10",
      "Focus on 10th board exams and evaluate stream preferences (Science, Commerce, Arts, or Diploma).",
      { 
        isUserPath: true, 
        children: grade10Children,
        stageGoals: [
          "Score a high percentage in 10th Board Exams to maximize future choices",
          "Research different stream options (Science PCM/PCB, Commerce, Humanities)",
          "Solve previous board question papers and practice regular mock tests"
        ]
      }
    );
    
    const school9SkillsNode = buildSkillsNode("school-9", roadmap, profile, categorized.school9.map(m => m.id));
    const grade9Children = [grade10Node, ...categorized.school9];
    if (school10SkillsNode) {
      grade9Children.push(school10SkillsNode);
    }
    const grade9Node = node(
      "path-9th-grade",
      "9th Grade Exploration",
      "path",
      "Grade 9",
      g9Detail,
      { 
        isUserPath: true, 
        children: grade9Children,
        stageGoals: g9Goals
      }
    );
    
    finalRootChildren = [grade9Node];
    if (school9SkillsNode) {
      finalRootChildren.push(school9SkillsNode);
    }
  }

  const root = node(
    "mindmap-root",
    `${profile.name || "You"} — Now`,
    "root",
    "Today",
    `Starting your journey toward: ${careerGoal}`,
    {
      isUserPath: true,
      children: finalRootChildren
    }
  );

  // 5. Annotate user's actual skills on their actual roadmap nodes
  const skillGap = roadmap.skillGap;
  const annotatedRoot = annotateSkills([root], skillGap)[0];

  // 6. Highlight the path dynamically based on matches
  markUserPathAncestors(annotatedRoot);

  // 7. Recurse and tag completion status
  return markCompleted(annotatedRoot, completedMilestoneIds);
}
