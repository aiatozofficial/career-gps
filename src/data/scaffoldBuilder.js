/**
 * scaffoldBuilder.js
 *
 * Builds the STRUCTURE-ONLY mindmap scaffold from the user profile.
 * No goals, skills, or milestones are generated here — those come lazily
 * from /api/node-content when each node is opened.
 *
 * Returns: { nodes (flat array), tree (nested for D3) }
 */

// ─────────────────────────────────────────────────────────
// Node colours (consistent palette)
// ─────────────────────────────────────────────────────────
export const SCAFFOLD_COLORS = {
  root:        "#7c3aed", // violet — "You are here"
  stage:       "#2563eb", // blue — major academic stage
  semester:    "#059669", // emerald — semester nodes
  selection:   "#0891b2", // cyan — user must choose (board/stream/course)
  checkpoint:  "#f59e0b", // gold — checkpoint summary nodes
  cert:        "#f59e0b", // amber — certifications
  internship:  "#6366f1", // indigo — internship clusters
  goal:        "#f7d06b", // gold — career goal / terminal node
  alternate:   "#f4a38f", // salmon — alternate paths
  skill:       "#c084fc", // purple — skills to build
  quarterly:   "#0891b2", // cyan — quarterly blocks (Working Professional)
  "choice-option": "#0891b2", // cyan choice option
  "choice-option-selected": "#10b981", // green selected choice option
};

// ─────────────────────────────────────────────────────────
// Node factory
// ─────────────────────────────────────────────────────────
let _id = 0;
function resetIdCounter() { _id = 0; }

function snode(id, label, type, opts = {}) {
  return {
    id,
    label,
    type,
    state: opts.state || "locked",
    depth: opts.depth || 0,
    parentId: opts.parentId || null,
    isSelectionPoint: opts.isSelectionPoint || false,
    isCheckpoint: opts.isCheckpoint || false,
    isCurrentStage: opts.isCurrentStage || false,
    isFinalGoal: opts.isFinalGoal || false,
    color: opts.color || SCAFFOLD_COLORS[type] || "#6b7280",
    stageGoals: [],        // filled in lazily by node-content API
    goals: [],             // filled in lazily
    skills: [],            // filled in lazily
    summary: "",           // filled in lazily
    goal_reasons: {},      // filled in lazily
    contentLoaded: false,
    contentLoading: false,
    children: [],
    timeframe: opts.timeframe || null,
    // Custom option fields
    selectionValue: opts.selectionValue || null,
    selectionParentId: opts.selectionParentId || null,
    selectionTier: opts.selectionTier || null,
    selectionProgression: opts.selectionProgression || null,
  };
}

// ─────────────────────────────────────────────────────────
// Career Goal terminal node (shared across all paths)
// ─────────────────────────────────────────────────────────
function makeCareerGoalNode(profile, parentId) {
  const goalLabel = profile.goal?.description || "Career Goal";
  return snode("node-career-goal", goalLabel, "goal", {
    state: "locked",
    depth: 99,
    parentId,
    isFinalGoal: true,
    color: SCAFFOLD_COLORS.goal,
  });
}

// ─────────────────────────────────────────────────────────
// Post-college branch: Junior Role → Mid-Level → Senior → Career Goal
// ─────────────────────────────────────────────────────────
function buildCareerProgressionChain(profile, parentId, startDepth, idPrefix = "") {
  const goalLabel = profile.goal?.description || "Career Goal";
  const juniorId = idPrefix ? `${idPrefix}-junior-role` : "node-junior-role";
  const midId = idPrefix ? `${idPrefix}-mid-level` : "node-mid-level";
  const seniorId = idPrefix ? `${idPrefix}-senior-role` : "node-senior-role";
  const goalId = idPrefix ? `${idPrefix}-career-goal` : "node-career-goal";

  const juniorNode = snode(juniorId, "Junior Role", "stage", {
    state: "locked", depth: startDepth, parentId,
  });
  const midNode = snode(midId, "Mid-Level Role", "stage", {
    state: "locked", depth: startDepth + 1, parentId: juniorId,
  });
  const seniorNode = snode(seniorId, "Senior Role", "stage", {
    state: "locked", depth: startDepth + 2, parentId: midId,
  });
  const goalNode = snode(goalId, goalLabel, "goal", {
    state: "locked", depth: startDepth + 3, parentId: seniorId,
    isFinalGoal: true, color: SCAFFOLD_COLORS.goal,
  });
  seniorNode.children = [goalNode];
  midNode.children = [seniorNode];
  juniorNode.children = [midNode];
  return juniorNode;
}

