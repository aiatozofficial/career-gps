export function filterByFinancialTier(items, financialTier) {
  return items.filter((item) => item.financialTiers?.includes(financialTier));
}

export function getAllMilestones(roadmap) {
  const goalsToAchieve = roadmap.goalsToAchieve?.milestones || [];
  // Bug #16 fix: guard against certifications being undefined/null
  const certifications = (roadmap.certifications ?? []).map((certification) => ({
    id: certification.id,
    title: certification.name,
    detail: certification.impact,
    phase: "certifications",
  }));
  return [...goalsToAchieve, ...certifications];
}

export function getProgressStats(roadmap, completedMilestones) {
  const milestones = getAllMilestones(roadmap);
  const completed = milestones.filter((milestone) => completedMilestones.has(milestone.id));
  const total = milestones.length;
  const byPhase = ["goalsToAchieve", "certifications"]
    .map((phase) => {
      const phaseMilestones = milestones.filter((milestone) => milestone.phase === phase);
      const phaseCompleted = phaseMilestones.filter((milestone) => completedMilestones.has(milestone.id));
      return {
        phase,
        total: phaseMilestones.length,
        completed: phaseCompleted.length,
        percentage: phaseMilestones.length ? Math.round((phaseCompleted.length / phaseMilestones.length) * 100) : 0,
      };
    })
    .filter((p) => p.total > 0);

  return {
    total,
    completed: completed.length,
    percentage: total ? Math.round((completed.length / total) * 100) : 0,
    byPhase,
    firstCompleted: completed[0] ?? null,
    latestCompleted: completed[completed.length - 1] ?? null,
  };
}

export function filterTreeByFinancialTier(node, financialTier) {
  if (!node.financialTiers.includes(financialTier)) return null;
  return {
    ...node,
    children: node.children.map((child) => filterTreeByFinancialTier(child, financialTier)).filter(Boolean),
  };
}

export function getFieldLabel(field) {
  return field.type === "OTHER" ? field.customValue : field.type.replaceAll("_", " ");
}

export function getStageLabel(stage) {
  return stage.replace("CLASS_", "Class ").replaceAll("_", "-").replace("UNDERGRADUATE", "Undergraduate")
    .replace("POSTGRADUATE", "Postgraduate").replace("WORKING", "Working");
}

export function inferCollegeDegree(profile) {
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

  return "Bachelor's Degree";
}

