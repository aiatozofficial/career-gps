/**
 * Transforms flat roadmap data (shortTermGoals, longTermGoals, certifications)
 * into a unified timeline node array for the RPG-style vertical timeline view.
 *
 * Computes age/year markers from the student profile.
 */

import { inferCollegeDegree } from "./roadmapHelpers.js";

/* ── Icon mapping by milestone type ── */
const TYPE_ICONS = {
  education: "E",
  job: "J",
  skill: "S",
  decision: "D",
  certification: "C",
  internship: "I",
};

/* ── Stage progression order ── */
const STAGE_ORDER = [
  "CLASS_7_8",
  "CLASS_9_10",
  "CLASS_11_12",
  "UNDERGRADUATE",
  "POSTGRADUATE",
  "WORKING",
];

const STAGE_LABELS = {
  CLASS_7_8: "Class 7–8",
  CLASS_9_10: "Class 9–10",
  CLASS_11_12: "Class 11–12",
  UNDERGRADUATE: "Undergraduate",
  POSTGRADUATE: "Postgraduate",
  WORKING: "Working Professional",
};

const STAGE_DURATION_YEARS = {
  CLASS_7_8: 2,
  CLASS_9_10: 2,
  CLASS_11_12: 2,
  UNDERGRADUATE: 4,
  POSTGRADUATE: 2,
  WORKING: 0,
};

/* ── Classify milestone type from its content ── */
function classifyMilestoneType(milestone) {
  const title = (milestone.title || "").toLowerCase();
  const detail = (milestone.detail || "").toLowerCase();
  const text = title + " " + detail;

  if (milestone.phase === "internships") return "internship";
  if (milestone.phase === "certifications") return "certification";

  // Job-related keywords
  if (
    text.includes("job") ||
    text.includes("role") ||
    text.includes("position") ||
    text.includes("hire") ||
    text.includes("placement") ||
    text.includes("employment") ||
    text.includes("career") ||
    text.includes("apply") ||
    text.includes("interview")
  ) {
    return "job";
  }

  // Skill-related keywords
  if (
    text.includes("learn") ||
    text.includes("skill") ||
    text.includes("master") ||
    text.includes("practice") ||
    text.includes("build") ||
    text.includes("project") ||
    text.includes("portfolio") ||
    text.includes("python") ||
    text.includes("sql") ||
    text.includes("excel") ||
    text.includes("coding") ||
    text.includes("framework")
  ) {
    return "skill";
  }

  // Education-related
  return "education";
}

/**
 * Build the full timeline data from roadmap + profile.
 *
 * @param {object} roadmap — validated roadmap object
 * @param {object} profile — validated student profile
 * @param {Set} completedMilestones — set of completed milestone IDs
 * @returns {{ nodes: TimelineNode[], stages: TimelineStage[], progress: number }}
 */