// ─────────────────────────────────────────────────────────
// Post-graduation selection: Junior Role vs Masters
// ─────────────────────────────────────────────────────────
function buildPostGradSelection(profile, parentId, depth, selections) {
  const selNode = snode("node-postgrad-select", "What's next?", "selection", {
    state: "locked", depth, parentId,
    isSelectionPoint: true,
    color: SCAFFOLD_COLORS.selection,
  });

  const juniorBranch = buildCareerProgressionChain(profile, selNode.id, depth + 1, "workforce");
  juniorBranch.label = "→ Enter Workforce";
  juniorBranch.id = "workforce-junior-branch";

  const mastersBranch = snode("node-masters-select", "→ Masters Degree", "selection", {
    state: "locked", depth: depth + 1, parentId: selNode.id,
    isSelectionPoint: true,
    color: SCAFFOLD_COLORS.selection,
  });
  // Masters → PG Year 1 → PG Year 2 → then career progression
  const pgY1 = snode("node-pg-yr1", "PG Year 1", "semester", {
    state: "locked", depth: depth + 2, parentId: mastersBranch.id,
  });
  const pgY2 = snode("node-pg-yr2", "PG Year 2", "semester", {
    state: "locked", depth: depth + 3, parentId: pgY1.id,
  });
  const pgCheckpoint = snode("node-pg-checkpoint", "PG Checkpoint", "checkpoint", {
    state: "locked", depth: depth + 4, parentId: pgY2.id,
    isCheckpoint: true, color: SCAFFOLD_COLORS.checkpoint,
  });
  const pgCareer = buildCareerProgressionChain(profile, pgCheckpoint.id, depth + 5, "pg");
  pgCheckpoint.children = [pgCareer];
  pgY2.children = [pgCheckpoint];
  pgY1.children = [pgY2];
  
  attachSelectionChildren(mastersBranch, [pgY1], profile, selections);

  const postgradChoice = (selections || {})["node-postgrad-select"];
  if (postgradChoice === "→ Enter Workforce") {
    const choiceNode = snode("node-postgrad-select-choice", "→ Enter Workforce", "choice-option-selected", {
      state: "completed", depth: depth + 0.5, parentId: selNode.id, color: "#10b981",
    });
    choiceNode.selectionValue = "→ Enter Workforce";
    choiceNode.selectionParentId = selNode.id;
    choiceNode.children = [juniorBranch];
    juniorBranch.parentId = choiceNode.id;
    selNode.children = [choiceNode];
  } else if (postgradChoice === "→ Masters Degree") {
    const choiceNode = snode("node-postgrad-select-choice", "→ Masters Degree", "choice-option-selected", {
      state: "completed", depth: depth + 0.5, parentId: selNode.id, color: "#10b981",
    });
    choiceNode.selectionValue = "→ Masters Degree";
    choiceNode.selectionParentId = selNode.id;
    choiceNode.children = [mastersBranch];
    mastersBranch.parentId = choiceNode.id;
    selNode.children = [choiceNode];
  } else {
    const optWorkforce = snode("node-postgrad-select-opt-workforce", "→ Enter Workforce", "choice-option", {
      state: "unlocked", depth: depth + 0.5, parentId: selNode.id, color: "#0891b2",
    });
    optWorkforce.selectionValue = "→ Enter Workforce";
    optWorkforce.selectionParentId = selNode.id;
    optWorkforce.selectionProgression = "SENIOR"; // Default workforce track option

    const optMasters = snode("node-postgrad-select-opt-masters", "→ Masters Degree", "choice-option", {
      state: "unlocked", depth: depth + 0.5, parentId: selNode.id, color: "#0891b2",
    });
    optMasters.selectionValue = "→ Masters Degree";
    optMasters.selectionParentId = selNode.id;

    selNode.children = [optWorkforce, optMasters];
  }

  return selNode;
}