export function getSuggestionsForGoal(goalDesc, fieldType) {
  const goal = (goalDesc || "").toLowerCase().trim();
  const field = fieldType || "";
  
  if (
    goal.includes("chef") || goal.includes("culinary") || goal.includes("cook") || 
    goal.includes("bakery") || goal.includes("pastry") || goal.includes("hotel") || 
    goal.includes("restaurant") || goal.includes("hospitality") || goal.includes("catering")
  ) {
    return [
      "Bachelor's in Culinary Arts",
      "Associate Degree in Culinary Arts",
      "Bachelor's in Hotel Management & Hospitality",
      "Pastry / Baking Arts Diploma"
    ];
  }
  
  if (goal.includes("lawyer") || goal.includes("judge") || goal.includes("legal") || goal.includes("advocate") || field === "LAW") {
    return [
      "B.A. LL.B. (Integrated Law)",
      "B.B.A. LL.B. (Hons)",
      "Bachelor of Laws (LL.B.)"
    ];
  }
  
  if (goal.includes("doctor") || goal.includes("nurse") || goal.includes("physician") || goal.includes("surgeon") || goal.includes("medical") || field === "MEDICINE") {
    return [
      "M.B.B.S. (Bachelor of Medicine, Surgery)",
      "B.Sc in Nursing",
      "Bachelor of Dental Surgery (BDS)"
    ];
  }
  
  if (goal.includes("designer") || goal.includes("ux") || goal.includes("ui") || goal.includes("graphic") || goal.includes("product design") || field === "DESIGN") {
    return [
      "B.Des in Communication Design / UX",
      "B.Des in Product Design",
      "Bachelor of Fine Arts (B.F.A.)",
      "Diploma in Graphic & UI Design"
    ];
  }

  if (goal.includes("chartered accountant") || goal.includes("ca") || goal.includes("finance") || goal.includes("accountant") || goal.includes("banker") || field === "COMMERCE") {
    return [
      "B.Com (Hons) in Finance & Accountancy",
      "B.B.A. in Finance / Investment Banking",
      "Bachelor of Financial Markets (BFM)"
    ];
  }

  if (goal.includes("data scientist") || goal.includes("data analyst") || goal.includes("statistics") || goal.includes("analytics")) {
    return [
      "B.Sc in Data Science / Applied Statistics",
      "B.C.A. (Data Analytics)",
      "B.Tech in Artificial Intelligence & Data Science"
    ];
  }

  if (field === "TECH" || goal.includes("developer") || goal.includes("engineer") || goal.includes("programmer") || goal.includes("software")) {
    return [
      "B.Tech in Computer Science & Engineering",
      "Bachelor of Computer Applications (B.C.A.)",
      "B.Sc in Computer Science / Information Technology"
    ];
  }

  if (field === "SCIENCE" || goal.includes("scientist") || goal.includes("researcher") || goal.includes("biotech")) {
    return [
      "B.Sc (Bachelor of Science) in your Specialization",
      "B.Sc (Hons) in Biotechnology / Life Sciences",
      "BS-MS Dual Degree (Research Track)"
    ];
  }

  if (field === "ARTS" || goal.includes("writer") || goal.includes("artist") || goal.includes("journal") || goal.includes("historian")) {
    return [
      "Bachelor of Arts (B.A.) in English Literature",
      "B.A. in Journalism & Mass Communication",
      "Bachelor of Fine Arts (B.F.A.)"
    ];
  }

  return [
    "Bachelor's Degree in related stream",
    "B.B.A. in General Management",
    "B.Sc (Bachelor of Science)"
  ];
}