export function buildTimeline(roadmap, profile, completedMilestones) {
  const currentYear = new Date().getFullYear();
  const currentAge = profile.age;

  const nodes = [];
  const stages = [];
  let nodeIndex = 0;

  const milestonesList = roadmap.goalsToAchieve?.milestones || [];

  // ── Determine the "current" milestone (first uncompleted) ──
  const allMilestoneIds = milestonesList.map((ms) => ms.id);
  const firstUncompletedId = allMilestoneIds.find(
    (id) => !completedMilestones.has(id)
  );

  // Establish unified stage
  const mainStage = {
    id: "stage-goals-achieve",
    label: STAGE_LABELS[profile.stage] || profile.stage,
    subtitle: "Your Pathway",
    ageStart: currentAge,
    yearStart: currentYear,
  };
  stages.push(mainStage);

  const startStage = profile.startStage || (profile.startedInPhase1 ? "CLASS_7_8" : (profile.startedInPhase2 ? "CLASS_9_10" : "UNDERGRADUATE"));
  
  const getPhaseStartAge = (phaseNum) => {
    if (startStage === "CLASS_7_8") {
      if (phaseNum === 1) return 12;
      if (phaseNum === 2) return 14;
      if (phaseNum === 3) return 16;
      return 20;
    }
    if (startStage === "CLASS_9_10") {
      if (phaseNum === 1) return 14;
      if (phaseNum === 2) return 16;
      return 20;
    }
    if (startStage === "CLASS_11_12") {
      if (phaseNum === 1) return 16;
      return 20;
    }
    if (startStage === "UNDERGRADUATE") {
      if (phaseNum === 1) return 18;
      return 22;
    }
    if (startStage === "POSTGRADUATE") {
      return 22;
    }
    return 24; // WORKING
  };

  milestonesList.forEach((milestone, idx) => {
    // Parse time offset from timeframe (e.g. "Month 3", "Year 2", "Years 5-7")
    const timeframeStr = milestone.timeframe || "";
    let offsetYears = 0;
    
    const match = timeframeStr.match(/\d+/);
    if (timeframeStr.toLowerCase().includes("month")) {
      const months = match ? parseInt(match[0], 10) : 3;
      offsetYears = months / 12;
    } else if (timeframeStr.toLowerCase().includes("year")) {
      offsetYears = match ? parseInt(match[0], 10) : 2;
    } else {
      // Fallback based on index
      offsetYears = idx * 0.5;
    }

    const matchPrefix = milestone.id.match(/^p(\d+)-/);
    const phaseNum = matchPrefix ? parseInt(matchPrefix[1], 10) : (profile.onboardingPhase || 1);
    const phaseStartAge = getPhaseStartAge(phaseNum);

    const computedAge = Math.floor(phaseStartAge + offsetYears);
    const computedYear = currentYear - Math.floor(currentAge - (phaseStartAge + offsetYears));

    const type = classifyMilestoneType(milestone);
    const isCurrent = milestone.id === firstUncompletedId;
    const isCompleted = completedMilestones.has(milestone.id);

    const subTasks = milestone.prerequisites || [];
    const completedSubTasks = subTasks.filter((p) =>
      completedMilestones.has(p.id)
    ).length;
    const allPrereqsMet = subTasks.length === 0 || completedSubTasks === subTasks.length;

    let status = "locked";
    if (isCompleted) status = "completed";
    else if (isCurrent && allPrereqsMet) status = "current";

    nodes.push({
      id: milestone.id,
      index: nodeIndex++,
      type,
      icon: TYPE_ICONS[type] || "🎯",
      title: milestone.title,
      detail: milestone.detail,
      stage: timeframeStr,
      stageId: "stage-goals-achieve",
      ageLabel: `Age ${computedAge}`,
      yearLabel: `${computedYear}`,
      timeLabel: timeframeStr,
      phase: "goalsToAchieve",
      status,
      milestoneId: milestone.id,
      subTasks: subTasks.map((p) => ({
        id: p.id,
        title: p.title,
        detail: p.detail,
        completed: completedMilestones.has(p.id),
      })),
      completedSubTasks,
      totalSubTasks: subTasks.length,
      branch: null,
    });

    // ── Inject decision point: After 10th Grade (Phase 1 final milestone or Stage match) ──
    const isPhase1Final = timeframeStr.toLowerCase().includes("10th grade");
    if (
      isPhase1Final ||
      ((profile.stage === "CLASS_9_10" || profile.stage === "CLASS_7_8") &&
       timeframeStr.toLowerCase().includes("month 18"))
    ) {
      const decisionAge = computedAge;
      const decisionYear = computedYear;
      nodes.push({
        id: "decision-after-10th",
        index: nodeIndex++,
        type: "decision",
        icon: TYPE_ICONS.decision,
        title: "Choose Your Path After 10th",
        detail:
          "This is a critical decision point. Choose between CBSE (11th & 12th), Intermediate Junior College, or a Polytechnic Diploma. Each path leads to different career trajectories.",
        stage: "After 10th Grade",
        stageId: "decision-10th",
        ageLabel: `Age ${decisionAge}`,
        yearLabel: `${decisionYear}`,
        timeLabel: "Decision Point",
        phase: "goalsToAchieve",
        status: profile.tenthPath ? "completed" : "current",
        milestoneId: "decision-after-10th",
        subTasks: [],
        completedSubTasks: 0,
        totalSubTasks: 0,
        branch: {
          options: [
            {
              id: "branch-cbse",
              label: "CBSE (11th & 12th)",
              description:
                "Continue with CBSE board. Access JEE, NEET, CLAT, and national exams. Most common route for engineering & medical.",
              icon: "Ed",
            },
            {
              id: "branch-inter",
              label: "Intermediate College",
              description:
                "Join a state-board Inter college (AP/Telangana). Strong coaching ecosystem for EAMCET and competitive exams.",
              icon: "Col",
            },
            {
              id: "branch-diploma",
              label: "Polytechnic Diploma",
              description:
                "3-year hands-on program. Learn practical skills. Can enter B.Tech directly in 2nd year via lateral entry.",
              icon: "Dip",
            },
          ],
          recommended: profile.tenthPath || "CBSE",
          selected: profile.tenthPath || null,
        },
      });
    }

    // ── Inject decision point: College Degree & Graduation Focus (Phase 2 final milestone) ──
    const isPhase2Final = timeframeStr.toLowerCase().includes("final board") || timeframeStr.toLowerCase().includes("diploma year 3");
    if (isPhase2Final) {
      const decisionAge = computedAge;
      const decisionYear = computedYear;
      nodes.push({
        id: "decision-college-entrance",
        index: nodeIndex++,
        type: "decision",
        icon: TYPE_ICONS.decision,
        title: "Choose Your College Degree & Career Trajectory",
        detail:
          "Pick your undergraduate course (B.Tech CS, B.Com, B.C.A., etc.) and career focus (Campus Placements vs Off-Campus/Startups) to unlock Phase 3.",
        stage: "College Transition",
        stageId: "decision-college",
        ageLabel: `Age ${decisionAge}`,
        yearLabel: `${decisionYear}`,
        timeLabel: "Decision Point",
        phase: "goalsToAchieve",
        status: profile.collegeDegree ? "completed" : "current",
        milestoneId: "decision-college-entrance",
        subTasks: [],
        completedSubTasks: 0,
        totalSubTasks: 0,
        branch: {
          options: [
            { id: "branch-btech-cs", label: "B.Tech Computer Science", description: "Highly structured engineering path focusing on software development and placement prep.", icon: "BTech" },
            { id: "branch-bca", label: "B.C.A. (Computer Applications)", description: "Accelerated computing track focused on practical software application development.", icon: "BCA" },
            { id: "branch-bcom", label: "B.Com / B.B.A. Finance", description: "Business and corporate commerce stream focusing on finance or marketing.", icon: "BCom" },
            { id: "branch-other-degree", label: "Other Degree / Humanities", description: "Liberal arts, sciences, or specialized legal research streams.", icon: "Arts" }
          ],
          recommended: inferCollegeDegree(profile),
          selected: profile.collegeDegree || null,
        }
      });
    }

    // ── Inject decision point: Master's degree (after Year 4 milestone) ──
    if (
      (profile.stage === "UNDERGRADUATE" || profile.stage === "POSTGRADUATE") &&
      timeframeStr.toLowerCase().includes("year 4")
    ) {
      nodes.push({
        id: "decision-masters",
        index: nodeIndex++,
        type: "decision",
        icon: TYPE_ICONS.decision,
        title: "Master's Degree Decision",
        detail:
          "Decide whether to pursue a Master's degree (MS/M.Tech, MBA, MCA, M.Sc/M.A.) or enter the workforce directly.",
        stage: "Post-Graduation Decision",
        stageId: "decision-masters",
        ageLabel: `Age ${computedAge}`,
        yearLabel: `${computedYear}`,
        timeLabel: "Decision Point",
        phase: "goalsToAchieve",
        status: profile.mastersPreference ? "completed" : "current",
        milestoneId: "decision-masters",
        subTasks: [],
        completedSubTasks: 0,
        totalSubTasks: 0,
        branch: {
          options: [
            { id: "branch-ms", label: "MS / M.Tech", description: "Research or engineering focus. GATE/GRE required.", icon: "MS" },
            { id: "branch-mba", label: "MBA", description: "Management, consulting, finance. CAT/GMAT required.", icon: "MBA" },
            { id: "branch-mca", label: "MCA", description: "Computer applications bridge for non-CS graduates.", icon: "MCA" },
            { id: "branch-msc", label: "M.Sc / M.A.", description: "Pure science or arts for academic depth.", icon: "MSc" },
            { id: "branch-jobs", label: "Direct Jobs", description: "Skip Master's and enter workforce immediately.", icon: "Job" },
          ],
          recommended: profile.mastersPreference || "NONE",
          selected: profile.mastersPreference || null,
        },
      });
    }
  });

  // ── CERTIFICATIONS as timeline nodes ──
  roadmap.certifications.forEach((cert, idx) => {
    const certAge = currentAge + 1 + Math.floor(idx / 2);
    const certYear = currentYear + 1 + Math.floor(idx / 2);

    nodes.push({
      id: cert.id,
      index: nodeIndex++,
      type: "certification",
      icon: TYPE_ICONS.certification,
      title: cert.name,
      detail: `${cert.platform} • ${cert.cost} • ${cert.duration} — ${cert.impact}`,
      stage: "Certifications",
      stageId: "stage-certifications",
      ageLabel: `Age ${certAge}`,
      yearLabel: `${certYear}`,
      timeLabel: `Certification ${idx + 1}`,
      phase: "certifications",
      status: completedMilestones.has(cert.id) ? "completed" : "current",
      milestoneId: cert.id,
      subTasks: [],
      completedSubTasks: 0,
      totalSubTasks: 0,
      branch: null,
    });
  });

  // ── Compute overall progress ──
  const totalNodes = nodes.filter((n) => n.type !== "decision").length;
  const completedNodes = nodes.filter(
    (n) => n.type !== "decision" && n.status === "completed"
  ).length;
  const progress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  // ── Find current node for "You Are Here" ──
  const currentNode = nodes.find((n) => n.status === "current") || nodes[0];

  return {
    nodes,
    stages,
    progress,
    totalNodes,
    completedNodes,
    currentNode,
  };
}

/**
 * Get the list of stage bookmark objects for quick-jump navigation.
 */
export function getStageBookmarks(nodes) {
  const seen = new Set();
  const bookmarks = [];

  for (const node of nodes) {
    if (!seen.has(node.stageId)) {
      seen.add(node.stageId);
      bookmarks.push({
        id: node.stageId,
        label: node.stage,
        nodeId: node.id,
      });
    }
  }

  return bookmarks;
}