// ─────────────────────────────────────────────────────────
// UG Semesters (1–8 or subset based on starting point)
// ─────────────────────────────────────────────────────────
function buildUGSemesters(profile, parentId, startSem, totalSems, startDepth, selections) {
  const SEM_LABELS = {
    1: "Sem 1: Campus & Academic Adaptation",
    2: "Sem 2: Foundations & First Skills",
    3: "Sem 3: Core Fields & Tool Mastery",
    4: "Sem 4: Projects & Internship Search",
    5: "Sem 5: Advanced Electives & Research",
    6: "Sem 6: Placement Preparation",
    7: "Sem 7: Campus Placement Drives",
    8: "Sem 8: Graduation & Onboarding",
  };

  const semNodes = [];
  for (let s = startSem; s <= Math.min(startSem + totalSems - 1, 8); s++) {
    const semNode = snode(
      `node-sem-${s}`,
      SEM_LABELS[s] || `Semester ${s}`,
      "semester",
      {
        state: s === startSem ? "unlocked" : "locked",
        depth: startDepth + (s - startSem),
        parentId: s === startSem ? parentId : `node-sem-${s - 1}`,
        isCurrentStage: s === startSem,
      }
    );

    // Year-end checkpoints at semesters 2, 4, 6, 8
    if ([2, 4, 6, 8].includes(s)) {
      const year = s / 2;
      const cpNode = snode(
        `node-ug-checkpoint-yr${year}`,
        `Year ${year} Checkpoint`,
        "checkpoint",
        {
          state: "locked",
          depth: startDepth + (s - startSem) + 0.5,
          parentId: semNode.id,
          isCheckpoint: true,
          color: SCAFFOLD_COLORS.checkpoint,
        }
      );
      semNode.children.push(cpNode);
    }

    semNodes.push(semNode);
  }

  // Chain semesters
  for (let i = 0; i < semNodes.length - 1; i++) {
    const cpChild = semNodes[i].children.find(c => c.isCheckpoint);
    if (cpChild) {
      cpChild.children.push(semNodes[i + 1]);
    } else {
      semNodes[i].children.push(semNodes[i + 1]);
    }
  }

  // Attach post-grad selection after last semester
  const lastSem = semNodes[semNodes.length - 1];
  const lastDepth = startDepth + semNodes.length;
  const postGradNode = buildPostGradSelection(profile, lastSem.id, lastDepth, selections);
  const lastCpChild = lastSem.children.find(c => c.isCheckpoint);
  if (lastCpChild) {
    lastCpChild.children.push(postGradNode);
  } else {
    lastSem.children.push(postGradNode);
  }

  return semNodes[0]; // return root of the semester chain
}

// ─────────────────────────────────────────────────────────
// Working Professional — Quarterly blocks
// ─────────────────────────────────────────────────────────
function buildWorkingPath(profile, parentId, startDepth) {
  const QUARTERS = [
    "Q1: Skill Assessment & Quick Wins",
    "Q2: Core Upskilling & Certification",
    "Q3: Portfolio & Networking",
    "Q4: Application & Promotion Push",
    "Year 2 — Q1: Advanced Specialization",
    "Year 2 — Q2: Leadership & Visibility",
  ];

  const quarterNodes = QUARTERS.map((label, i) =>
    snode(`node-work-q${i + 1}`, label, "quarterly", {
      state: i === 0 ? "unlocked" : "locked",
      depth: startDepth + i,
      parentId: i === 0 ? parentId : `node-work-q${i}`,
      isCurrentStage: i === 0,
    })
  );

  // 6-month checkpoint after Q2
  const cp1 = snode("node-work-cp1", "6-Month Checkpoint", "checkpoint", {
    state: "locked", depth: startDepth + 2.5, parentId: "node-work-q2",
    isCheckpoint: true, color: SCAFFOLD_COLORS.checkpoint,
  });
  // 12-month checkpoint after Q4
  const cp2 = snode("node-work-cp2", "12-Month Checkpoint", "checkpoint", {
    state: "locked", depth: startDepth + 4.5, parentId: "node-work-q4",
    isCheckpoint: true, color: SCAFFOLD_COLORS.checkpoint,
  });

  // Chain quarters
  for (let i = 0; i < quarterNodes.length - 1; i++) {
    quarterNodes[i].children.push(quarterNodes[i + 1]);
    if (i === 1) quarterNodes[i].children.push(cp1);
    if (i === 3) quarterNodes[i].children.push(cp2);
  }

  // Career progression after Year 2 Q2
  const careerProg = buildCareerProgressionChain(profile, quarterNodes[5].id, startDepth + QUARTERS.length, "working");
  quarterNodes[5].children.push(careerProg);

  return quarterNodes[0];
}