export function checkCourseMatch(courseName, goalDesc, fieldType) {
  const course = (courseName || "").toLowerCase().trim();
  const goal = (goalDesc || "").toLowerCase().trim();
  const field = fieldType || "";

  if (!course) return true;

  // 1. Culinary Goal Matcher
  const isCulinaryGoal = 
    goal.includes("chef") || goal.includes("culinary") || goal.includes("cook") || 
    goal.includes("bakery") || goal.includes("pastry") || goal.includes("hotel") || 
    goal.includes("restaurant") || goal.includes("hospitality") || goal.includes("catering");
  
  if (isCulinaryGoal) {
    const isCulinaryCourse = 
      course.includes("culinary") || course.includes("hotel") || course.includes("hospitality") || 
      course.includes("catering") || course.includes("baking") || course.includes("pastry") || 
      course.includes("gastronomy") || course.includes("business") || course.includes("administration") || 
      course.includes("management") || course.includes("tourism") || course.includes("arts") ||
      course.includes("degree") || course.includes("diploma");
    
    const isTechOrMedicalCourse =
      course.includes("btech") || course.includes("b.tech") || course.includes("computer science") || 
      course.includes("cse") || course.includes("engineering") || course.includes("m.b.b.s") || 
      course.includes("medicine") || course.includes("law") || course.includes("llb") || 
      course.includes("bca") || course.includes("mca");
      
    if (isTechOrMedicalCourse && !isCulinaryCourse) {
      return false;
    }
  }

  // 2. Tech Goal Matcher
  const isTechGoal =
    goal.includes("developer") || goal.includes("engineer") || goal.includes("programmer") || 
    goal.includes("software") || goal.includes("coding") || goal.includes("web app");
  
  if (isTechGoal) {
    const isTechCourse =
      course.includes("computer") || course.includes("tech") || course.includes("bca") || 
      course.includes("mca") || course.includes("engineering") || course.includes("it") || 
      course.includes("coding") || course.includes("science") || course.includes("math") ||
      course.includes("data") || course.includes("degree") || course.includes("diploma");
      
    const isUnrelatedArtsOrMed =
      course.includes("culinary") || course.includes("mbbs") || course.includes("medicine") || 
      course.includes("nursing") || course.includes("dental") || course.includes("history") ||
      course.includes("literature") || course.includes("law") || course.includes("llb");
      
    if (isUnrelatedArtsOrMed && !isTechCourse) {
      return false;
    }
  }

  // 3. Law Goal Matcher
  const isLawGoal =
    goal.includes("lawyer") || goal.includes("judge") || goal.includes("legal") || goal.includes("advocate") || field === "LAW";
  if (isLawGoal) {
    const isLawCourse =
      course.includes("law") || course.includes("llb") || course.includes("ll.b") || 
      course.includes("juris") || course.includes("legal") || course.includes("degree") || course.includes("diploma");
    const isUnrelatedTechOrMed =
      course.includes("btech") || course.includes("b.tech") || course.includes("computer science") || 
      course.includes("cse") || course.includes("mbbs") || course.includes("medicine") || 
      course.includes("nursing") || course.includes("dental") || course.includes("bca") || course.includes("mca");
    if (isUnrelatedTechOrMed && !isLawCourse) {
      return false;
    }
  }

  // 4. Medical Goal Matcher
  const isMedicalGoal =
    goal.includes("doctor") || goal.includes("nurse") || goal.includes("physician") || 
    goal.includes("surgeon") || goal.includes("medical") || goal.includes("dentist") || field === "MEDICINE";
  if (isMedicalGoal) {
    const isMedicalCourse =
      course.includes("mbbs") || course.includes("medicine") || course.includes("nursing") || 
      course.includes("dental") || course.includes("surgery") || course.includes("medical") || 
      course.includes("b.sc") || course.includes("bsc") || course.includes("science") ||
      course.includes("degree") || course.includes("diploma");
    const isUnrelatedTechOrLaw =
      course.includes("btech") || course.includes("b.tech") || course.includes("computer science") || 
      course.includes("cse") || course.includes("law") || course.includes("llb") || 
      course.includes("bca") || course.includes("commerce") || course.includes("b.com");
    if (isUnrelatedTechOrLaw && !isMedicalCourse) {
      return false;
    }
  }

  // 5. Design Goal Matcher
  const isDesignGoal =
    goal.includes("designer") || goal.includes("ux") || goal.includes("ui") || 
    goal.includes("graphic") || goal.includes("product design") || field === "DESIGN";
  if (isDesignGoal) {
    const isDesignCourse =
      course.includes("design") || course.includes("b.des") || course.includes("bdes") || 
      course.includes("fine arts") || course.includes("bfa") || course.includes("graphic") || 
      course.includes("visual") || course.includes("creative") || course.includes("degree") || course.includes("diploma");
    const isUnrelatedTechOrMed =
      course.includes("btech") || course.includes("b.tech") || course.includes("computer science") || 
      course.includes("cse") || course.includes("mbbs") || course.includes("medicine") || 
      course.includes("nursing") || course.includes("law") || course.includes("llb") || 
      course.includes("bca");
    if (isUnrelatedTechOrMed && !isDesignCourse) {
      return false;
    }
  }

  return true;
}

export function getFallbackSkills(customValue) {
  const custom = (customValue || "").toLowerCase();
  
  if (
    custom.includes("chef") || custom.includes("culinary") || custom.includes("cook") || 
    custom.includes("bakery") || custom.includes("pastry") || custom.includes("hotel") || 
    custom.includes("restaurant") || custom.includes("hospitality") || custom.includes("catering") ||
    custom.includes("gastronomy") || custom.includes("food")
  ) {
    return ["Knife skills", "Food safety & hygiene", "Garde manger", "Culinary techniques", "Baking & pastry", "Menu planning", "Plating aesthetics"];
  }

  if (custom.includes("music") || custom.includes("sing") || custom.includes("song") || custom.includes("instrument") || custom.includes("audio")) {
    return ["Music theory", "Ear training", "Vocal control", "Instrument practice", "Audio production", "Songwriting"];
  }

  if (custom.includes("writer") || custom.includes("write") || custom.includes("journal") || custom.includes("edit") || custom.includes("copy")) {
    return ["SEO copywriting", "Editing & proofreading", "Creative writing", "Fact checking", "Content strategy", "Interview techniques"];
  }

  if (custom.includes("sport") || custom.includes("fitness") || custom.includes("coach") || custom.includes("train") || custom.includes("gym")) {
    return ["Exercise physiology", "Nutritional planning", "Kinesiology", "First aid & CPR", "Fitness assessment", "Athletic training"];
  }

  if (custom.includes("photograph") || custom.includes("video") || custom.includes("film") || custom.includes("camera")) {
    return ["Camera operations", "Lighting setups", "Color grading", "Video editing", "Composition & framing", "Visual storytelling"];
  }

  return ["Domain research", "Industry frameworks", "Specialized analysis", "Project building", "Tool proficiency", "Practical applications"];
}