// ─────────────────────────────────────────────────────────
// School path: Board selection → Stream → 11th → 12th → UG select
// ─────────────────────────────────────────────────────────
function buildSchoolToCollegePath(profile, parentId, startDepth, startGrade, selections) {
  const gradeNodes = [];

  // Add grade nodes from startGrade to 12
  for (let g = startGrade; g <= 12; g++) {
    const isStart = g === startGrade;
    const gradeNode = snode(
      `node-grade-${g}`,
      g <= 10 ? `Grade ${g}` : `Grade ${g} (${g === 11 ? "Stream Stream" : "Final Boards"})`,
      "stage",
      {
        state: isStart ? "unlocked" : "locked",
        depth: startDepth + (g - startGrade),
        parentId: isStart ? parentId : `node-grade-${g - 1}`,
        isCurrentStage: isStart,
      }
    );

    // Grade 10 checkpoint → board selection
    if (g === 10) {
      const cp10 = snode("node-checkpoint-gr10", "Grade 10 Checkpoint", "checkpoint", {
        state: "locked", depth: startDepth + (g - startGrade) + 0.5,
        parentId: gradeNode.id, isCheckpoint: true, color: SCAFFOLD_COLORS.checkpoint,
      });
      const boardSel = snode("node-board-select", "Choose Your Board", "selection", {
        state: "locked", depth: startDepth + (g - startGrade) + 1,
        parentId: cp10.id, isSelectionPoint: true, color: SCAFFOLD_COLORS.selection,
      });
      cp10.children = [boardSel];
      gradeNode.children = [cp10];
    }

    // Grade 12 checkpoint → UG course selection
    if (g === 12) {
      const cp12 = snode("node-checkpoint-gr12", "Grade 12 Checkpoint", "checkpoint", {
        state: "locked", depth: startDepth + (g - startGrade) + 0.5,
        parentId: gradeNode.id, isCheckpoint: true, color: SCAFFOLD_COLORS.checkpoint,
      });
      const ugSel = snode("node-ug-select", "Choose Your UG Degree", "selection", {
        state: "locked", depth: startDepth + (g - startGrade) + 1,
        parentId: cp12.id, isSelectionPoint: true, color: SCAFFOLD_COLORS.selection,
      });
      // UG semesters start after degree selection
      const ugSems = buildUGSemesters(profile, ugSel.id, 1, 8, startDepth + (g - startGrade) + 2, selections);
      attachSelectionChildren(ugSel, [ugSems], profile, selections);
      cp12.children = [ugSel];
      gradeNode.children = [cp12];
    }

    gradeNodes.push(gradeNode);
  }

  // Chain grade nodes (for grades without special handling)
  for (let i = 0; i < gradeNodes.length - 1; i++) {
    const g = startGrade + i;
    if (g !== 10 && g !== 12) {
      gradeNodes[i].children.push(gradeNodes[i + 1]);
    } else if (g === 10 && gradeNodes[i].children.length > 0) {
      // Chain through the board selection
      const cp10 = gradeNodes[i].children[0];
      const boardSel = cp10.children[0];
      attachSelectionChildren(boardSel, [gradeNodes[i + 1]], profile, selections);
    }
  }

  return gradeNodes[0];
}

// ─────────────────────────────────────────────────────────
// MAIN EXPORT: buildMindmapScaffold
// ─────────────────────────────────────────────────────────

/**
 * Builds the full placeholder scaffold based on profile.stage.
 * Returns the root node of the tree (nested children structure).
 *
 * Node states:
 *   - "unlocked"    = current stage (user's NOW), content loadable
 *   - "locked"      = future stage, cannot interact
 *   - "in_progress" = goals partially checked
 *   - "completed"   = all goals checked
 */
export function buildMindmapScaffold(profile, nodeStates = {}, userSelections = {}) {
  resetIdCounter();

  let selections = userSelections;
  if (!selections || Object.keys(selections).length === 0) {
    try {
      const raw = localStorage.getItem("career-gps:user-selections");
      selections = raw ? JSON.parse(raw) : {};
    } catch (e) { selections = {}; }
  }

  const stage = profile?.stage || "UNDERGRADUATE";
  const goalLabel = profile?.goal?.description || "Career Goal";

  // Root "You are here" node
  const root = snode("node-root", "You Are Here", "root", {
    state: "unlocked",
    depth: 0,
    parentId: null,
    isCurrentStage: true,
    color: SCAFFOLD_COLORS.root,
  });

  let firstChild = null;

  switch (stage) {
    case "CLASS_7_8": {
      // Start at Grade 7/8, traverse all the way to career
      const grade78 = snode("node-grade-7-8", "Grade 7 / 8 (NOW)", "stage", {
        state: "unlocked", depth: 1, parentId: root.id, isCurrentStage: true,
      });
      const schoolPath = buildSchoolToCollegePath(profile, grade78.id, 2, 9, selections);
      grade78.children = [schoolPath];
      firstChild = grade78;
      break;
    }

    case "CLASS_9_10": {
      const grade9 = snode("node-grade-9", "Grade 9 (NOW)", "stage", {
        state: "unlocked", depth: 1, parentId: root.id, isCurrentStage: true,
      });
      const schoolPath = buildSchoolToCollegePath(profile, grade9.id, 2, 10, selections);
      grade9.children = [schoolPath];
      firstChild = grade9;
      break;
    }

    case "CLASS_11_12": {
      // Start at Grade 11 — board already selected
      const grade11 = snode("node-grade-11", "Grade 11 (NOW)", "stage", {
        state: "unlocked", depth: 1, parentId: root.id, isCurrentStage: true,
      });
      const grade12 = snode("node-grade-12", "Grade 12 (Final Boards)", "stage", {
        state: "locked", depth: 2, parentId: grade11.id,
      });
      const cp12 = snode("node-checkpoint-gr12", "Grade 12 Checkpoint", "checkpoint", {
        state: "locked", depth: 2.5, parentId: grade12.id,
        isCheckpoint: true, color: SCAFFOLD_COLORS.checkpoint,
      });
      const ugSel = snode("node-ug-select", "Choose Your UG Degree", "selection", {
        state: "locked", depth: 3, parentId: cp12.id,
        isSelectionPoint: true, color: SCAFFOLD_COLORS.selection,
      });
      const ugSems = buildUGSemesters(profile, ugSel.id, 1, 8, 4, selections);
      attachSelectionChildren(ugSel, [ugSems], profile, selections);
      cp12.children = [ugSel];
      grade12.children = [cp12];
      grade11.children = [grade12];
      firstChild = grade11;
      break;
    }

    case "UNDERGRADUATE": {
      // Determine starting semester from profile if available
      const startSem = 1; // default; could use profile.startStage
      const ugNode = snode(`node-sem-${startSem}`, `Semester ${startSem} (NOW)`, "semester", {
        state: "unlocked", depth: 1, parentId: root.id, isCurrentStage: true,
      });
      const remainingSems = buildUGSemesters(profile, root.id, startSem, 8 - startSem + 1, 1, selections);
      firstChild = remainingSems;
      break;
    }

    case "POSTGRADUATE": {
      const pgY1 = snode("node-pg-yr1", "PG Year 1 (NOW)", "semester", {
        state: "unlocked", depth: 1, parentId: root.id, isCurrentStage: true,
      });
      const pgY2 = snode("node-pg-yr2", "PG Year 2", "semester", {
        state: "locked", depth: 2, parentId: pgY1.id,
      });
      const pgCp = snode("node-pg-checkpoint", "PG Checkpoint", "checkpoint", {
        state: "locked", depth: 2.5, parentId: pgY2.id,
        isCheckpoint: true, color: SCAFFOLD_COLORS.checkpoint,
      });
      const careerProg = buildCareerProgressionChain(profile, pgCp.id, 3, "pg");
      pgCp.children = [careerProg];
      pgY2.children = [pgCp];
      pgY1.children = [pgY2];
      firstChild = pgY1;
      break;
    }

    case "WORKING": {
      firstChild = buildWorkingPath(profile, root.id, 1);
      break;
    }

    default: {
      // Fallback: UG path
      firstChild = buildUGSemesters(profile, root.id, 1, 8, 1, selections);
      break;
    }
  }

  if (firstChild) {
    root.children = [firstChild];
  }

  // Apply persisted node states on top of scaffold defaults
  applyNodeStates(root, nodeStates);

  return root;
}