export function getPhase1Milestones() {
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
}

export function getPhase2Milestones(profile, field) {
  const stream = profile?.tenthPath || "CBSE";
  const electives = profile?.streamElectives || "General MPC";
  const prep = profile?.prepStyle || "Self-study";
  const fieldName = field || "your chosen field";
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
          { id: "pre-2-2", title: "Intro to field tools", detail: `Learn basic software utilities or tools related to ${fieldName}.`, phase: "goalsToAchieve", timeframe: "Month 6 (Study Habits)", prerequisites: [] }
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
          { id: "pre-2-2", title: "Intro to field tools", detail: `Learn basic scripting or business excel related to ${fieldName}.`, phase: "goalsToAchieve", timeframe: "Month 6 (Study Habits)", prerequisites: [] }
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
}

export function getPhase3CollegeMilestones(profile, field) {
  const degree = inferCollegeDegree(profile);
  const collegeEnv = profile.collegeEnvironment || "Regional College";
  const collegeFocus = profile.collegeFocus || "Campus Placements";
  const fieldName = field || "your chosen field";
  return [
    {
      id: "goal-1",
      title: "Focus Strictly on College Academics",
      detail: `Adapt to the university curriculum in ${degree}. Focus entirely on building academic foundations, maintaining a high GPA, and joining college clubs. No internships or heavy work required.`,
      timeframe: "Year 1 (College 1st Year)",
      phase: "goalsToAchieve",
      prerequisites: [
        { id: "pre-1-1", title: "Maintain high GPA", detail: `Focus on score optimization in core foundational modules of your ${degree} program.`, phase: "goalsToAchieve", timeframe: "Year 1 (College 1st Year)", prerequisites: [] },
        { id: "pre-1-2", title: "Campus assimilation", detail: "Join 1 field-related student branch or academic/hobby club.", phase: "goalsToAchieve", timeframe: "Year 1 (College 1st Year)", prerequisites: [] }
      ]
    },
    {
      id: "goal-2",
      title: "Build Portfolio & Apply for Internships",
      detail: `Commence skill specialized learning in ${fieldName}. Create hands-on projects and apply for your first paid internship via Internshala or LinkedIn.`,
      timeframe: "Year 2 (College 2nd Year)",
      phase: "goalsToAchieve",
      prerequisites: [
        { id: "pre-2-1", title: "First certification", detail: "Enroll in and complete a core industry-aligned certification course.", phase: "goalsToAchieve", timeframe: "Year 2 (College 2nd Year)", prerequisites: [] },
        { id: "pre-2-2", title: "Internship search", detail: `Apply to 10+ stipend-based roles in ${fieldName} on Internshala or target platforms.`, phase: "goalsToAchieve", timeframe: "Year 2 (College 2nd Year)", prerequisites: [] }
      ]
    },
    {
      id: "goal-3",
      title: "Placement Preparation & Advanced Projects",
      detail: `Deepen your expertise in ${fieldName}. Conduct mock interviews, study field-specific case studies, and complete an advanced capstone project.`,
      timeframe: "Year 3 (College 3rd Year)",
      phase: "goalsToAchieve",
      prerequisites: [
        { id: "pre-3-1", title: "Advanced Capstone", detail: "Complete a comprehensive portfolio capstone project.", phase: "goalsToAchieve", timeframe: "Year 3 (College 3rd Year)", prerequisites: [] },
        { id: "pre-3-2", title: "Study common scenarios", detail: `Review core terminology, methodologies, case studies, or operational scenarios in ${fieldName}.`, phase: "goalsToAchieve", timeframe: "Year 3 (College 3rd Year)", prerequisites: [] }
      ]
    },
    {
      id: "goal-4",
      title: "Final Placements & University Graduation",
      detail: `Apply for direct jobs or sit for campus placement drives (${collegeFocus}). Successfully graduate from university and prepare for professional operatorship.`,
      timeframe: "Year 4 (Final Year)",
      phase: "goalsToAchieve",
      prerequisites: [
        { id: "pre-4-1", title: "Placement drives", detail: "Apply to at least 15 entry-level positions.", phase: "goalsToAchieve", timeframe: "Year 4 (Final Year)", prerequisites: [] },
        { id: "pre-4-2", title: "Clear university exams", detail: "Successfully complete university degree requirements.", phase: "goalsToAchieve", timeframe: "Year 4 (Final Year)", prerequisites: [] }
      ]
    }
  ];
}

export function processRoadmapForHistory(roadmap, profile) {
  if (!roadmap || !roadmap.goalsToAchieve) return roadmap;

  const milestones = roadmap.goalsToAchieve.milestones || [];
  const alreadyPrefixed = milestones.some(ms => ms.id.startsWith("p1-") || ms.id.startsWith("p2-") || ms.id.startsWith("p3-") || ms.id.startsWith("p4-"));
  if (alreadyPrefixed) return roadmap;

  const currentPhase = profile.onboardingPhase || 1;
  const currentPrefix = `p${currentPhase}-`;

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

  const pCurrentMs = prefixMilestones(milestones, currentPrefix);
  let finalMilestones = [];

  const field = profile.field?.customValue || profile.field?.type || "chosen field";

  const startStage = profile.startStage || (profile.startedInPhase1 ? "CLASS_7_8" : (profile.startedInPhase2 ? "CLASS_9_10" : "UNDERGRADUATE"));

  /*
   * PHASE-TO-MILESTONE MAPPING:
   * Maps onboarding phase indices (represented by prefixes like p1-, p2-, p3-, p4-)
   * to actual journey phases depending on the user's start stage:
   *
   * 1. CLASS_7_8 (Full 4-phase journey):
   *    - Phase 1 (p1-): CLASS_7_8 -> getPhase1Milestones()
   *    - Phase 2 (p2-): CLASS_11_12 prep -> getPhase2Milestones()
   *    - Phase 3 (p3-): College -> getPhase3CollegeMilestones()
   *    - Phase 4 (p4-): Postgraduate/Working -> Current live generated milestones (pCurrentMs)
   *
   * 2. CLASS_9_10 (Skips Phase 1):
   *    - Phase 1 (p1-): CLASS_11_12 prep -> getPhase2Milestones()
   *    - Phase 2 (p2-): College -> getPhase3CollegeMilestones()
   *    - Phase 3 (p3-): Postgraduate/Working -> Current live generated milestones (pCurrentMs)
   *
   * 3. CLASS_11_12 (College Prep start stage):
   *    - Phase 1 (p1-): College -> getPhase3CollegeMilestones()
   *    - Phase 2 (p2-): Postgraduate/Working -> Current live generated milestones (pCurrentMs)
   *
   * 4. UNDERGRADUATE (College start stage):
   *    - Phase 1 (p1-): College -> getPhase3CollegeMilestones()
   *    - Phase 2 (p2-): Postgraduate/Working -> Current live generated milestones (pCurrentMs)
   *
   * 5. POSTGRADUATE/WORKING (Late start stage):
   *    - Phase 1 (p1-): Postgraduate/Working -> Current live generated milestones (pCurrentMs)
   */
  if (startStage === "CLASS_7_8") {
    if (currentPhase === 1) {
      finalMilestones = pCurrentMs;
    } else if (currentPhase === 2) {
      const p1Ms = prefixMilestones(getPhase1Milestones(), "p1-");
      finalMilestones = [...p1Ms, ...pCurrentMs];
    } else if (currentPhase === 3) {
      const p1Ms = prefixMilestones(getPhase1Milestones(), "p1-");
      const p2Ms = prefixMilestones(getPhase2Milestones(profile, field), "p2-");
      finalMilestones = [...p1Ms, ...p2Ms, ...pCurrentMs];
    } else {
      const p1Ms = prefixMilestones(getPhase1Milestones(), "p1-");
      const p2Ms = prefixMilestones(getPhase2Milestones(profile, field), "p2-");
      const p3CollegeMs = prefixMilestones(getPhase3CollegeMilestones(profile, field), "p3-");
      finalMilestones = [...p1Ms, ...p2Ms, ...p3CollegeMs, ...pCurrentMs];
    }
  } else if (startStage === "CLASS_9_10") {
    if (currentPhase === 1) {
      finalMilestones = pCurrentMs;
    } else if (currentPhase === 2) {
      const p1Ms = prefixMilestones(getPhase2Milestones(profile, field), "p1-");
      finalMilestones = [...p1Ms, ...pCurrentMs];
    } else {
      const p1Ms = prefixMilestones(getPhase2Milestones(profile, field), "p1-");
      const p2Ms = prefixMilestones(getPhase3CollegeMilestones(profile, field), "p2-");
      finalMilestones = [...p1Ms, ...p2Ms, ...pCurrentMs];
    }
  } else if (startStage === "CLASS_11_12") {
    if (currentPhase === 1) {
      finalMilestones = pCurrentMs;
    } else {
      const p1Ms = prefixMilestones(getPhase3CollegeMilestones(profile, field), "p1-");
      finalMilestones = [...p1Ms, ...pCurrentMs];
    }
  } else if (startStage === "UNDERGRADUATE") {
    if (currentPhase === 1) {
      finalMilestones = pCurrentMs;
    } else {
      const p1Ms = prefixMilestones(getPhase3CollegeMilestones(profile, field), "p1-");
      finalMilestones = [...p1Ms, ...pCurrentMs];
    }
  } else {
    // startStage === "POSTGRADUATE", "WORKING"
    finalMilestones = pCurrentMs;
  }

  // Update decision tree milestones mapping
  let decisionTreeMilestones = finalMilestones.map((ms) => ({
    id: ms.id,
    label: ms.title,
    type: ms.timeframe.toLowerCase().includes("month") ? "milestone" : "goal",
    month: ms.timeframe,
    detail: ms.detail,
    financialTiers: ["LOW", "MEDIUM", "HIGH"],
    status: "not_started",
    children: []
  }));

  // Re-link decision tree
  for (let i = 0; i < decisionTreeMilestones.length - 1; i++) {
    decisionTreeMilestones[i].children.push(decisionTreeMilestones[i + 1]);
  }

  let finalSkillGap = roadmap.skillGap;
  if (roadmap.skillGap && Array.isArray(roadmap.skillGap.need)) {
    finalSkillGap = {
      ...roadmap.skillGap,
      need: roadmap.skillGap.need.map((item) => {
        let mId = item.milestoneId;
        if (mId && !mId.startsWith("p1-") && !mId.startsWith("p2-") && !mId.startsWith("p3-") && !mId.startsWith("p4-")) {
          mId = `${currentPrefix}${mId}`;
        }
        return {
          ...item,
          milestoneId: mId
        };
      })
    };
  }

  return {
    ...roadmap,
    goalsToAchieve: {
      ...roadmap.goalsToAchieve,
      milestones: finalMilestones
    },
    skillGap: finalSkillGap,
    decisionTree: {
      ...roadmap.decisionTree,
      children: [
        {
          ...roadmap.decisionTree?.children?.[0],
          children: decisionTreeMilestones.length > 0 ? [decisionTreeMilestones[0]] : []
        }
      ]
    }
  };
}