// ─────────────────────────────────────────────────────────
// Apply persisted states (locked/unlocked/completed) to scaffold
// ─────────────────────────────────────────────────────────
function applyNodeStates(node, stateMap = {}) {
  if (!node) return;
  const currentMap = stateMap || {};
  if (currentMap[node.id]) {
    node.state = currentMap[node.id];
  }
  if (node.children) {
    for (const child of node.children) {
      if (child) {
        applyNodeStates(child, currentMap);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────
// Flat list of all nodes in the scaffold (for state management)
// ─────────────────────────────────────────────────────────
export function flattenScaffold(root) {
  const result = [];
  function walk(node) {
    if (!node) return;
    result.push(node);
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }
  walk(root);
  return result;
}

/**
 * Finds a node by ID in the scaffold tree
 */
export function findNodeById(root, targetId) {
  if (!root) return null;
  if (root.id === targetId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Calculates progress percentage based on completed goals
 * relative to all unlocked nodes' goals.
 * Returns: { percent: number, completedCount: number, totalCount: number }
 */
export function calculateProgress(root, nodeCache = {}, nodeStates = {}, completedGoalsSet = new Set()) {
  let totalGoals = 0;
  let completedGoals = 0;

  const currentCache = nodeCache || {};
  const currentStates = nodeStates || {};

  function walk(node) {
    if (!node) return;
    const state = currentStates[node.id] || node.state;
    // Only count unlocked, in_progress, or completed nodes
    if (state === "locked") return;

    const content = currentCache[node.id];
    if (content && content.goals) {
      totalGoals += content.goals.length;
      if (state === "completed") {
        completedGoals += content.goals.length;
      } else if (state === "in_progress") {
        const doneCount = content.goals.filter(g => completedGoalsSet.has(g)).length;
        completedGoals += doneCount;
      }
    }

    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);

  return {
    percent: totalGoals > 0 ? Math.min(99, Math.round((completedGoals / totalGoals) * 100)) : 0,
    completedCount: completedGoals,
    totalCount: totalGoals,
  };
}

export function getSelectionOptions(nodeId, profile) {
  const fieldType = profile?.field?.type || "TECH";
  
  if (nodeId === "node-board-select") {
    if (fieldType === "TECH") {
      return [
        { value: "CBSE - Science (MPC)", label: "CBSE - Science (MPC)", board: "CBSE", stream: "Science (MPC)", desc: "CBSE board with Maths, Physics, Chemistry." },
        { value: "State Board (Inter) - MEC", label: "State Board - MEC", board: "State Board (Inter)", stream: "MEC", desc: "State Board with Maths, Economics, Commerce." },
        { value: "CBSE - Science (MPC + CS)", label: "CBSE - Science (MPC + CS)", board: "CBSE", stream: "Science (MPC + CS)", desc: "CBSE board with MPC and Computer Science." },
        { value: "Polytechnic Diploma", label: "Polytechnic Diploma", board: "Polytechnic Diploma", stream: "", desc: "Technical diploma track." }
      ];
    } else if (fieldType === "MEDICINE") {
      return [
        { value: "CBSE - Science (BiPC)", label: "CBSE - Science (BiPC)", board: "CBSE", stream: "Science (BiPC)", desc: "CBSE board with Biology, Physics, Chemistry." },
        { value: "State Board (Inter) - Science (PCMB)", label: "State Board - Science (PCMB)", board: "State Board (Inter)", stream: "Science (PCMB)", desc: "State Board with PCMB." },
        { value: "CBSE - Science (PCB + Biotech)", label: "CBSE - Science (PCB + Biotech)", board: "CBSE", stream: "Science (PCB + Biotech)", desc: "CBSE board with Biology and Biotechnology." },
        { value: "Polytechnic Diploma", label: "Polytechnic Diploma", board: "Polytechnic Diploma", stream: "", desc: "Technical diploma track." }
      ];
    } else if (fieldType === "COMMERCE") {
      return [
        { value: "CBSE - MEC", label: "CBSE - MEC", board: "CBSE", stream: "MEC", desc: "CBSE board with Maths, Economics, Commerce." },
        { value: "State Board (Inter) - CEC", label: "State Board - CEC", board: "State Board (Inter)", stream: "CEC", desc: "State Board with Civics, Economics, Commerce." },
        { value: "CBSE - Commerce (with CS/IP)", label: "CBSE - Commerce (with CS/IP)", board: "CBSE", stream: "Commerce (with CS/IP)", desc: "CBSE board with Commerce and Computer Science/IP." },
        { value: "Polytechnic Diploma", label: "Polytechnic Diploma", board: "Polytechnic Diploma", stream: "", desc: "Technical diploma track." }
      ];
    } else if (fieldType === "LAW") {
      return [
        { value: "CBSE - Arts/Humanities (HEC)", label: "CBSE - Arts/Humanities (HEC)", board: "CBSE", stream: "Arts/Humanities (HEC)", desc: "CBSE board with History, Economics, Civics." },
        { value: "State Board (Inter) - MEC", label: "State Board - MEC", board: "State Board (Inter)", stream: "MEC", desc: "State Board with MEC." },
        { value: "CBSE - Science (PCM)", label: "CBSE - Science (PCM)", board: "CBSE", stream: "Science (PCM)", desc: "CBSE board with Physics, Chemistry, Maths." },
        { value: "Polytechnic Diploma", label: "Polytechnic Diploma", board: "Polytechnic Diploma", stream: "", desc: "Technical diploma track." }
      ];
    } else {
      return [
        { value: "CBSE - Science (PCM)", label: "CBSE - Science (PCM)", board: "CBSE", stream: "Science (PCM)", desc: "CBSE board with PCM." },
        { value: "State Board (Inter) - Commerce (with Math)", label: "State Board - Commerce (with Math)", board: "State Board (Inter)", stream: "Commerce (with Math)", desc: "State Board with Commerce & Math." },
        { value: "CBSE - Arts/Humanities (with Math)", label: "CBSE - Arts/Humanities (with Math)", board: "CBSE", stream: "Arts/Humanities (with Math)", desc: "CBSE board with Arts/Humanities and Math." },
        { value: "Polytechnic Diploma", label: "Polytechnic Diploma", board: "Polytechnic Diploma", stream: "", desc: "Technical diploma track." }
      ];
    }
  }

  if (nodeId === "node-ug-select") {
    if (fieldType === "TECH") {
      return [
        { value: "Tier 1 - B.Tech / B.E. (Computer Science/IT)", label: "Tier 1: B.Tech (CSE/IT)", desc: "Top tier engineering college." },
        { value: "Tier 2 - BCA / B.Sc (Computer Science)", label: "Tier 2: BCA / B.Sc (CS)", desc: "Reputable applied computing track." },
        { value: "Tier 3 - B.Tech / B.E. (Electronics / Allied)", label: "Tier 3: B.Tech (ECE/Allied)", desc: "Local college hardware-software track." }
      ];
    } else if (fieldType === "MEDICINE") {
      return [
        { value: "Tier 1 - MBBS / BDS (Medicine)", label: "Tier 1: MBBS / BDS", desc: "Top tier medical college." },
        { value: "Tier 2 - B.Sc (Sciences/Biotech)", label: "Tier 2: B.Sc (Biotech)", desc: "Reputable biotech/science track." },
        { value: "Tier 3 - B.Tech (Bioinformatics / Biomedical)", label: "Tier 3: B.Tech (Bio-tech/Biomed)", desc: "Local college biomedical track." }
      ];
    } else if (fieldType === "COMMERCE") {
      return [
        { value: "Tier 1 - B.Com / BBA (Business/Finance)", label: "Tier 1: B.Com / BBA", desc: "Top business school." },
        { value: "Tier 2 - B.Com (Honors / Corporate Finance)", label: "Tier 2: B.Com (Honors)", desc: "Reputable commerce track." },
        { value: "Tier 3 - B.Sc (Economics / Statistics)", label: "Tier 3: B.Sc (Econ/Stats)", desc: "Local college economics track." }
      ];
    } else if (fieldType === "LAW") {
      return [
        { value: "Tier 1 - BA LLB (Integrated Law)", label: "Tier 1: BA LLB", desc: "Top national law university." },
        { value: "Tier 2 - BBA LLB (Business Law)", label: "Tier 2: BBA LLB", desc: "Reputable business law track." },
        { value: "Tier 3 - B.Com LLB (Finance Law)", label: "Tier 3: B.Com LLB", desc: "Local finance law track." }
      ];
    } else {
      return [
        { value: "Tier 1 - B.Des (Design / UX/UI)", label: "Tier 1: B.Des (UX/UI)", desc: "Top design institute." },
        { value: "Tier 2 - BA (Fine Arts / Content Strategy)", label: "Tier 2: BA (Fine Arts)", desc: "Reputable creative track." },
        { value: "Tier 3 - B.Sc (Multimedia / Game Design)", label: "Tier 3: B.Sc (Game Design)", desc: "Local multimedia track." }
      ];
    }
  }

  if (nodeId === "node-masters-select") {
    if (fieldType === "TECH") {
      return [
        { value: "M.Tech / MS (Computer Science/IT)", label: "M.Tech / MS (CSE/IT)", desc: "Advanced software engineering, algorithms, AI/ML specialization.", selectionTier: "Tier 1" },
        { value: "MCA (Computer Applications)", label: "MCA (Computer Applications)", desc: "Advanced application design, database administration, and web systems.", selectionTier: "Tier 2" },
        { value: "MBA (Technology Management)", label: "MBA (Technology Management)", desc: "Leadership in technology, product management, and systems engineering.", selectionTier: "Tier 1" }
      ];
    } else if (fieldType === "MEDICINE") {
      return [
        { value: "MD / MS (Clinical Specialization)", label: "MD / MS (Clinical Specialty)", desc: "Advanced clinical practice, surgical methods, hospital residency.", selectionTier: "Tier 1" },
        { value: "M.Sc (Sciences)", label: "M.Sc (Sciences)", desc: "Advanced scientific research, biotechnology lab specialties.", selectionTier: "Tier 2" },
        { value: "M.Pharma / MBA (Healthcare)", label: "M.Pharma / MBA (Healthcare)", desc: "Pharmaceutical administration, clinical trials management, healthcare admin.", selectionTier: "Tier 1" }
      ];
    } else if (fieldType === "COMMERCE") {
      return [
        { value: "MBA (Management/Finance)", label: "MBA (Management/Finance)", desc: "Corporate strategy, financial modeling, organizational leadership.", selectionTier: "Tier 1" },
        { value: "M.Com (Advanced Accounting)", label: "M.Com (Advanced Accounting)", desc: "Corporate taxation, auditing theory, and corporate regulations.", selectionTier: "Tier 2" },
        { value: "M.Sc (Financial Engineering)", label: "M.Sc (Financial Engineering)", desc: "Quantitative finance, risk management, and algorithmic trading.", selectionTier: "Tier 1" }
      ];
    } else if (fieldType === "LAW") {
      return [
        { value: "LLM (Corporate & IP Law)", label: "LLM (Corporate & IP Law)", desc: "Intellectual property law, legal litigation, media, creative communications.", selectionTier: "Tier 1" },
        { value: "LLM (International Law & Policy)", label: "LLM (International Law & Policy)", desc: "Global regulations, treaty laws, and comparative constitutional law.", selectionTier: "Tier 2" },
        { value: "MBA (Legal Studies / Compliance)", label: "MBA (Legal Studies / Compliance)", desc: "Corporate compliance, business ethics, and governance.", selectionTier: "Tier 1" }
      ];
    } else {
      return [
        { value: "M.Des (Interaction / UX Design)", label: "M.Des (UX Design)", desc: "User experience research, system architecture, human-computer interaction.", selectionTier: "Tier 1" },
        { value: "MA (Creative Communications)", label: "MA (Creative Communications)", desc: "Content strategy, digital marketing, public relations.", selectionTier: "Tier 2" },
        { value: "M.Sc (Information Design / Data Viz)", label: "M.Sc (Info Design / Data Viz)", desc: "Visualizing complex data, dashboard design, info graphics.", selectionTier: "Tier 1" }
      ];
    }
  }

  if (nodeId === "node-postgrad-select") {
    return [
      { value: "→ Enter Workforce", label: "→ Enter Workforce", desc: "Secure junior placement.", selectionProgression: "SENIOR" },
      { value: "→ Masters Degree", label: "→ Masters Degree", desc: "Pursue higher specialization." }
    ];
  }

  return [];
}

export function getBoardSelectionParts(value, profile) {
  if (!value) return { board: "", stream: "" };
  const match = getSelectionOptions("node-board-select", profile).find(opt => opt.value === value);
  if (match) return { board: match.board || "", stream: match.stream || "" };
  if (value === "Polytechnic Diploma") return { board: "Polytechnic Diploma", stream: "" };
  const separatorIndex = value.indexOf(" - ");
  if (separatorIndex === -1) return { board: value, stream: "" };
  return {
    board: value.slice(0, separatorIndex),
    stream: value.slice(separatorIndex + 3),
  };
}

export function getBoardSelectionValue(board, stream, profile) {
  if (!board) return "";
  if (board === "Polytechnic Diploma") return board;
  const match = getSelectionOptions("node-board-select", profile).find(
    opt => opt.board === board && opt.stream === stream
  );
  return match?.value || (stream ? `${board} - ${stream}` : board);
}

export function getTieredSelectionParts(value) {
  if (!value) return { tier: "", course: "" };
  const match = value.match(/^(Tier\s+\d)\s+-\s+(.+)$/);
  if (!match) return { tier: "", course: value };
  return { tier: match[1], course: match[2] };
}

export function attachSelectionChildren(selNode, nextChildren, profile, selections) {
  const selection = (selections || {})[selNode.id];
  
  if (selection) {
    const choiceNode = snode(`${selNode.id}-choice`, selection, "choice-option-selected", {
      state: "completed",
      depth: selNode.depth + 0.5,
      parentId: selNode.id,
      color: "#10b981", // green for selected
      timeframe: "Selected ✓",
    });
    
    choiceNode.selectionValue = selection;
    choiceNode.selectionParentId = selNode.id;
    
    const validChildren = (nextChildren || []).filter(Boolean);
    choiceNode.children = validChildren;
    for (const child of validChildren) {
      child.parentId = choiceNode.id;
      child.depth = choiceNode.depth + 0.5;
    }
    
    selNode.children = [choiceNode];
  } else {
    const options = getSelectionOptions(selNode.id, profile);
    const optionNodes = options.map((opt, index) => {
      const optNode = snode(`${selNode.id}-opt-${index}`, opt.label, "choice-option", {
        state: "unlocked",
        depth: selNode.depth + 0.5,
        parentId: selNode.id,
        color: "#0891b2", // cyan choice
        timeframe: "Click to Choose",
      });
      optNode.selectionValue = opt.value;
      optNode.selectionParentId = selNode.id;
      optNode.selectionTier = opt.selectionTier || null;
      optNode.selectionProgression = opt.selectionProgression || null;
      return optNode;
    });
    
    selNode.children = optionNodes;
  }
}