export function checkStreamMatch(stream, goalDesc, fieldType) {
  const goal = (goalDesc || "").toLowerCase().trim();
  const field = fieldType || "";

  // 1. Tech / Data goals (e.g. software engineer, data analyst, programmer, developer, coder, statistics)
  const isTechGoal =
    field === "TECH" ||
    goal.includes("data") || goal.includes("analyst") || goal.includes("statistics") || goal.includes("analytics") ||
    goal.includes("developer") || goal.includes("engineer") || goal.includes("programmer") || 
    goal.includes("software") || goal.includes("coding") || goal.includes("web app") || goal.includes("computer");

  if (isTechGoal) {
    const isCompatible = 
      stream === "MPC" || 
      stream === "MEC / CEC" || 
      stream === "Computer Engineering" || 
      stream === "Electronics & Communication";

    if (!isCompatible) {
      return {
        matches: false,
        reason: `You aim to pursue a Career Goal in Tech/Data Analysis ("${goalDesc}"), but you selected "${stream}". Most data analyst and technology roles require a strong foundation in Mathematics, Statistics, or Computer Science.`,
        recommended: stream.includes("Engineering") || stream.includes("Communication") || stream.includes("Mechanical") || stream.includes("Civil")
          ? "Computer Engineering"
          : "MPC or MEC / CEC"
      };
    }
  }

  // 2. Medical / Healthcare goals (e.g. doctor, nurse, surgeon, medical, physician, biologist, biotech, pharmacy)
  const isMedicalGoal =
    field === "MEDICINE" ||
    goal.includes("doctor") || goal.includes("nurse") || goal.includes("physician") || 
    goal.includes("surgeon") || goal.includes("medical") || goal.includes("dentist") || 
    goal.includes("biotech") || goal.includes("biology") || goal.includes("pharmacy");

  if (isMedicalGoal) {
    const isCompatible = 
      stream === "BiPC" || 
      stream === "Civil / Chemical Engineering";
      
    if (!isCompatible) {
      return {
        matches: false,
        reason: `You aim to pursue a Medical or Life Science Goal ("${goalDesc}"), but you selected "${stream}". Medical, pharmacy, and bioscience professions typically require a high school background in Biology (BiPC).`,
        recommended: "BiPC"
      };
    }
  }

  // 3. Commerce / Finance / Business goals (e.g. chartered accountant, finance, banker, auditor, commerce)
  const isCommerceGoal =
    field === "COMMERCE" ||
    goal.includes("chartered accountant") || goal.includes("ca") || goal.includes("finance") || 
    goal.includes("accountant") || goal.includes("banker") || goal.includes("commerce") || 
    goal.includes("auditor") || goal.includes("business") || goal.includes("management");

  if (isCommerceGoal) {
    const isCompatible = 
      stream === "MEC / CEC" || 
      stream === "MPC" || 
      stream === "HEC / Humanities";
      
    if (!isCompatible) {
      return {
        matches: false,
        reason: `You aim to pursue a Business, Finance, or Commerce Goal ("${goalDesc}"), but you selected "${stream}". These pathways heavily benefit from Commerce, Economics, or Mathematics backgrounds.`,
        recommended: "MEC / CEC"
      };
    }
  }

  // 4. Law / Humanities / Arts (e.g. lawyer, judge, advocate, writer, journalist, designer, artist)
  const isArtsOrLawGoal =
    field === "LAW" || field === "ARTS" || field === "DESIGN" ||
    goal.includes("lawyer") || goal.includes("judge") || goal.includes("legal") || goal.includes("advocate") ||
    goal.includes("writer") || goal.includes("artist") || goal.includes("journal") || goal.includes("designer") || goal.includes("creative");

  if (isArtsOrLawGoal) {
    const isCompatible = 
      stream === "HEC / Humanities" || 
      stream === "MEC / CEC" || 
      stream === "MPC";
      
    if (!isCompatible) {
      return {
        matches: false,
        reason: `You aim to pursue a Law, Arts, or Humanities Goal ("${goalDesc}"), but you selected "${stream}". These careers are best supported by Humanities or Commerce streams to build early legal, social, or creative context.`,
        recommended: "HEC / Humanities"
      };
    }
  }

  return { matches: true };
}



